/**
 * Core package exports
 */

// Types
export * from './types/base';
export * from './types/api';

// Schemas
export * from './schemas/validation';

// Utils
export * from './utils/idempotency';
export * from './utils/period';
export * from './utils/assertions';

// Constants
export const DEFAULT_LATENESS_WINDOW_HOURS = 48;
export const DEFAULT_AGGREGATION_INTERVAL_MS = 5000;
export const DEFAULT_WRITER_INTERVAL_MS = 10000;
export const DEFAULT_RECONCILIATION_INTERVAL_MS = 3600000;
export const MAX_BATCH_SIZE = 1000;
export const RECONCILIATION_EPSILON = 0.005; // 0.5% tolerance
