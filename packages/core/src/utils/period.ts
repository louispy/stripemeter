/**
 * Period and date utilities
 */

/**
 * Get the start of a billing period
 */
export function getPeriodStart(date: Date | string, periodType: 'daily' | 'monthly' = 'monthly'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (periodType === 'daily') {
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }
  
  // Monthly: first day of month
  const year = d.getUTCFullYear();
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Get the end of a billing period
 */
export function getPeriodEnd(periodStart: string, periodType: 'daily' | 'monthly' = 'monthly'): string {
  const date = new Date(periodStart);
  
  if (periodType === 'daily') {
    date.setUTCDate(date.getUTCDate() + 1);
  } else {
    // Monthly: last day of month
    date.setUTCMonth(date.getUTCMonth() + 1);
  }
  
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * Check if a timestamp falls within a period
 */
export function isInPeriod(ts: string | Date, periodStart: string, periodEnd: string): boolean {
  const timestamp = typeof ts === 'string' ? new Date(ts) : ts;
  const start = new Date(periodStart);
  const end = new Date(periodEnd + 'T23:59:59.999Z');
  
  return timestamp >= start && timestamp <= end;
}

/**
 * Calculate the watermark for late event acceptance
 */
export function calculateWatermark(currentTs: Date, latenessWindowHours: number = 48): Date {
  const watermark = new Date(currentTs);
  watermark.setHours(watermark.getHours() - latenessWindowHours);
  return watermark;
}

/**
 * Check if an event is too late based on watermark
 */
export function isEventTooLate(
  eventTs: string | Date,
  watermarkTs: string | Date,
  latenessWindowHours: number = 48
): boolean {
  const event = typeof eventTs === 'string' ? new Date(eventTs) : eventTs;
  const watermark = typeof watermarkTs === 'string' ? new Date(watermarkTs) : watermarkTs;
  
  const minAcceptableTime = new Date(watermark);
  minAcceptableTime.setHours(minAcceptableTime.getHours() - latenessWindowHours);
  
  return event < minAcceptableTime;
}

/**
 * Get current period for a given timezone
 */
export function getCurrentPeriod(periodType: 'daily' | 'monthly' = 'monthly'): {
  start: string;
  end: string;
} {
  const now = new Date();
  const start = getPeriodStart(now, periodType);
  const end = getPeriodEnd(start, periodType);
  
  return { start, end };
}

/**
 * Calculate proration factor for partial periods
 */
export function calculateProration(
  startDate: string | Date,
  endDate: string | Date,
  periodStart: string,
  periodEnd: string
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const pStart = new Date(periodStart);
  const pEnd = new Date(periodEnd + 'T23:59:59.999Z');
  
  // Calculate actual usage period within billing period
  const actualStart = start > pStart ? start : pStart;
  const actualEnd = end < pEnd ? end : pEnd;
  
  // Calculate days
  const actualDays = Math.max(0, (actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24));
  const periodDays = (pEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24);
  
  return Math.min(1, actualDays / periodDays);
}
