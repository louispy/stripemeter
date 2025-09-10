/**
 * Audit logs schema
 */

import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull(),
  projectId: uuid('project_id'),
  actorType: text('actor_type').notNull(), // api_key | user | system
  actorId: text('actor_id').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  meta: jsonb('meta').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    orgIdx: index('idx_audit_logs_org').on(table.organisationId, table.createdAt),
    projectIdx: index('idx_audit_logs_project').on(table.projectId, table.createdAt),
  };
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;


