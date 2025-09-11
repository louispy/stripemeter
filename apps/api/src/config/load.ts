// Config loader for StripeMeter API
// Loads configuration from examples/config/stripemeter.config.ts if present

import { resolve } from 'path';

export type MetricConfig = {
  counter: string;
  idempotencyKey: Array<'tenantId' | 'metric' | 'eventId' | 'ts'>;
  watermarkWindowSeconds: number;
};

export type StripeMeterConfig = {
  tenantDefault: string;
  tenants: Record<string, {
    metrics: Record<string, MetricConfig>;
  }>;
};

// Default configuration if no config file is present
const defaultConfig: StripeMeterConfig = {
  tenantDefault: 'demo',
  tenants: {
    demo: {
      metrics: {
        requests: {
          counter: 'requests',
          idempotencyKey: ['tenantId', 'metric', 'eventId'],
          watermarkWindowSeconds: 24 * 60 * 60, // 24h
        },
      },
    },
  },
};

let loadedConfig: StripeMeterConfig | null = null;

export async function loadConfig(): Promise<StripeMeterConfig> {
  if (loadedConfig) {
    return loadedConfig;
  }

  try {
    // Try to load config from examples/config/stripemeter.config.ts
    const configPath = resolve(process.cwd(), 'examples/config/stripemeter.config.ts');
    const configModule = await import(configPath);
    loadedConfig = configModule.default || configModule;
    console.log('[Config] Loaded custom configuration from', configPath);
    return loadedConfig as StripeMeterConfig;
  } catch (error) {
    // If config file doesn't exist or can't be loaded, use defaults
    console.log('[Config] Using default configuration (no custom config found)');
    loadedConfig = defaultConfig;
    return loadedConfig;
  }
}

export function getMetricConfig(tenantId: string, metric: string): MetricConfig | undefined {
  if (!loadedConfig) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  
  const tenant = loadedConfig.tenants[tenantId] ?? loadedConfig.tenants[loadedConfig.tenantDefault];
  return tenant?.metrics[metric];
}

export function getTenantConfig(tenantId: string) {
  if (!loadedConfig) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  
  return loadedConfig.tenants[tenantId] ?? loadedConfig.tenants[loadedConfig.tenantDefault];
}
