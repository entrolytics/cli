import { getClient } from '@entrolytics/api-client';
import type { EntrolyticsClient, ApiClient } from '@entrolytics/api-client';
import { getAuthToken } from './auth.js';
import { getApiHost } from './config.js';
import type {
  ApiResponse,
  ApiStats,
  ApiUser,
  Link,
  Organization,
  Stats,
  TopResult,
  User,
  Website,
} from './types.js';

/**
 * Helper to calculate percent change between current and comparison values
 */
function calcChange(current: number, comparison: number): number {
  if (comparison === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - comparison) / comparison) * 100);
}

class EntrolyticsApi {
  private getClient(): EntrolyticsClient & { request: ApiClient['request'] } {
    const token = getAuthToken();
    const endpoint = `${getApiHost()}/api`;

    // We cast to access the underlying request method if needed for custom endpoints not in SDK
    // But ideally we use SDK methods.
    // The getClient retuns a composed object, not the ApiClient instance directly as 'this'.
    // However, for migration, we might need raw access.
    // Actually, getClient returns an object that HAS methods which close over the ApiClient instance.
    // It does NOT expose the apiClient instance.
    // But I can import ApiClient class directly if I want manual control.
    // Let's use ApiClient class directly to easier match the 'request' pattern if needed, 
    // OR just use getClient and map methods.
    // Using getClient is better for long term.

    return getClient({
      endpoint,
      bearerToken: token,
      // Pass the fetch implementation if needed, usually global fetch is fine
    }) as unknown as EntrolyticsClient & { request: ApiClient['request'] };
  }

  // Helper to convert SDK response to CLI response format
  private mapResponse<T>(sdkResponse: { ok: boolean; status: number; data?: any; error?: string }): ApiResponse<T> {
    if (!sdkResponse.ok) {
      return {
        error: sdkResponse.error || `Request failed with status ${sdkResponse.status}`,
        status: sdkResponse.status,
      };
    }
    return {
      data: sdkResponse.data as T,
      status: sdkResponse.status,
    };
  }

  // Auth
  async getUser(): Promise<ApiResponse<User>> {
    const client = this.getClient();
    // SDK has getMe() which returns { user: ... } usually
    const result = await client.getMe();

    if (!result.ok) return this.mapResponse(result);

    // SDK getMe returns what the API returns.
    // CLI expects: 
    // { user: ApiUser, clerkUserId: string, orgId: string } based on previous implementation?
    // Let's assume SDK types match API.

    const data = result.data as any; // Cast to avoid strict type checking for now
    const userData = data?.user;

    if (userData) {
      return {
        data: {
          id: userData.userId,
          email: userData.email,
          displayName: userData.displayName || userData.display_name || '',
          role: userData.role,
          createdAt: userData.createdAt || userData.created_at || '',
          firstName: userData.firstName || userData.first_name,
          lastName: userData.lastName || userData.last_name,
          imageUrl: userData.imageUrl || userData.image_url,
        },
        status: result.status,
      };
    }
    return { data: undefined, status: result.status };
  }

  // Organizations
  async getOrgs(): Promise<ApiResponse<Organization[]>> {
    const client = this.getClient();
    const result = await client.getMyOrgs();

    // SDK getMyOrgs returns { data: Organization[], ... } or Organization[]?
    // Check endpoints/me.ts or orgs.ts in SDK?
    // Previous CLI code expected Paginated response or array.
    // SDK usually handles unwrapping if designed well, but let's be safe.

    // Assuming SDK returns the data directly or we map it.
    // If result.data has 'data' property and it's an array, usage it.

    if (!result.ok) return this.mapResponse(result);

    const data = result.data as any;
    const orgs = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);

