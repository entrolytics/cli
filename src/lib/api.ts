/**
 * CLI API Layer
 *
 * This module provides a clean wrapper around @entrolytics/trpc-client for CLI commands.
 * All methods use the tRPC client with proper type safety.
 */

import { randomUUID } from 'node:crypto';
import {
  type AppRouter,
  type CreateTRPCClient,
  createClient,
  type TRPCClientError,
} from '@entrolytics/trpc-client';
import { getAuthToken } from './auth.js';
import { getApiHost } from './config.js';
import type {
  ApiResponse,
  IngestMode,
  Link,
  LinkStats,
  Organization,
  RoutingHealth,
  RoutingStats,
  Stats,
  TopResult,
  User,
  Website,
  WebsiteModeConfig,
} from './types.js';

/**
 * Calculate percent change between current and comparison values
 */
function calcChange(current: number, comparison: number): number {
  if (comparison === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - comparison) / comparison) * 100);
}

/**
 * Handle tRPC errors and convert to CLI response format
 */
function handleTRPCError<T>(error: unknown): ApiResponse<T> {
  const trpcError = error as TRPCClientError<AppRouter>;
  if (trpcError.data?.code) {
    return {
      error: trpcError.message,
      status: trpcError.data?.httpStatus || 500,
    };
  }
  return {
    error: error instanceof Error ? error.message : 'Unknown error',
    status: 500,
  };
}

/**
 * Create authenticated tRPC client
 * Uses canonical AppRouter for type-safe API calls
 */
function getTRPCClient(): CreateTRPCClient<AppRouter> {
  const token = getAuthToken();
  const apiUrl = getApiHost();

  return createClient<AppRouter>({
    apiUrl,
    apiKey: token,
  });
}

function getApiBaseUrl(): string {
  return getApiHost().replace(/\/trpc\/?$/, '');
}

// =============================================================================
// Auth
// =============================================================================

export async function getUser(): Promise<ApiResponse<User>> {
  try {
    const client = getTRPCClient();
    const result = await client.users.me.query();

    return {
      data: {
        id: result.user.id,
        email: result.user.email || '',
        displayName: result.user.displayName || '',
        role: result.grant || 'user',
        createdAt: result.user.createdAt?.toISOString() || '',
        firstName: result.user.firstName ?? undefined,
        lastName: result.user.lastName ?? undefined,
        imageUrl: result.user.imageUrl ?? undefined,
      },
      status: 200,
    };
  } catch (error) {
    return handleTRPCError(error);
  }
}

// =============================================================================
// Organizations
// =============================================================================

export async function getOrgs(): Promise<ApiResponse<Organization[]>> {
  try {
    const client = getTRPCClient();
    const orgs = await client.orgs.list.query();

    return {
      data: orgs.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
      })),
      status: 200,
    };
  } catch (error) {
    return handleTRPCError(error);
  }
}

// =============================================================================
// Websites
// =============================================================================

