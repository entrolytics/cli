import type {
  DeploymentSource,
  FormEventType,
  FormFieldType,
  VitalType,
} from '@entrolytics/shared';

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

export interface LinkStats {
  totalClicks: number;
  uniqueVisitors: number;
  clicksByDay: Array<{ date: string; clicks: number }>;
  topReferrers: Array<{ referrer: string; clicks: number }>;
  topCountries: Array<{ country: string; clicks: number }>;
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

// =============================================================================
// Phase 2: Web Vitals Types
// =============================================================================

export type VitalMetric = VitalType;
export type { DeploymentSource, FormEventType, FormFieldType };

export interface VitalAggregate {
  metricName: VitalMetric;
  goodCount: number;
  needsImprovementCount: number;
  poorCount: number;
  p75Value: number;
  p95Value: number;
  avgValue: number;
  count: number;
  goodPercentage: number;
}

export interface PageBreakdown {
  path: string;
  avgLcp: number | null;
  avgInp: number | null;
  avgCls: number | null;
  avgTtfb: number | null;
  avgFcp: number | null;
  count: number;
}

// =============================================================================
// Phase 2: Form Analytics Types
// =============================================================================

export interface FormConversion {
  formId: string;
  formName: string | null;
  starts: number;
  submits: number;
  abandons: number;
  conversionRate: number;
}

export interface FormFieldMetrics {
  formId: string;
  fieldName: string;
  fieldType: FormFieldType;
  focusCount: number;
  blurCount: number;
  errorCount: number;
  avgTimeOnField: number;
}

// =============================================================================
// Phase 2: Deployment Tracking Types
// =============================================================================

export interface Deployment {
  id: string;
  deployId: string;
  websiteId: string;
  gitSha: string | null;
  gitBranch: string | null;
  source: DeploymentSource;
  deployUrl: string | null;
  environment: string;
  deployedAt: string;
  pageviews: number;
  visitors: number;
}