    return {
      data: orgs as Organization[],
      status: result.status,
    };
  }

  // Websites
  async getWebsites(): Promise<ApiResponse<Website[]>> {
    const client = this.getClient();
    const result = await client.getWebsites();
    if (!result.ok) return this.mapResponse(result);

    const data = result.data as any;
    const sites = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);

    return { data: sites as Website[], status: result.status };
  }

  async getWebsite(id: string): Promise<ApiResponse<Website>> {
    const client = this.getClient();
    const result = await client.getWebsite(id);
    return this.mapResponse<Website>(result);
  }

  async createWebsite(domain: string, name?: string): Promise<ApiResponse<Website>> {
    const client = this.getClient();
    const result = await client.createWebsite({ domain, name: name || domain });
    return this.mapResponse<Website>(result);
  }

  async deleteWebsite(id: string): Promise<ApiResponse<void>> {
    const client = this.getClient();
    const result = await client.deleteWebsite(id);
    return this.mapResponse<void>(result);
  }

  // Stats
  async getStats(websiteId: string, startAt: number, endAt: number): Promise<ApiResponse<Stats>> {
    const client = this.getClient();
    // SDK getWebsiteStats takes object { start, end } usually strings or numbers?
    // SDK signature: getWebsiteStats(websiteId, params: DateRangeParams)
    // DateRangeParams: { startAt: number, endAt: number }
    const result = await client.getWebsiteStats(websiteId, { startAt, endAt });

    if (!result.ok) return this.mapResponse(result);

    const raw = result.data as any; // Cast to ApiStats
    if (!raw) return { data: undefined, status: result.status };

    const comp = raw.comparison || {
      pageviews: 0,
      visitors: 0,
      visits: 0,
      bounces: 0,
      totaltime: 0,
    };

    return {
      data: {
        pageviews: {
          value: raw.pageviews || 0,
          change: calcChange(raw.pageviews || 0, comp.pageviews),
        },
        visitors: {
          value: raw.visitors || 0,
          change: calcChange(raw.visitors || 0, comp.visitors),
        },
        visits: { value: raw.visits || 0, change: calcChange(raw.visits || 0, comp.visits) },
        bounces: {
          value: raw.visits > 0 ? Math.round((raw.bounces / raw.visits) * 100) : 0,
          change: calcChange(
            raw.visits > 0 ? (raw.bounces / raw.visits) * 100 : 0,
            comp.visits > 0 ? (comp.bounces / comp.visits) * 100 : 0,
          ),
        },
        totalTime: {
          value: raw.totaltime || 0,
          change: calcChange(raw.totaltime || 0, comp.totaltime),
        },
      },
      status: result.status,
    };
  }

  async getTopPages(
    websiteId: string,
    startAt: number,
    endAt: number,
    limit = 10,
  ): Promise<ApiResponse<TopResult[]>> {
    const client = this.getClient();
    // SDK getWebsiteMetrics
    // params: { type: 'url', startAt, endAt, limit }
    const result = await client.getWebsiteMetrics(websiteId, {
      type: 'url',
      startAt,
      endAt,
      limit
    });
    // SDK returns MetricData[]: { x: string, y: number }
    return this.mapResponse<TopResult[]>(result);
  }

  async getTopReferrers(
    websiteId: string,
    startAt: number,
    endAt: number,
    limit = 10,
  ): Promise<ApiResponse<TopResult[]>> {
    const client = this.getClient();
    const result = await client.getWebsiteMetrics(websiteId, {
      type: 'referrer',
      startAt,
      endAt,
      limit
    });
    return this.mapResponse<TopResult[]>(result);
  }

  async getTopCountries(
    websiteId: string,
    startAt: number,
    endAt: number,
    limit = 10,
  ): Promise<ApiResponse<TopResult[]>> {
    const client = this.getClient();
    const result = await client.getWebsiteMetrics(websiteId, {
      type: 'country',
      startAt,
      endAt,
      limit
    });
    return this.mapResponse<TopResult[]>(result);
  }

  async getRealtimeVisitors(websiteId: string): Promise<ApiResponse<{ count: number }>> {
    const client = this.getClient();
    const result = await client.getRealtimeData(websiteId);

    if (!result.ok) return this.mapResponse(result);

    const data = result.data as any;
    // data might be { visitors: number }
    return {
      data: { count: data.visitors ?? data.count ?? 0 },
      status: result.status
    };
  }

  // Links
  async getLinks(orgId?: string): Promise<ApiResponse<Link[]>> {
    const client = this.getClient();
    let result;
    if (orgId) {
      result = await client.getOrgLinks(orgId);
    } else {
      result = await client.getLinks();
    }
    // SDK returns Link[] or PageResult
    if (!result.ok) return this.mapResponse(result);
    const data = result.data as any;
    const links = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
    return { data: links, status: result.status };
  }

  async createLink(
    url: string,
    name?: string,
    slug?: string,
    orgId?: string,
  ): Promise<ApiResponse<Link>> {
    const client = this.getClient();
    const result = await client.createLink({
      url,
      name: name || new URL(url).hostname,
      slug,
      orgId
    });
    return this.mapResponse<Link>(result);
  }

  async getLinkStats(linkId: string): Promise<ApiResponse<Stats>> {
    const client = this.getClient();
    // Use the newly added SDK method
    const result = await client.links.getLinkStats(linkId);
    return this.mapResponse<Stats>(result);
  }

  async deleteLink(linkId: string): Promise<ApiResponse<void>> {
    const client = this.getClient();
    const result = await client.deleteLink(linkId);
    return this.mapResponse<void>(result);
  }

  // Events - sendTestEvent
  async sendTestEvent(websiteId: string): Promise<ApiResponse<void>> {
    const client = this.getClient();
    // Use the newly added SDK method
    const result = await client.events.sendTestEvent(websiteId);
    return this.mapResponse<void>(result);
  }

  // CLI Token Management
  async listCliTokens(): Promise<ApiResponse<any[]>> {
    const client = this.getClient();
    const result = await client.auth.listCliTokens();
    
    // SDK returns CliAccessTokenMetadata[], CLI expects any[] (or CliAccessTokenMetadata[])
    return this.mapResponse<any[]>(result as any);
  }

  async revokeCliToken(jti: string): Promise<ApiResponse<{ message: string }>> {
    const client = this.getClient();
    const result = await client.auth.revokeCliToken(jti);
    return this.mapResponse<{ message: string }>(result);
  }

  async revokeAllCliTokens(): Promise<ApiResponse<{ message: string; count: number }>> {
    const client = this.getClient();
    const result = await client.auth.revokeAllCliTokens();
    return this.mapResponse<{ message: string; count: number }>(result);
  }

  // Routing
  async getWebsiteMode(websiteId: string): Promise<ApiResponse<import('./types.js').WebsiteModeConfig>> {
    const client = this.getClient();
    const result = await client.getWebsiteMode(websiteId);
    return this.mapResponse<import('./types.js').WebsiteModeConfig>(result as any);
  }

  async setWebsiteMode(
    websiteId: string,
    mode: import('./types.js').IngestMode,
  ): Promise<ApiResponse<{ message: string }>> {
    const client = this.getClient();
    const result = await client.setWebsiteMode(websiteId, mode as any);
    return this.mapResponse<{ message: string }>(result);
  }

  async getRoutingHealth(): Promise<ApiResponse<import('./types.js').RoutingHealth>> {
    const client = this.getClient();
    const result = await client.getRoutingHealth();
    return this.mapResponse<import('./types.js').RoutingHealth>(result as any);
  }

  async getRoutingStats(
    startDate?: string,
    endDate?: string,
  ): Promise<ApiResponse<import('./types.js').RoutingStats>> {
    const client = this.getClient();
    const result = await client.getRoutingStats({ start: startDate, end: endDate });
    return this.mapResponse<import('./types.js').RoutingStats>(result as any);
  }
}

export const api = new EntrolyticsApi();
