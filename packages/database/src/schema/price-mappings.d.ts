/**
 * Price mappings table schema - Maps metrics to Stripe prices
 */
export declare const priceMappings: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "price_mappings";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "price_mappings";
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
            tableName: "price_mappings";
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
            tableName: "price_mappings";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        aggregation: import("drizzle-orm/pg-core").PgColumn<{
            name: "aggregation";
            tableName: "price_mappings";
            dataType: "string";
            columnType: "PgText";
            data: "sum" | "max" | "last";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["sum", "max", "last"];
            baseColumn: never;
        }, {}, {}>;
        stripeAccount: import("drizzle-orm/pg-core").PgColumn<{
            name: "stripe_account";
            tableName: "price_mappings";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        priceId: import("drizzle-orm/pg-core").PgColumn<{
            name: "price_id";
            tableName: "price_mappings";
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
            tableName: "price_mappings";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        currency: import("drizzle-orm/pg-core").PgColumn<{
            name: "currency";
            tableName: "price_mappings";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        active: import("drizzle-orm/pg-core").PgColumn<{
            name: "active";
            tableName: "price_mappings";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export type PriceMapping = typeof priceMappings.$inferSelect;
export type NewPriceMapping = typeof priceMappings.$inferInsert;
//# sourceMappingURL=price-mappings.d.ts.map