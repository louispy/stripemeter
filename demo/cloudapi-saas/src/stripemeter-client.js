const axios = require('axios');

class StripeMeterClient {
  constructor(config) {
    this.apiUrl = config.apiUrl;
    this.tenantId = config.tenantId;
    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async track(event) {
    try {
      const response = await this.client.post('/v1/events/ingest', {
        events: [{
          tenantId: this.tenantId,
          metric: event.metric,
          customerRef: event.customerRef,
          quantity: event.quantity || 1,
          ts: event.ts || new Date().toISOString(),
          meta: event.meta || {},
          resourceId: event.resourceId,
          idempotencyKey: event.idempotencyKey,
          source: 'demo'
        }]
      });
      
      return response.data;
    } catch (error) {
      console.error('StripeMeter tracking error:', error.message);
      throw error;
    }
  }

  async getUsage(customerRef, options = {}) {
    try {
      const response = await this.client.post('/v1/usage/current', {
        tenantId: this.tenantId,
        customerRef,
        periodStart: options.periodStart,
        periodEnd: options.periodEnd,
        metrics: options.metrics
      });
      
      return response.data;
    } catch (error) {
      console.error('StripeMeter usage fetch error:', error.message);
      // Return mock data for demo if StripeMeter is not available
      return this.getMockUsage(customerRef);
    }
  }

  async getProjection(customerRef, options = {}) {
    try {
      const response = await this.client.post('/v1/usage/projection', {
        tenantId: this.tenantId,
        customerRef,
        periodStart: options.periodStart,
        periodEnd: options.periodEnd
      });
      
      return response.data;
    } catch (error) {
      console.error('StripeMeter projection fetch error:', error.message);
      // Return mock data for demo if StripeMeter is not available
      return this.getMockProjection(customerRef);
    }
  }

  async createAlert(alertConfig) {
    try {
      const response = await this.client.post('/v1/alerts', {
        tenantId: this.tenantId,
        ...alertConfig
      });
      
      return response.data;
    } catch (error) {
      console.error('StripeMeter alert creation error:', error.message);
      throw error;
    }
  }

  // Mock data for demo purposes when StripeMeter backend is not available
  getMockUsage(customerRef) {
    const mockData = {
      'cus_demo_alice': {
        period: { start: '2025-01-01', end: '2025-01-31' },
        metrics: [
          { metric: 'api_calls', current: 847, limit: 1000 },
          { metric: 'data_processed', current: 23, limit: 100 },
          { metric: 'compute_time', current: 12450, limit: 60000 },
          { metric: 'storage', current: 15, limit: 100 }
        ]
      },
      'cus_demo_bob': {
        period: { start: '2025-01-01', end: '2025-01-31' },
        metrics: [
          { metric: 'api_calls', current: 7234, limit: 10000 },
          { metric: 'data_processed', current: 456, limit: 1000 },
          { metric: 'compute_time', current: 234567, limit: 600000 },
          { metric: 'storage', current: 234, limit: 1000 }
        ]
      },
      'cus_demo_carol': {
        period: { start: '2025-01-01', end: '2025-01-31' },
        metrics: [
          { metric: 'api_calls', current: 45678, limit: 100000 },
          { metric: 'data_processed', current: 3456, limit: 10000 },
          { metric: 'compute_time', current: 1234567, limit: 3600000 },
          { metric: 'storage', current: 2345, limit: 10000 }
        ]
      }
    };

    return mockData[customerRef] || mockData['cus_demo_alice'];
  }

  getMockProjection(customerRef) {
    const mockData = {
      'cus_demo_alice': {
        period: { start: '2025-01-01', end: '2025-01-31' },
        current: 847,
        projected: 1120,
        cost: {
          current: 0,
          projected: 2.40,
          breakdown: [
            { metric: 'api_calls', usage: 1120, cost: 2.40, overage: 120 }
          ]
        }
      },
      'cus_demo_bob': {
        period: { start: '2025-01-01', end: '2025-01-31' },
        current: 7234,
        projected: 9567,
        cost: {
          current: 29.00,
          projected: 29.00,
          breakdown: [
            { metric: 'api_calls', usage: 9567, cost: 29.00, overage: 0 }
          ]
        }
      },
      'cus_demo_carol': {
        period: { start: '2025-01-01', end: '2025-01-31' },
        current: 45678,
        projected: 78234,
        cost: {
          current: 299.00,
          projected: 411.87,
          breakdown: [
            { metric: 'api_calls', usage: 78234, cost: 411.87, overage: -21766 }
          ]
        }
      }
    };

    return mockData[customerRef] || mockData['cus_demo_alice'];
  }
}

module.exports = StripeMeterClient;
