/**
 * Stripemeter Node.js SDK
 */

import axios, { AxiosInstance } from 'axios';
import { backOff } from 'exponential-backoff';
import {
  UsageEvent,
  IngestEventResponse,
  UsageResponse,
  ProjectionResponse,
  generateIdempotencyKey,
  type IngestEventRequestInput,
} from '@stripemeter/core';

export interface StripemeterConfig {
  apiUrl: string;
  apiKey?: string;
  tenantId: string;
  timeout?: number;
  retryAttempts?: number;
  batchSize?: number;
}

export class StripemeterClient {
  private client: AxiosInstance;
  private config: Required<StripemeterConfig>;
  private eventBuffer: UsageEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: StripemeterConfig) {
    this.config = {
      apiUrl: config.apiUrl.replace(/\/$/, ''), // Remove trailing slash
      apiKey: config.apiKey || '',
      tenantId: config.tenantId,
      timeout: config.timeout || 10000,
      retryAttempts: config.retryAttempts || 3,
      batchSize: config.batchSize || 100,
    };

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          const { status, data } = error.response;
          const message = data?.message || data?.error || `Request failed with status ${status}`;
          throw new StripemeterError(message, status, data);
        } else if (error.request) {
          throw new StripemeterError('No response from server', 0, null);
        } else {
          throw new StripemeterError(error.message, 0, null);
        }
      }
    );
  }

  /**
   * Track a single usage event
   */
  async track(event: Omit<UsageEvent, 'tenantId'>): Promise<IngestEventResponse> {
    const fullEvent: UsageEvent = {
      ...event,
      tenantId: this.config.tenantId,
      ts: event.ts || new Date().toISOString(),
      source: event.source || 'sdk',
    };

    // Generate idempotency key if not provided
    if (!fullEvent.idempotencyKey) {
      fullEvent.idempotencyKey = generateIdempotencyKey({
        tenantId: fullEvent.tenantId,
        metric: fullEvent.metric,
        customerRef: fullEvent.customerRef,
        resourceId: fullEvent.resourceId,
        ts: fullEvent.ts,
      });
    }

    return this.ingestEvents([fullEvent]);
  }

  /**
   * Track multiple usage events
   */
  async trackBatch(events: Array<Omit<UsageEvent, 'tenantId'>>): Promise<IngestEventResponse> {
    const fullEvents = events.map(event => ({
      ...event,
      tenantId: this.config.tenantId,
      ts: event.ts || new Date().toISOString(),
      source: event.source || 'sdk',
      idempotencyKey: event.idempotencyKey || generateIdempotencyKey({
        tenantId: this.config.tenantId,
        metric: event.metric,
        customerRef: event.customerRef,
        resourceId: event.resourceId,
        ts: event.ts || new Date().toISOString(),
      }),
    }));

    return this.ingestEvents(fullEvents);
  }

  /**
   * Buffer events for batch sending
   */
  buffer(event: Omit<UsageEvent, 'tenantId'>): void {
    const fullEvent: UsageEvent = {
      ...event,
      tenantId: this.config.tenantId,
      ts: event.ts || new Date().toISOString(),
      source: event.source || 'sdk',
    };

    if (!fullEvent.idempotencyKey) {
      fullEvent.idempotencyKey = generateIdempotencyKey({
        tenantId: fullEvent.tenantId,
        metric: fullEvent.metric,
        customerRef: fullEvent.customerRef,
        resourceId: fullEvent.resourceId,
        ts: fullEvent.ts,
      });
    }

    this.eventBuffer.push(fullEvent);

    // Auto-flush if buffer is full
    if (this.eventBuffer.length >= this.config.batchSize) {
      this.flush();
    } else {
      // Set timer to flush after 5 seconds
      if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => this.flush(), 5000);
      }
    }
  }

  /**
   * Flush buffered events
   */
  async flush(): Promise<IngestEventResponse | null> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.eventBuffer.length === 0) {
      return null;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      return await this.ingestEvents(events);
    } catch (error) {
      // Re-add events to buffer on failure
      this.eventBuffer.unshift(...events);
      throw error;
    }
  }

  /**
   * Get current usage for a customer
   */
  async getUsage(customerRef: string): Promise<UsageResponse> {
    const response = await this.client.get<UsageResponse>('/v1/usage/current', {
      params: {
        tenantId: this.config.tenantId,
        customerRef,
      },
    });
    return response.data;
  }

  /**
   * Get cost projection for a customer
   */
  async getProjection(
    customerRef: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<ProjectionResponse> {
    const response = await this.client.post<ProjectionResponse>('/v1/usage/projection', {
      tenantId: this.config.tenantId,
      customerRef,
      periodStart,
      periodEnd,
    });
    return response.data;
  }

  /**
   * Internal method to ingest events with retry
   */
  private async ingestEvents(events: UsageEvent[]): Promise<IngestEventResponse> {
    const request: IngestEventRequestInput = { events };

    return backOff(
      async () => {
        const response = await this.client.post<IngestEventResponse>(
          '/v1/events/ingest',
          request
        );
        return response.data;
      },
      {
        numOfAttempts: this.config.retryAttempts,
        startingDelay: 1000,
        timeMultiple: 2,
        maxDelay: 10000,
        retry: (error: any) => {
          // Retry on network errors or 5xx errors
          if (!error.statusCode || error.statusCode >= 500) {
            return true;
          }
          // Don't retry on client errors (4xx)
          return false;
        },
      }
    );
  }

  /**
   * Close the client and flush any remaining events
   */
  async close(): Promise<void> {
    await this.flush();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

/**
 * Custom error class for Stripemeter SDK
 */
export class StripemeterError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data: any
  ) {
    super(message);
    this.name = 'StripemeterError';
  }
}

/**
 * Helper function to create a client instance
 */
export function createClient(config: StripemeterConfig): StripemeterClient {
  return new StripemeterClient(config);
}

// Re-export types from core
export type {
  UsageEvent,
  IngestEventResponse,
  UsageResponse,
  ProjectionResponse,
  ReconciliationReport,
  AlertConfig,
} from '@stripemeter/core';
