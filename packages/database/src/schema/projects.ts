/**
 * Projects table schema
 */

import { pgTable, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    slugIdx: uniqueIndex('uq_projects_org_slug').on(table.organisationId, table.slug),
  };
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;


