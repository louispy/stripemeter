/**
 * Core package exports
 */
export * from './types/base';
export * from './types/api';
export * from './schemas/validation';
export * from './utils/idempotency';
export * from './utils/period';
export declare const DEFAULT_LATENESS_WINDOW_HOURS = 48;
export declare const DEFAULT_AGGREGATION_INTERVAL_MS = 5000;
export declare const DEFAULT_WRITER_INTERVAL_MS = 10000;
export declare const DEFAULT_RECONCILIATION_INTERVAL_MS = 3600000;
export declare const MAX_BATCH_SIZE = 1000;
export declare const RECONCILIATION_EPSILON = 0.005;
//# sourceMappingURL=index.d.ts.map