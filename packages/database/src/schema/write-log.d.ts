/**
 * Write log table schema - Tracks what has been pushed to Stripe
 */
export declare const writeLog: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "write_log";
    schema: undefined;
    columns: {
        tenantId: import("drizzle-orm/pg-core").PgColumn<{
            name: "tenant_id";
            tableName: "write_log";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        stripeAccount: import("drizzle-orm/pg-core").PgColumn<{
            name: "stripe_account";
            tableName: "write_log";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        subscriptionItemId: import("drizzle-orm/pg-core").PgColumn<{
            name: "subscription_item_id";
            tableName: "write_log";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        periodStart: import("drizzle-orm/pg-core").PgColumn<{
            name: "period_start";
            tableName: "write_log";
            dataType: "string";
            columnType: "PgDateString";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        pushedTotal: import("drizzle-orm/pg-core").PgColumn<{
            name: "pushed_total";
            tableName: "write_log";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        lastRequestId: import("drizzle-orm/pg-core").PgColumn<{
            name: "last_request_id";
            tableName: "write_log";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "write_log";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export type WriteLog = typeof writeLog.$inferSelect;
export type NewWriteLog = typeof writeLog.$inferInsert;
//# sourceMappingURL=write-log.d.ts.map