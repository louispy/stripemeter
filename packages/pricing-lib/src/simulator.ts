/**
 * Invoice simulation engine
 */

import Decimal from 'decimal.js';
import { 
  UsageLineItem, 
  Invoice, 
  InvoiceLineItem,
  Commitment,
  Credit,
  toDecimal,
  roundToCurrency
} from './models/pricing-models';
import { calculateTieredPrice } from './calculators/tiered';
import { calculateVolumePrice } from './calculators/volume';
import { calculateGraduatedPrice } from './calculators/graduated';

export interface SimulationInput {
  customerId: string;
  periodStart: string;
  periodEnd: string;
  usageItems: UsageLineItem[];
  commitments?: Commitment[];
  credits?: Credit[];
  taxRate?: number;
}

export class InvoiceSimulator {
  /**
   * Simulate an invoice based on usage and pricing configuration
   */
  simulate(input: SimulationInput): Invoice {
    const lineItems: InvoiceLineItem[] = [];
    let subtotal = new Decimal(0);

    // Calculate each line item
    for (const usageItem of input.usageItems) {
      const lineItem = this.calculateLineItem(usageItem);
      lineItems.push(lineItem);
      subtotal = subtotal.add(lineItem.subtotal);
    }

    // Apply commitments
    let commitmentCredit = new Decimal(0);
    if (input.commitments) {
      for (const commitment of input.commitments) {
        if (this.isCommitmentActive(commitment, input.periodStart, input.periodEnd)) {
          const remaining = toDecimal(commitment.amount).sub(commitment.applied);
          const applicable = Decimal.min(remaining, subtotal.sub(commitmentCredit));
          commitmentCredit = commitmentCredit.add(applicable);
        }
      }
    }

    // Apply credits
    let creditAmount = new Decimal(0);
    if (input.credits) {
      for (const credit of input.credits) {
        if (!credit.expiresAt || new Date(credit.expiresAt) >= new Date(input.periodEnd)) {
          creditAmount = creditAmount.add(credit.amount);
        }
      }
    }

    // Calculate tax
    const taxableAmount = Decimal.max(0, subtotal.sub(commitmentCredit).sub(creditAmount));
    const taxRate = input.taxRate || 0;
    const tax = taxableAmount.mul(taxRate / 100);

    // Calculate total
    const total = taxableAmount.add(tax);

    return {
      customerId: input.customerId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      lineItems,
      subtotal: roundToCurrency(subtotal),
      credits: roundToCurrency(creditAmount.add(commitmentCredit)),
      adjustments: 0,
      tax: roundToCurrency(tax),
      total: roundToCurrency(total),
      currency: input.usageItems[0]?.priceConfig.currency || 'USD',
    };
  }

  /**
   * Calculate a single line item based on usage and pricing
   */
  private calculateLineItem(usageItem: UsageLineItem): InvoiceLineItem {
    const { metric, quantity, priceConfig } = usageItem;
    let subtotal = 0;
    let effectiveUnitPrice = 0;

    switch (priceConfig.model) {
      case 'tiered':
        if (priceConfig.tiers) {
          const result = calculateTieredPrice(quantity, priceConfig.tiers);
          subtotal = result.total;
          effectiveUnitPrice = quantity > 0 ? subtotal / quantity : 0;
        }
        break;

      case 'volume':
        if (priceConfig.tiers) {
          const result = calculateVolumePrice(quantity, priceConfig.tiers);
          subtotal = result.total;
          effectiveUnitPrice = result.unitPrice;
        }
        break;

      case 'graduated':
        if (priceConfig.tiers) {
          const result = calculateGraduatedPrice(quantity, priceConfig.tiers);
          subtotal = result.total;
          effectiveUnitPrice = quantity > 0 ? subtotal / quantity : 0;
        }
        break;

      case 'flat':
        effectiveUnitPrice = priceConfig.unitPrice || 0;
        subtotal = roundToCurrency(toDecimal(quantity).mul(effectiveUnitPrice));
        break;

      case 'package':
        const packageSize = priceConfig.packageSize || 1;
        const packages = Math.ceil(quantity / packageSize);
        effectiveUnitPrice = priceConfig.unitPrice || 0;
        subtotal = roundToCurrency(toDecimal(packages).mul(effectiveUnitPrice));
        break;
    }

    // Apply minimum and maximum charges
    if (priceConfig.minimumCharge && subtotal < priceConfig.minimumCharge) {
      subtotal = priceConfig.minimumCharge;
    }
    if (priceConfig.maximumCharge && subtotal > priceConfig.maximumCharge) {
      subtotal = priceConfig.maximumCharge;
    }

    return {
      metric,
      quantity,
      unitPrice: roundToCurrency(effectiveUnitPrice),
      subtotal,
      description: `${quantity} units of ${metric}`,
    };
  }

  /**
   * Check if a commitment is active for the given period
   */
  private isCommitmentActive(commitment: Commitment, periodStart: string, periodEnd: string): boolean {
    const commitStart = new Date(commitment.startDate);
    const commitEnd = new Date(commitment.endDate);
    const pStart = new Date(periodStart);
    const pEnd = new Date(periodEnd);

    return commitStart <= pEnd && commitEnd >= pStart;
  }

  /**
   * Calculate proration for partial periods
   */
  calculateProration(
    amount: number,
    startDate: string,
    endDate: string,
    periodStart: string,
    periodEnd: string
  ): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const pStart = new Date(periodStart);
    const pEnd = new Date(periodEnd);

    // Calculate actual usage period within billing period
    const actualStart = start > pStart ? start : pStart;
    const actualEnd = end < pEnd ? end : pEnd;

    // Calculate days
    const actualDays = Math.max(0, (actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24));
    const periodDays = (pEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24);

    const prorationFactor = Math.min(1, actualDays / periodDays);
    return roundToCurrency(toDecimal(amount).mul(prorationFactor));
  }
}
