/**
 * Roles & memberships schema
 */

import { pgTable, uuid, text, timestamp, index, primaryKey } from 'drizzle-orm/pg-core';

export const orgMembers = pgTable('org_members', {
  organisationId: uuid('organisation_id').notNull(),
  userId: uuid('user_id').notNull(),
  role: text('role').notNull(), // owner | maintainer | viewer
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.organisationId, table.userId] }),
    orgIdx: index('idx_org_members_org').on(table.organisationId),
  };
});

export type OrgMember = typeof orgMembers.$inferSelect;
export type NewOrgMember = typeof orgMembers.$inferInsert;


