/**
 * API Keys table schema
 */

import { pgTable, uuid, text, timestamp, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull(),
  projectId: uuid('project_id'),
  // Stored as HMAC(keyId + secret) or a hashed secret with per-key salt
  secretHash: text('secret_hash').notNull(),
  prefix: text('prefix').notNull(),
  lastFour: text('last_four').notNull(),
  name: text('name').notNull(),
  scopes: text('scopes').notNull().default('project:write,project:read'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  active: boolean('active').notNull().default(true),
}, (table) => {
  return {
    orgIdx: index('idx_api_keys_org').on(table.organisationId),
    projectIdx: index('idx_api_keys_project').on(table.projectId),
    // Optional uniqueness on (org, name)
    orgNameUq: uniqueIndex('uq_api_keys_org_name').on(table.organisationId, table.name),
  };
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;


