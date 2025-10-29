import { z } from 'zod';

export const PriceTierSchema = z.object({
  upTo: z.number().nullable(),
  unitPrice: z.number(),
  flatPrice: z.number().optional(),
});

export const PriceConfigSchema = z.object({
  model: z.enum(['tiered', 'volume', 'graduated', 'flat', 'package']),
  currency: z.string(),
  tiers: z.array(PriceTierSchema).optional(),
  unitPrice: z.number().optional(),
  packageSize: z.number().int().positive().optional(),
  minimumCharge: z.number().optional(),
  maximumCharge: z.number().optional(),
});

export const UsageLineItemSchema = z.object({
  metric: z.string(),
  quantity: z.number().nonnegative(),
  priceConfig: PriceConfigSchema,
});

export const CommitmentSchema = z.object({
  amount: z.number().nonnegative(),
  startDate: z.string(),
  endDate: z.string(),
  applied: z.number().nonnegative(),
});

export const CreditSchema = z.object({
  amount: z.number().nonnegative(),
  reason: z.string(),
  expiresAt: z.string().optional(),
});

export const TolerancesSchema = z.object({
  absolute: z.number().nonnegative().optional(),
  relative: z.number().min(0).max(1).optional(),
});

export const ScenarioSchema = z.object({
  metadata: z.object({
    name: z.string(),
    description: z.string().optional(),
    version: z.string().default('1'),
  }),
  model: z
    .union([
      z.object({ reference: z.string() }),
      PriceConfigSchema,
    ])
    .optional(),
  inputs: z.object({
    customerId: z.string(),
    periodStart: z.string(),
    periodEnd: z.string(),
    usageItems: z.array(UsageLineItemSchema),
    commitments: z.array(CommitmentSchema).optional(),
    credits: z.array(CreditSchema).optional(),
    taxRate: z.number().optional(),
  }),
  expected: z.object({
    subtotal: z.number().optional(),
    tax: z.number().optional(),
    total: z.number(),
    currency: z.string().optional(),
    lineItems: z
      .array(
        z.object({
          metric: z.string(),
          quantity: z.number(),
          unitPrice: z.number().optional(),
          subtotal: z.number().optional(),
        })
      )
      .optional(),
  }),
  tolerances: TolerancesSchema.optional(),
});

export type Scenario = z.infer<typeof ScenarioSchema>;


