/**
 * Simulation assertions - granular differences captured per run
 */

import { pgTable, uuid, text, timestamp, jsonb, boolean, numeric, index } from 'drizzle-orm/pg-core';

export const simulationAssertions = pgTable('simulation_assertions', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').notNull(),

  field: text('field').notNull(),
  expected: jsonb('expected'),
  actual: jsonb('actual'),
  difference: numeric('difference', { precision: 20, scale: 6 }),
  passed: boolean('passed').notNull().default(false),

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  runIdx: index('assertions_run_idx').on(table.runId),
}));

export type SimulationAssertion = typeof simulationAssertions.$inferSelect;
export type NewSimulationAssertion = typeof simulationAssertions.$inferInsert;


