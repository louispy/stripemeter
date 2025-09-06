/**
 * Database schema for simulation scenarios and runs
 */

import { pgTable, uuid, text, timestamp, jsonb, varchar, index, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Simulation scenarios - reusable pricing configurations for testing
 */
export const simulationScenarios = pgTable('simulation_scenarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  
  // Scenario metadata
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  version: varchar('version', { length: 50 }).notNull().default('1'),
  tags: jsonb('tags').$type<string[]>().default([]),
  
  // Scenario configuration
  model: jsonb('model').notNull(), // PriceConfig or reference to existing price
  inputs: jsonb('inputs').notNull(), // SimulationInput from pricing-lib
  expected: jsonb('expected'), // Expected results for validation
  tolerances: jsonb('tolerances'), // Tolerance thresholds for comparison
  
  // Management fields
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 255 }),
  updatedBy: varchar('updated_by', { length: 255 }),
}, (table) => ({
  tenantIdx: index('scenarios_tenant_idx').on(table.tenantId),
  nameIdx: index('scenarios_name_idx').on(table.name),
  activeIdx: index('scenarios_active_idx').on(table.active),
  createdAtIdx: index('scenarios_created_at_idx').on(table.createdAt),
}));

/**
 * Simulation runs - execution history and results
 */
export const simulationRuns = pgTable('simulation_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  scenarioId: uuid('scenario_id').references(() => simulationScenarios.id),
  
  // Run metadata
  name: varchar('name', { length: 255 }),
  description: text('description'),
  runType: varchar('run_type', { length: 50 }).notNull().default('manual'), // manual, scheduled, ci
  
  // Run configuration (snapshot of scenario at run time)
  scenarioSnapshot: jsonb('scenario_snapshot').notNull(),
  
  // Run status
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, running, completed, failed, cancelled
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),
  
  // Results
  result: jsonb('result'), // Invoice output from simulator
  comparison: jsonb('comparison'), // Diff against expected if provided
  passed: boolean('passed'), // Whether it matched expected results
  
  // Error handling
  error: jsonb('error'), // Error details if failed
  retryCount: integer('retry_count').notNull().default(0),
  
  // Metadata
  triggeredBy: varchar('triggered_by', { length: 255 }),
  metadata: jsonb('metadata'), // Additional context (e.g., CI build ID, commit hash)
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('runs_tenant_idx').on(table.tenantId),
  scenarioIdx: index('runs_scenario_idx').on(table.scenarioId),
  statusIdx: index('runs_status_idx').on(table.status),
  createdAtIdx: index('runs_created_at_idx').on(table.createdAt),
  runTypeIdx: index('runs_type_idx').on(table.runType),
}));

/**
 * Simulation run batches - group multiple runs together
 */
export const simulationBatches = pgTable('simulation_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Batch configuration
  scenarioIds: jsonb('scenario_ids').$type<string[]>().notNull(),
  totalRuns: integer('total_runs').notNull(),
  completedRuns: integer('completed_runs').notNull().default(0),
  failedRuns: integer('failed_runs').notNull().default(0),
  
  // Status
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  
  // Summary
  summary: jsonb('summary'), // Aggregated results
  
  createdBy: varchar('created_by', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('batches_tenant_idx').on(table.tenantId),
  statusIdx: index('batches_status_idx').on(table.status),
  createdAtIdx: index('batches_created_at_idx').on(table.createdAt),
}));

// Relations
export const scenarioRelations = relations(simulationScenarios, ({ many }) => ({
  runs: many(simulationRuns),
}));

export const runRelations = relations(simulationRuns, ({ one }) => ({
  scenario: one(simulationScenarios, {
    fields: [simulationRuns.scenarioId],
    references: [simulationScenarios.id],
  }),
}));

// Type exports
export type SimulationScenario = typeof simulationScenarios.$inferSelect;
export type NewSimulationScenario = typeof simulationScenarios.$inferInsert;
export type SimulationRun = typeof simulationRuns.$inferSelect;
export type NewSimulationRun = typeof simulationRuns.$inferInsert;
export type SimulationBatch = typeof simulationBatches.$inferSelect;
export type NewSimulationBatch = typeof simulationBatches.$inferInsert;

