/**
 * Alert configurations table schema - Defines alert rules and actions
 */
export declare const alertConfigs: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "alert_configs";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "alert_configs";
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
            tableName: "alert_configs";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        customerRef: import("drizzle-orm/pg-core").PgColumn<{
            name: "customer_ref";
            tableName: "alert_configs";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        metric: import("drizzle-orm/pg-core").PgColumn<{
            name: "metric";
            tableName: "alert_configs";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        type: import("drizzle-orm/pg-core").PgColumn<{
            name: "type";
            tableName: "alert_configs";
            dataType: "string";
            columnType: "PgText";
            data: "threshold" | "spike" | "budget";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["threshold", "spike", "budget"];
            baseColumn: never;
        }, {}, {}>;
        threshold: import("drizzle-orm/pg-core").PgColumn<{
            name: "threshold";
            tableName: "alert_configs";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        action: import("drizzle-orm/pg-core").PgColumn<{
            name: "action";
            tableName: "alert_configs";
            dataType: "string";
            columnType: "PgText";
            data: "email" | "webhook" | "slack" | "hard_cap" | "soft_cap";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["email", "webhook", "slack", "hard_cap", "soft_cap"];
            baseColumn: never;
        }, {}, {}>;
        config: import("drizzle-orm/pg-core").PgColumn<{
            name: "config";
            tableName: "alert_configs";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        enabled: import("drizzle-orm/pg-core").PgColumn<{
            name: "enabled";
            tableName: "alert_configs";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "alert_configs";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "alert_configs";
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
export declare const alertHistory: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "alert_history";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "alert_history";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        alertConfigId: import("drizzle-orm/pg-core").PgColumn<{
            name: "alert_config_id";
            tableName: "alert_history";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        tenantId: import("drizzle-orm/pg-core").PgColumn<{
            name: "tenant_id";
            tableName: "alert_history";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        customerRef: import("drizzle-orm/pg-core").PgColumn<{
            name: "customer_ref";
            tableName: "alert_history";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        metric: import("drizzle-orm/pg-core").PgColumn<{
            name: "metric";
            tableName: "alert_history";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        value: import("drizzle-orm/pg-core").PgColumn<{
            name: "value";
            tableName: "alert_history";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        threshold: import("drizzle-orm/pg-core").PgColumn<{
            name: "threshold";
            tableName: "alert_history";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        action: import("drizzle-orm/pg-core").PgColumn<{
            name: "action";
            tableName: "alert_history";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "alert_history";
            dataType: "string";
            columnType: "PgText";
            data: "resolved" | "triggered" | "acknowledged";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["triggered", "acknowledged", "resolved"];
            baseColumn: never;
        }, {}, {}>;
        metadata: import("drizzle-orm/pg-core").PgColumn<{
            name: "metadata";
            tableName: "alert_history";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        triggeredAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "triggered_at";
            tableName: "alert_history";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        acknowledgedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "acknowledged_at";
            tableName: "alert_history";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        resolvedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "resolved_at";
            tableName: "alert_history";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export type AlertConfig = typeof alertConfigs.$inferSelect;
export type NewAlertConfig = typeof alertConfigs.$inferInsert;
export type AlertHistory = typeof alertHistory.$inferSelect;
export type NewAlertHistory = typeof alertHistory.$inferInsert;
//# sourceMappingURL=alerts.d.ts.map