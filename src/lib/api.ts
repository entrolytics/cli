import { getAuthToken } from './auth.js';
import { getApiHost } from './config.js';
import type { ApiResponse, ApiStats, ApiUser, Link, Organization, Stats, TopResult, User, Website } from './types.js';

/**
 * Helper to calculate percent change between current and comparison values
 */
function calcChange(current: number, comparison: number): number {
  if (comparison === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - comparison) / comparison) * 100);
}

/**
 * Paginated response from API
 */
interface PageResult<T> {
  data: T;
  count: number;
  page: number;
  pageSize: number;
  orderBy?: string;
  search?: string;
}

class EntrolyticsApi {
  private getHeaders(): HeadersInit {
    const token = getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${getApiHost()}/api${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          error: data?.message || data?.error?.message || `Request failed with status ${response.status}`,
          status: response.status,
        };
      }

      return { data, status: response.status };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 0,
      };
    }
  }

  /**
   * Request that returns paginated results - extracts the data array
   */
  private async requestPaginated<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T[]>> {
    const result = await this.request<PageResult<T[]> | T[]>(endpoint, options);

    if (result.error) {
      return { error: result.error, status: result.status };
    }

    // Handle both paginated and non-paginated responses
    const data = result.data;
    if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as PageResult<T[]>).data)) {
      return { data: (data as PageResult<T[]>).data, status: result.status };
    }

    // Already an array
    return { data: data as T[], status: result.status };
  }

  // Auth
  async getUser(): Promise<ApiResponse<User>> {
    // The /api/me endpoint returns { user: {...}, clerkUserId, orgId }
    const result = await this.request<{ user: ApiUser }>('/me');
    if (result.error) {
      return { error: result.error, status: result.status };
    }
    // Extract user from response wrapper
    const userData = result.data?.user;
    if (userData) {
      // Map API field names to CLI field names
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
    return this.requestPaginated<Organization>('/me/orgs');
  }

  // Websites
  async getWebsites(): Promise<ApiResponse<Website[]>> {
    return this.requestPaginated<Website>('/websites');
  }

  async getWebsite(id: string): Promise<ApiResponse<Website>> {
    return this.request<Website>(`/websites/${id}`);
  }

  async createWebsite(domain: string, name?: string): Promise<ApiResponse<Website>> {
    return this.request<Website>('/websites', {
      method: 'POST',
      body: JSON.stringify({ domain, name: name || domain }),
    });
  }

  async deleteWebsite(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/websites/${id}`, { method: 'DELETE' });
  }

  // Stats
  async getStats(websiteId: string, startAt: number, endAt: number): Promise<ApiResponse<Stats>> {
    const params = new URLSearchParams({
      startAt: startAt.toString(),
      endAt: endAt.toString(),
    });
    const result = await this.request<ApiStats>(`/websites/${websiteId}/stats?${params}`);

    if (result.error) {
      return { error: result.error, status: result.status };
    }

    const raw = result.data;
    if (!raw) {
      return { data: undefined, status: result.status };
    }

    const comp = raw.comparison || { pageviews: 0, visitors: 0, visits: 0, bounces: 0, totaltime: 0 };

    // Transform flat API response into CLI Stats format
    return {
      data: {
        pageviews: { value: raw.pageviews || 0, change: calcChange(raw.pageviews || 0, comp.pageviews) },
        visitors: { value: raw.visitors || 0, change: calcChange(raw.visitors || 0, comp.visitors) },
        visits: { value: raw.visits || 0, change: calcChange(raw.visits || 0, comp.visits) },
        bounces: {
          value: raw.visits > 0 ? Math.round((raw.bounces / raw.visits) * 100) : 0,
          change: calcChange(
            raw.visits > 0 ? (raw.bounces / raw.visits) * 100 : 0,
            comp.visits > 0 ? (comp.bounces / comp.visits) * 100 : 0
          )
        },
        totalTime: { value: raw.totaltime || 0, change: calcChange(raw.totaltime || 0, comp.totaltime) },
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
    const params = new URLSearchParams({
      startAt: startAt.toString(),
      endAt: endAt.toString(),
      limit: limit.toString(),
      type: 'url',
    });
    return this.request<TopResult[]>(`/websites/${websiteId}/metrics?${params}`);
  }

  async getTopReferrers(
    websiteId: string,
    startAt: number,
    endAt: number,
    limit = 10,
  ): Promise<ApiResponse<TopResult[]>> {
    const params = new URLSearchParams({
      startAt: startAt.toString(),
      endAt: endAt.toString(),
      limit: limit.toString(),
      type: 'referrer',
    });
    return this.request<TopResult[]>(`/websites/${websiteId}/metrics?${params}`);
  }

  async getTopCountries(
    websiteId: string,
    startAt: number,
    endAt: number,
    limit = 10,
  ): Promise<ApiResponse<TopResult[]>> {
    const params = new URLSearchParams({
      startAt: startAt.toString(),
      endAt: endAt.toString(),
      limit: limit.toString(),
      type: 'country',
    });
    return this.request<TopResult[]>(`/websites/${websiteId}/metrics?${params}`);
  }

  async getRealtimeVisitors(websiteId: string): Promise<ApiResponse<{ count: number }>> {
    return this.request<{ count: number }>(`/websites/${websiteId}/active`);
  }

  // Links
  async getLinks(orgId?: string): Promise<ApiResponse<Link[]>> {
    const endpoint = orgId ? `/orgs/${orgId}/links` : '/links';
    return this.request<Link[]>(endpoint);
  }

  async createLink(
    url: string,
    name?: string,
    slug?: string,
    orgId?: string,
  ): Promise<ApiResponse<Link>> {
    return this.request<Link>('/links', {
      method: 'POST',
      body: JSON.stringify({
        url,
        name: name || new URL(url).hostname,
        slug: slug || undefined,
        orgId: orgId || undefined,
      }),
    });
  }

  async getLinkStats(linkId: string): Promise<ApiResponse<Stats>> {
    return this.request<Stats>(`/links/${linkId}/stats`);
  }

  async deleteLink(linkId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/links/${linkId}`, { method: 'DELETE' });
  }

  // Events
  async sendTestEvent(websiteId: string): Promise<ApiResponse<void>> {
    return this.request<void>('/send', {
      method: 'POST',
      body: JSON.stringify({
        type: 'event',
        payload: {
          website: websiteId,
          name: 'cli_test_event',
          data: { source: 'entro-cli', timestamp: Date.now() },
        },
      }),
    });
  }

  // CLI Token Management
  async listCliTokens(): Promise<ApiResponse<import('@entrolytics/shared').CliAccessTokenMetadata[]>> {
    return this.request<import('@entrolytics/shared').CliAccessTokenMetadata[]>('/auth/cli/tokens');
  }

  async revokeCliToken(jti: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/cli/tokens', {
      method: 'DELETE',
      body: JSON.stringify({ jti }),
    });
  }

  async revokeAllCliTokens(): Promise<ApiResponse<{ message: string; count: number }>> {
    return this.request<{ message: string; count: number }>('/auth/cli/tokens', {
      method: 'DELETE',
      body: JSON.stringify({ revokeAll: true }),
    });
  }

  // Routing
  async getWebsiteMode(websiteId: string): Promise<ApiResponse<import('./types.js').WebsiteModeConfig>> {
    return this.request<import('./types.js').WebsiteModeConfig>(`/websites/${websiteId}/mode`);
  }

  async setWebsiteMode(
    websiteId: string,
    mode: import('./types.js').IngestMode
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/websites/${websiteId}/mode`, {
      method: 'PUT',
      body: JSON.stringify({ ingestMode: mode }),
    });
  }

  async getRoutingHealth(): Promise<ApiResponse<import('./types.js').RoutingHealth>> {
    return this.request<import('./types.js').RoutingHealth>('/health/routing');
  }

  async getRoutingStats(
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<import('./types.js').RoutingStats>> {
    const params = new URLSearchParams();
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);
    const query = params.toString() ? `?${params}` : '';
    return this.request<import('./types.js').RoutingStats>(`/routing/stats${query}`);
  }
}

export const api = new EntrolyticsApi();
