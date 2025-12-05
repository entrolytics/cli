export interface Config {
  apiHost: string;
  defaultSiteId?: string;
  outputFormat: 'table' | 'json';
}

export interface AuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  userId: string;
  email: string;
  displayName?: string;
  organization?: Organization;
  jti?: string; // JWT ID for token revocation tracking
}

export interface Organization {
  id: string;
  name: string;
  slug?: string;
}

export interface Website {
  /** Primary key - matches API field name */
  websiteId: string;
  /** @deprecated Use websiteId instead */
  id?: string;
  name: string;
  domain: string;
  createdAt: string;
  updatedAt?: string;
  shareId?: string;
  userId?: string;
  orgId?: string;
}

export interface Link {
  id: string;
  name: string;
  url: string;
  slug: string;
  shortUrl: string;
  clicks: number;
  createdAt: string;
  orgId?: string;
}

export interface Stats {
  pageviews: {
    value: number;
    change: number;
  };
  visitors: {
    value: number;
    change: number;
  };
  visits: {
    value: number;
    change: number;
  };
  bounces: {
    value: number;
    change: number;
  };
  totalTime: {
    value: number;
    change: number;
  };
}

/**
 * Raw stats as returned from the API
 */
export interface ApiStats {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
  comparison?: {
    pageviews: number;
    visitors: number;
    visits: number;
    bounces: number;
    totaltime: number;
  };
}

export interface TopResult {
  x: string;
  y: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export interface User {
  id: string;
  /** Display name (from first + last name or email) */
  displayName: string;
  email: string;
  role: string;
  createdAt: string;
  /** @deprecated Use displayName instead */
  username?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}

/**
 * User data as returned from the API (different field names)
 */
export interface ApiUser {
  userId: string;
  displayName?: string;
  display_name?: string;
  email: string;
  role: string;
  createdAt?: string;
  created_at?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  imageUrl?: string;
  image_url?: string;
}

/**
 * Website ingest mode configuration
 */
export type IngestMode = 'auto' | 'node' | 'edge';

export interface WebsiteModeConfig {
  ingestMode: IngestMode;
}

/**
 * Routing health status
 */
export interface RoutingHealth {
  status: 'ok' | 'degraded' | 'error';
  edge: {
    healthy: boolean;
    latency: number;
  };
  node: {
    healthy: boolean;
    latency: number;
  };
  timestamp: string;
}

/**
 * Routing statistics
 */
export interface RoutingStats {
  period: {
    start: string;
    end: string;
  };
  requests: {
    total: number;
    edge: number;
    node: number;
  };
  latency: {
    edge: {
      p50: number;
      p95: number;
      p99: number;
    };
    node: {
      p50: number;
      p95: number;
      p99: number;
    };
  };
}
