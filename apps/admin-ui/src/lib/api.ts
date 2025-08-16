import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Add request interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  checks: {
    database: boolean;
    redis: boolean;
    stripe: boolean;
    workers: boolean;
  };
  metrics?: {
    eventsPerSecond: number;
    writerLag: number;
    reconciliationDiff: number;
  };
}

export interface EventsResponse {
  events: Array<{
    idempotencyKey: string;
    tenantId: string;
    metric: string;
    customerRef: string;
    quantity: number;
    ts: string;
    meta: Record<string, any>;
    source: string;
    insertedAt: string;
  }>;
  total: number;
}

export interface MappingResponse {
  mappings: Array<{
    id: string;
    tenantId: string;
    metric: string;
    aggregation: 'sum' | 'max' | 'last';
    stripeAccount: string;
    priceId: string;
    subscriptionItemId?: string;
    currency?: string;
    active: boolean;
  }>;
}

export interface ReconciliationResponse {
  period: string;
  reports: Array<{
    id: string;
    tenantId: string;
    subscriptionItemId: string;
    periodStart: string;
    localTotal: number;
    stripeTotal: number;
    diff: number;
    status: 'ok' | 'investigate' | 'resolved';
    createdAt: string;
  }>;
  summary: {
    total: number;
    ok: number;
    investigating: number;
    resolved: number;
    maxDiff: number;
  };
}

// API functions
export const healthApi = {
  getStatus: () => api.get<HealthStatus>('/health/ready'),
};

export const eventsApi = {
  list: (params?: { 
    tenantId?: string; 
    metric?: string; 
    customerRef?: string; 
    limit?: number; 
    offset?: number; 
  }) => api.get<EventsResponse>('/v1/events', { params }),
  
  ingest: (events: Array<{
    tenantId: string;
    metric: string;
    customerRef: string;
    quantity: number;
    ts?: string;
    meta?: Record<string, any>;
  }>) => api.post('/v1/events/ingest', { events }),
};

export const mappingsApi = {
  list: (tenantId: string) => api.get<MappingResponse>('/v1/mappings', {
    params: { tenantId }
  }),
  
  create: (mapping: {
    tenantId: string;
    metric: string;
    aggregation: 'sum' | 'max' | 'last';
    stripeAccount: string;
    priceId: string;
    subscriptionItemId?: string;
    currency?: string;
  }) => api.post('/v1/mappings', mapping),
  
  delete: (id: string) => api.delete(`/v1/mappings/${id}`),
};

export const reconciliationApi = {
  getReport: (period: string, tenantId: string) => 
    api.get<ReconciliationResponse>(`/v1/reconciliation/${period}`, {
      params: { tenantId }
    }),
  
  runReconciliation: (tenantId: string) => 
    api.post('/v1/reconciliation/run', { tenantId }),
};

export const alertsApi = {
  list: (tenantId: string) => api.get('/v1/alerts', {
    params: { tenantId }
  }),
  
  create: (alert: {
    tenantId: string;
    customerRef?: string;
    metric?: string;
    type: 'threshold' | 'spike' | 'budget';
    threshold: number;
    action: 'email' | 'webhook' | 'slack' | 'hard_cap' | 'soft_cap';
    config: Record<string, any>;
  }) => api.post('/v1/alerts', alert),
  
  delete: (id: string) => api.delete(`/v1/alerts/${id}`),
  
  getHistory: (tenantId: string) => api.get('/v1/alerts/history', {
    params: { tenantId }
  }),
};

export default api;
