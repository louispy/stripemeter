// Minimal, discoverable config for StripeMeter.
// Map metric names to counters and set the watermark window for late-event replay.

export type MetricConfig = {
  counter: string;                 // name of the counter series (storage key)
  idempotencyKey: Array<'tenantId' | 'metric' | 'eventId' | 'ts'>; // how duplicates are detected
  watermarkWindowSeconds: number;  // late-event window; replay considers events within this window
};

export type StripeMeterConfig = {
  tenantDefault: string;
  tenants: Record<string, {
    metrics: Record<string, MetricConfig>;
  }>;
};

const config: StripeMeterConfig = {
  tenantDefault: 'demo',
  tenants: {
    demo: {
      metrics: {
        // A canonical "requests" metric
        requests: {
          counter: 'requests',
          idempotencyKey: ['tenantId', 'metric', 'eventId'],
          watermarkWindowSeconds: 24 * 60 * 60, // 24h
        },
        // Add your own metrics here...
      },
    },
  },
};

export default config;
