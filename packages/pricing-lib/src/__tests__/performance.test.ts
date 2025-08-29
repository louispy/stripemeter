/**
 * Simple performance benchmarks for pricing calculations
 */

import { describe, it, expect } from 'vitest';
import { calculateTieredPrice } from '../calculators/tiered';
import { calculateVolumePrice } from '../calculators/volume';
import { calculateGraduatedPrice } from '../calculators/graduated';

const tieredTiers = [
  { upTo: 1000, unitPrice: 0.01 },
  { upTo: 50000, unitPrice: 0.008 },
  { upTo: null, unitPrice: 0.005 },
];

const graduatedTiers = [
  { upTo: 1000, flatPrice: 50, unitPrice: 0.005 },
  { upTo: 50000, flatPrice: 100, unitPrice: 0.003 },
  { upTo: null, flatPrice: 200, unitPrice: 0.002 },
];

describe('Pricing calculation performance', () => {
  it('tiered calculation should be fast', () => {
    const iterations = 2000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      calculateTieredPrice(Math.random() * 100000, tieredTiers as any);
    }
    const duration = performance.now() - start;
    const avgMs = duration / iterations;
    expect(avgMs).toBeLessThan(0.2); // < 0.2ms per calc
  });

  it('volume calculation should be very fast', () => {
    const iterations = 5000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      calculateVolumePrice(Math.random() * 100000, tieredTiers as any);
    }
    const duration = performance.now() - start;
    const avgMs = duration / iterations;
    expect(avgMs).toBeLessThan(0.05); // < 0.05ms per calc
  });

  it('graduated calculation should be fast', () => {
    const iterations = 1500;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      calculateGraduatedPrice(Math.random() * 100000, graduatedTiers as any);
    }
    const duration = performance.now() - start;
    const avgMs = duration / iterations;
    expect(avgMs).toBeLessThan(0.3); // < 0.3ms per calc
  });
});


