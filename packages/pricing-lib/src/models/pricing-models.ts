/**
 * Pricing model definitions
 */

import Decimal from 'decimal.js';

export type PricingModel = 'tiered' | 'volume' | 'graduated' | 'flat' | 'package';

export interface PriceTier {
  upTo: number | null; // null means infinity
  unitPrice: number; // price per unit in this tier
  flatPrice?: number; // flat fee for this tier (graduated pricing)
}

export interface PriceConfig {
  model: PricingModel;
  currency: string;
  tiers?: PriceTier[];
  unitPrice?: number; // for flat pricing
  packageSize?: number; // for package pricing
  minimumCharge?: number;
  maximumCharge?: number;
}

export interface UsageLineItem {
  metric: string;
  quantity: number;
  priceConfig: PriceConfig;
}

export interface InvoiceLineItem {
  metric: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  description?: string;
}

export interface Invoice {
  customerId: string;
  periodStart: string;
  periodEnd: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  credits: number;
  adjustments: number;
  tax: number;
  total: number;
  currency: string;
}

export interface Commitment {
  amount: number;
  startDate: string;
  endDate: string;
  applied: number;
}

export interface Credit {
  amount: number;
  reason: string;
  expiresAt?: string;
}

/**
 * Convert number to Decimal for precise calculations
 */
export function toDecimal(value: number | string | Decimal): Decimal {
  return new Decimal(value);
}

/**
 * Round to currency precision (2 decimal places for most currencies)
 */
export function roundToCurrency(value: Decimal | number, precision: number = 2): number {
  const decimal = value instanceof Decimal ? value : new Decimal(value);
  return decimal.toDecimalPlaces(precision, Decimal.ROUND_HALF_UP).toNumber();
}
