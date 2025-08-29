/**
 * Period and date utilities
 */
/**
 * Get the start of a billing period
 */
export declare function getPeriodStart(date: Date | string, periodType?: 'daily' | 'monthly'): string;
/**
 * Get the end of a billing period
 */
export declare function getPeriodEnd(periodStart: string, periodType?: 'daily' | 'monthly'): string;
/**
 * Check if a timestamp falls within a period
 */
export declare function isInPeriod(ts: string | Date, periodStart: string, periodEnd: string): boolean;
/**
 * Calculate the watermark for late event acceptance
 */
export declare function calculateWatermark(currentTs: Date, latenessWindowHours?: number): Date;
/**
 * Check if an event is too late based on watermark
 */
export declare function isEventTooLate(eventTs: string | Date, watermarkTs: string | Date, latenessWindowHours?: number): boolean;
/**
 * Get current period for a given timezone
 */
export declare function getCurrentPeriod(periodType?: 'daily' | 'monthly'): {
    start: string;
    end: string;
};
/**
 * Calculate proration factor for partial periods
 */
export declare function calculateProration(startDate: string | Date, endDate: string | Date, periodStart: string, periodEnd: string): number;
//# sourceMappingURL=period.d.ts.map