export async function getWebsites(): Promise<ApiResponse<Website[]>> {
  try {
    const client = getTRPCClient();
    const websites = await client.websites.list.query();

    return {
      data: websites.map(
        (site: {
          id: string;
          name: string;
          domain: string;
          shareId: string | null;
          createdAt: Date | null;
          userId: string;
          orgId: string | null;
        }) => ({
          websiteId: site.id,
          id: site.id,
          name: site.name,
          domain: site.domain,
          shareId: site.shareId ?? undefined,
          createdAt: site.createdAt?.toISOString() || '',
          userId: site.userId,
          orgId: site.orgId ?? undefined,
        }),
      ),
      status: 200,
    };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function getWebsite(id: string): Promise<ApiResponse<Website>> {
  try {
    const client = getTRPCClient();
    const site = await client.websites.get.query({ websiteId: id });

    return {
      data: {
        websiteId: site.id,
        id: site.id,
        name: site.name,
        domain: site.domain,
        shareId: site.shareId ?? undefined,
        createdAt: site.createdAt?.toISOString() || '',
        userId: site.userId,
        orgId: site.orgId ?? undefined,
      },
      status: 200,
    };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function createWebsite(domain: string, name?: string): Promise<ApiResponse<Website>> {
  try {
    const client = getTRPCClient();
    const site = await client.websites.create.mutate({
      domain,
      name: name || domain,
    });

    return {
      data: {
        websiteId: site.id,
        id: site.id,
        name: site.name,
        domain: site.domain,
        shareId: site.shareId ?? undefined,
        createdAt: site.createdAt?.toISOString() || '',
        userId: site.userId,
        orgId: site.orgId ?? undefined,
      },
      status: 201,
    };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function deleteWebsite(id: string): Promise<ApiResponse<void>> {
  try {
    const client = getTRPCClient();
    await client.websites.delete.mutate({ websiteId: id });

    return { data: undefined, status: 200 };
  } catch (error) {
    return handleTRPCError(error);
  }
}

// =============================================================================
// Stats (Connected to tRPC Analytics Router)
// =============================================================================

export async function getStats(
  websiteId: string,
  startAt: number,
  endAt: number,
): Promise<ApiResponse<Stats>> {
  try {
    const client = getTRPCClient();
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    const result = await client.analytics.overview.query({
      websiteId,
      startDate,
      endDate,
    });

    // Map tRPC response to CLI Stats format
    return {
      data: {
        pageviews: {
          value: result.pageviews,
          change: calcChange(result.pageviews, result.comparison?.pageviews ?? 0),
        },
        visitors: {
          value: result.visitors,
          change: calcChange(result.visitors, result.comparison?.visitors ?? 0),
        },
        visits: {
          value: result.visits,
          change: calcChange(result.visits, result.comparison?.visits ?? 0),
        },
        bounces: {
          value: result.bounces,
          change: calcChange(result.bounces, result.comparison?.bounces ?? 0),
        },
        totalTime: {
          value: result.totalTime,
          change: calcChange(result.totalTime, result.comparison?.totalTime ?? 0),
        },
      },
      status: 200,
    };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function getTopPages(
  websiteId: string,
  startAt: number,
  endAt: number,
  limit = 10,
): Promise<ApiResponse<TopResult[]>> {
  try {
    const client = getTRPCClient();
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    const result = await client.analytics.topPages.query({
      websiteId,
      startDate,
      endDate,
      limit,
    });

    // Map to CLI TopResult format
    return {
      data: result.map((item: { path: string; views: number }) => ({
        x: item.path,
        y: item.views,
      })),
      status: 200,
    };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function getTopReferrers(
  websiteId: string,
  startAt: number,
  endAt: number,
  limit = 10,
): Promise<ApiResponse<TopResult[]>> {
  try {
    const client = getTRPCClient();
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    const result = await client.analytics.topReferrers.query({
      websiteId,
      startDate,
      endDate,
      limit,
    });

    // Map to CLI TopResult format
    return {
      data: result.map((item: { referrer: string; visits: number }) => ({
        x: item.referrer || 'Direct',
        y: item.visits,
      })),
      status: 200,
    };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function getTopCountries(
  websiteId: string,
  startAt: number,
  endAt: number,
  limit = 10,
): Promise<ApiResponse<TopResult[]>> {
  try {
    const client = getTRPCClient();
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    const result = await client.analytics.geography.query({
      websiteId,
      startDate,
      endDate,
    });

    // Map to CLI TopResult format, limit results
    return {
      data: result.slice(0, limit).map((item: { country: string; visitors: number }) => ({
        x: item.country || 'Unknown',
        y: item.visitors,
      })),
      status: 200,
    };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function getRealtimeVisitors(
  websiteId: string,
): Promise<ApiResponse<{ count: number }>> {
  try {
    const client = getTRPCClient();

    // Call realtime.count if available, otherwise use sessions query with short timeframe
    // For now, use sessions in last 5 minutes as realtime approximation
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const now = new Date();

    const result = await client.analytics.sessions.query({
      websiteId,
      startDate: fiveMinutesAgo,
      endDate: now,
      limit: 1000,
      offset: 0,
    });

    return {
      data: {
        count: result.sessions?.length ?? 0,
      },
      status: 200,
    };
  } catch (error) {
    return handleTRPCError(error);
  }
}

// =============================================================================
// Links
// =============================================================================

export async function getLinks(_orgId?: string): Promise<ApiResponse<Link[]>> {
  try {
    const client = getTRPCClient();
    const links = await client.links.list.query();

    return {
      data: links.map(
        (link: {
          id: string;
          name: string;
          url: string;
          slug: string;
          createdAt: Date | null;
          clicks: number;
          orgId: string | null;
        }) => ({
          id: link.id,
          url: link.url,
          slug: link.slug,
          name: link.name,
          shortUrl: `https://entro.link/${link.slug}`,
          clicks: link.clicks,
          createdAt: link.createdAt?.toISOString() || '',
          orgId: link.orgId ?? undefined,
        }),
      ),
      status: 200,
    };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function createLink(
  url: string,
  name?: string,
  slug?: string,
  orgId?: string,
): Promise<ApiResponse<Link>> {
  try {
    const client = getTRPCClient();
    const link = await client.links.create.mutate({
      url,
      name: name || new URL(url).hostname,
      slug: slug || '',
      orgId,
    });

    return {
      data: {
        id: link.id,
        url: link.url,
        slug: link.slug,
        name: link.name,
        shortUrl: `https://entro.link/${link.slug}`,
        clicks: 0,
        createdAt: link.createdAt?.toISOString() || '',
        orgId: link.orgId ?? undefined,
      },
      status: 201,
    };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function getLinkStats(linkId: string): Promise<ApiResponse<LinkStats>> {
  try {
    const token = getAuthToken();
    if (!token) {
      return { error: 'Not authenticated', status: 401 };
    }

    const apiBaseUrl = getApiBaseUrl();
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const url = new URL(`${apiBaseUrl}/api/links/${linkId}/stats`);
    url.searchParams.set('startAt', String(startDate.getTime()));
    url.searchParams.set('endAt', String(endDate.getTime()));

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        error: (body as { error?: string }).error || 'Failed to fetch link stats',
        status: response.status,
      };
    }

    const stats = (await response.json()) as LinkStats;

    return {
      data: stats,
      status: 200,
    };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function deleteLink(linkId: string): Promise<ApiResponse<void>> {
  try {
    const client = getTRPCClient();
    await client.links.delete.mutate({ linkId });

    return { data: undefined, status: 200 };
  } catch (error) {
    return handleTRPCError(error);
  }
}

// =============================================================================
// Events
// =============================================================================

export async function sendTestEvent(websiteId: string): Promise<ApiResponse<void>> {
  const client = getTRPCClient();
  const apiBaseUrl = getApiBaseUrl();
  const token = getAuthToken();
  let apiKeyId: string | null = null;
  let apiKeyValue: string | null = null;

  try {
    if (!token) {
      return { error: 'Not authenticated', status: 401 };
    }

    const site = await client.websites.get.query({ websiteId });
    const createApiKeyResponse = await fetch(`${apiBaseUrl}/api/websites/${websiteId}/keys`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'CLI Test Event',
        scopes: ['events:write'],
      }),
    });

    if (!createApiKeyResponse.ok) {
      const body = await createApiKeyResponse.json().catch(() => ({}));
      return {
        error: (body as { error?: string }).error || 'Failed to create API key',
        status: createApiKeyResponse.status,
      };
    }

    const createdApiKey = (await createApiKeyResponse.json()) as { id?: string; key?: string };
    if (!createdApiKey.id || !createdApiKey.key) {
      return {
        error: 'Invalid API key response',
        status: 500,
      };
    }

    apiKeyId = createdApiKey.id;
    apiKeyValue = createdApiKey.key;

    const url = site?.domain
      ? `https://${site.domain.replace(/^https?:\/\//, '')}`
      : 'https://example.com';

    const payload = {
      websiteId,
      sessionId: randomUUID(),
      visitorId: randomUUID(),
      url,
      eventType: 'custom_event',
      eventName: 'cli_test_event',
      referrer: 'https://entrolytics.click',
      screenWidth: 1440,
      screenHeight: 900,
      loadTime: 123,
      properties: {
        source: 'cli',
        environment: process.env.NODE_ENV || 'development',
      },
    };

    const response = await fetch(`${apiBaseUrl}/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKeyValue,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        error: body.error || 'Failed to send test event',
        status: response.status,
      };
    }

    return { data: undefined, status: 202 };
  } catch (error) {
    return handleTRPCError(error);
  } finally {
    if (apiKeyId) {
      try {
        await fetch(`${apiBaseUrl}/api/websites/${websiteId}/keys/${apiKeyId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {
        // Best-effort cleanup; avoid masking original errors.
      }
    }
  }
}

// =============================================================================
// CLI Token Management
// =============================================================================

export async function listCliTokens(): Promise<ApiResponse<unknown[]>> {
  try {
    const client = getTRPCClient();
    const tokens = await client.auth.cli.listTokens.query();

    return { data: tokens, status: 200 };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function revokeCliToken(tokenId: string): Promise<ApiResponse<{ message: string }>> {
  try {
    const token = getAuthToken();
    if (!token) {
      return { error: 'Not authenticated', status: 401 };
    }

    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/auth/cli/tokens`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tokenId }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        error: (body as { error?: string }).error || 'Failed to revoke token',
        status: response.status,
      };
    }

    return {
      data: { message: 'Token revoked successfully' },
      status: 200,
    };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function revokeAllCliTokens(): Promise<
  ApiResponse<{ message: string; count: number }>
> {
  try {
    const token = getAuthToken();
    if (!token) {
      return { error: 'Not authenticated', status: 401 };
    }

    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/auth/cli/tokens`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ revokeAll: true }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        error: (body as { error?: string }).error || 'Failed to revoke tokens',
        status: response.status,
      };
    }

    const result = (await response.json()) as { count?: number };

    return {
      data: {
        message: 'All tokens revoked successfully',
        count: result.count ?? 0,
      },
      status: 200,
    };
  } catch (error) {
    return handleTRPCError(error);
  }
}

// =============================================================================
// Routing (Not yet implemented)
// =============================================================================

export async function getWebsiteMode(_websiteId: string): Promise<ApiResponse<WebsiteModeConfig>> {
  try {
    const token = getAuthToken();
    if (!token) {
      return { error: 'Not authenticated', status: 401 };
    }
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/websites/${_websiteId}/mode`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { error: 'Failed to fetch website mode', status: response.status };
    }

    const payload = await response.json();
    return { data: payload as WebsiteModeConfig, status: 200 };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function setWebsiteMode(
  _websiteId: string,
  _mode: IngestMode,
): Promise<ApiResponse<{ message: string }>> {
  try {
    const token = getAuthToken();
    if (!token) {
      return { error: 'Not authenticated', status: 401 };
    }
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/websites/${_websiteId}/mode`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ingestMode: _mode }),
    });

    if (!response.ok) {
      return { error: 'Failed to update website mode', status: response.status };
    }

    const payload = await response.json();
    return { data: payload as { message: string }, status: 200 };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function getRoutingHealth(): Promise<ApiResponse<RoutingHealth>> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/health/routing`);
    if (!response.ok) {
      return { error: 'Failed to fetch routing health', status: response.status };
    }
    const data = await response.json();
    return { data: data as RoutingHealth, status: 200 };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function getRoutingStats(
  _startDate?: string,
  _endDate?: string,
): Promise<ApiResponse<RoutingStats>> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const url = new URL(`${apiBaseUrl}/api/routing/stats`);
    if (_startDate) url.searchParams.set('start', _startDate);
    if (_endDate) url.searchParams.set('end', _endDate);
    const response = await fetch(url.toString());
    if (!response.ok) {
      return { error: 'Failed to fetch routing stats', status: response.status };
    }
    const data = await response.json();
    return { data: data as RoutingStats, status: 200 };
  } catch (error) {
    return handleTRPCError(error);
  }
}

// =============================================================================
// Legacy API object (for backward compatibility)
// =============================================================================

export const api = {
  getUser,
  getOrgs,
  getWebsites,
  getWebsite,
  createWebsite,
  deleteWebsite,
  getStats,
  getTopPages,
  getTopReferrers,
  getTopCountries,
  getRealtimeVisitors,
  getLinks,
  createLink,
  getLinkStats,
  deleteLink,
  sendTestEvent,
  listCliTokens,
  revokeCliToken,
  revokeAllCliTokens,
  getWebsiteMode,
  setWebsiteMode,
  getRoutingHealth,
  getRoutingStats,
  // Phase 2: Web Vitals
  getVitalsOverview,
  getVitalsPageBreakdown,
  // Phase 2: Form Analytics
  getFormConversions,
  getFormFieldMetrics,
  // Phase 2: Deployments
  getDeployments,
  trackDeployment,
};

// =============================================================================
// Phase 2: Web Vitals
// =============================================================================

import type {
  Deployment,
  DeploymentSource,
  FormConversion,
  FormFieldMetrics,
  PageBreakdown,
  VitalAggregate,
} from './types.js';

export async function getVitalsOverview(
  websiteId: string,
  startDate: Date,
  endDate: Date,
): Promise<ApiResponse<VitalAggregate[]>> {
  try {
    const client = getTRPCClient();
    const result = await client.vitals.overview.query({
      websiteId,
      startDate,
      endDate,
    });
    return { data: result as VitalAggregate[], status: 200 };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function getVitalsPageBreakdown(
  websiteId: string,
  startDate: Date,
  endDate: Date,
  limit = 50,
): Promise<ApiResponse<PageBreakdown[]>> {
  try {
    const client = getTRPCClient();
    const result = await client.vitals.pageBreakdown.query({
      websiteId,
      startDate,
      endDate,
      limit,
    });
    return { data: result as PageBreakdown[], status: 200 };
  } catch (error) {
    return handleTRPCError(error);
  }
}

// =============================================================================
// Phase 2: Form Analytics
// =============================================================================

export async function getFormConversions(
  websiteId: string,
  startDate: Date,
  endDate: Date,
): Promise<ApiResponse<FormConversion[]>> {
  try {
    const client = getTRPCClient();
    const result = await client.forms.conversions.query({
      websiteId,
      startDate,
      endDate,
    });
    return { data: result as FormConversion[], status: 200 };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function getFormFieldMetrics(
  websiteId: string,
  formId: string,
  startDate: Date,
  endDate: Date,
): Promise<ApiResponse<FormFieldMetrics[]>> {
  try {
    const client = getTRPCClient();
    const result = await client.forms.fieldMetrics.query({
      websiteId,
      formId,
      startDate,
      endDate,
    });
    return { data: result as FormFieldMetrics[], status: 200 };
  } catch (error) {
    return handleTRPCError(error);
  }
}

// =============================================================================
// Phase 2: Deployment Tracking
// =============================================================================

export async function getDeployments(
  websiteId: string,
  startDate: Date,
  endDate: Date,
  limit = 50,
): Promise<ApiResponse<Deployment[]>> {
  try {
    const client = getTRPCClient();
    const result = await client.deployments.list.query({
      websiteId,
      startDate,
      endDate,
      limit,
    });
    return { data: result as Deployment[], status: 200 };
  } catch (error) {
    return handleTRPCError(error);
  }
}

export async function trackDeployment(
  websiteId: string,
  deployId: string,
  source: DeploymentSource,
  options: { gitSha?: string; gitBranch?: string; deployUrl?: string; environment?: string } = {},
): Promise<ApiResponse<{ success: boolean }>> {
  try {
    const client = getTRPCClient();
    await client.deployments.track.mutate({
      websiteId,
      deployId,
      source,
      ...options,
    });
    return { data: { success: true }, status: 200 };
  } catch (error) {
    return handleTRPCError(error);
  }
}
