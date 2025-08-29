/**
 * Adjustments table schema - Non-destructive corrections to usage
 */
export declare const adjustments: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "adjustments";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "adjustments";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        tenantId: import("drizzle-orm/pg-core").PgColumn<{
            name: "tenant_id";
            tableName: "adjustments";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        metric: import("drizzle-orm/pg-core").PgColumn<{
            name: "metric";
            tableName: "adjustments";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        customerRef: import("drizzle-orm/pg-core").PgColumn<{
            name: "customer_ref";
            tableName: "adjustments";
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
            tableName: "adjustments";
            dataType: "string";
            columnType: "PgDateString";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        delta: import("drizzle-orm/pg-core").PgColumn<{
            name: "delta";
            tableName: "adjustments";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reason: import("drizzle-orm/pg-core").PgColumn<{
            name: "reason";
            tableName: "adjustments";
            dataType: "string";
            columnType: "PgText";
            data: "backfill" | "correction" | "promo" | "credit" | "manual";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["backfill", "correction", "promo", "credit", "manual"];
            baseColumn: never;
        }, {}, {}>;
        actor: import("drizzle-orm/pg-core").PgColumn<{
            name: "actor";
            tableName: "adjustments";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "adjustments";
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
export type Adjustment = typeof adjustments.$inferSelect;
export type NewAdjustment = typeof adjustments.$inferInsert;
//# sourceMappingURL=adjustments.d.ts.map