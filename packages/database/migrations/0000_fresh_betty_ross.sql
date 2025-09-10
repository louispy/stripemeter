CREATE TABLE IF NOT EXISTS "adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"metric" text NOT NULL,
	"customer_ref" text NOT NULL,
	"period_start" date NOT NULL,
	"delta" numeric(20, 6) NOT NULL,
	"reason" text NOT NULL,
	"actor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alert_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_ref" text,
	"metric" text,
	"type" text NOT NULL,
	"threshold" numeric(20, 6) NOT NULL,
	"action" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alert_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_config_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_ref" text,
	"metric" text,
	"value" numeric(20, 6) NOT NULL,
	"threshold" numeric(20, 6) NOT NULL,
	"action" text NOT NULL,
	"status" text DEFAULT 'triggered' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"triggered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"project_id" uuid,
	"secret_hash" text NOT NULL,
	"prefix" text NOT NULL,
	"last_four" text NOT NULL,
	"name" text NOT NULL,
	"scopes" text DEFAULT 'project:write,project:read' NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"project_id" uuid,
	"actor_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"ip" text,
	"user_agent" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "counters" (
	"tenant_id" uuid NOT NULL,
	"metric" text NOT NULL,
	"customer_ref" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"agg_sum" numeric(20, 6) DEFAULT '0' NOT NULL,
	"agg_max" numeric(20, 6) DEFAULT '0' NOT NULL,
	"agg_last" numeric(20, 6),
	"watermark_ts" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "counters_tenant_id_metric_customer_ref_period_start_pk" PRIMARY KEY("tenant_id","metric","customer_ref","period_start")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"idempotency_key" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"metric" text NOT NULL,
	"customer_ref" text NOT NULL,
	"resource_id" text,
	"quantity" numeric(20, 6) NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" text DEFAULT 'http' NOT NULL,
	"inserted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"metric" text NOT NULL,
	"aggregation" text NOT NULL,
	"stripe_account" text NOT NULL,
	"price_id" text NOT NULL,
	"subscription_item_id" text,
	"currency" text,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "unique_active_mapping" UNIQUE NULLS NOT DISTINCT("tenant_id","metric","active")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "write_log" (
	"tenant_id" uuid NOT NULL,
	"stripe_account" text NOT NULL,
	"subscription_item_id" text NOT NULL,
	"period_start" date NOT NULL,
	"pushed_total" numeric(20, 6) DEFAULT '0' NOT NULL,
	"last_request_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "write_log_tenant_id_stripe_account_subscription_item_id_period_start_pk" PRIMARY KEY("tenant_id","stripe_account","subscription_item_id","period_start")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reconciliation_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"subscription_item_id" text NOT NULL,
	"period_start" date NOT NULL,
	"local_total" numeric(20, 6) NOT NULL,
	"stripe_total" numeric(20, 6) NOT NULL,
	"diff" numeric(20, 6) NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulation_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"scenario_ids" jsonb NOT NULL,
	"total_runs" integer NOT NULL,
	"completed_runs" integer DEFAULT 0 NOT NULL,
	"failed_runs" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"summary" jsonb,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"scenario_id" uuid,
	"name" varchar(255),
	"description" text,
	"run_type" varchar(50) DEFAULT 'manual' NOT NULL,
	"scenario_snapshot" jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" integer,
	"result" jsonb,
	"comparison" jsonb,
	"passed" boolean,
	"error" jsonb,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"triggered_by" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulation_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"version" varchar(50) DEFAULT '1' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"model" jsonb NOT NULL,
	"inputs" jsonb NOT NULL,
	"expected" jsonb,
	"tolerances" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"updated_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_members" (
	"organisation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_members_organisation_id_user_id_pk" PRIMARY KEY("organisation_id","user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_adjustments_tenant_period" ON "adjustments" ("tenant_id","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_adjustments_tenant_customer" ON "adjustments" ("tenant_id","customer_ref");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alert_configs_tenant" ON "alert_configs" ("tenant_id","enabled");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alert_configs_customer" ON "alert_configs" ("tenant_id","customer_ref","enabled");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alert_configs_metric" ON "alert_configs" ("tenant_id","metric","enabled");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alert_history_tenant" ON "alert_history" ("tenant_id","triggered_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alert_history_status" ON "alert_history" ("status","tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_keys_org" ON "api_keys" ("organisation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_keys_project" ON "api_keys" ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_api_keys_org_name" ON "api_keys" ("organisation_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_org" ON "audit_logs" ("organisation_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_project" ON "audit_logs" ("project_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_counters_tenant_period" ON "counters" ("tenant_id","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_counters_customer" ON "counters" ("tenant_id","customer_ref","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_events_tenant_metric_customer_ts" ON "events" ("tenant_id","metric","customer_ref","ts");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_events_tenant_ts" ON "events" ("tenant_id","ts");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_mappings_tenant" ON "price_mappings" ("tenant_id","active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_mappings_metric" ON "price_mappings" ("tenant_id","metric","active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_write_log_tenant" ON "write_log" ("tenant_id","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_write_log_subscription_item" ON "write_log" ("subscription_item_id","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reconciliation_tenant_period" ON "reconciliation_reports" ("tenant_id","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reconciliation_status" ON "reconciliation_reports" ("status","tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reconciliation_subscription_item" ON "reconciliation_reports" ("subscription_item_id","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_tenant_idx" ON "simulation_batches" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_status_idx" ON "simulation_batches" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_created_at_idx" ON "simulation_batches" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "runs_tenant_idx" ON "simulation_runs" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "runs_scenario_idx" ON "simulation_runs" ("scenario_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "runs_status_idx" ON "simulation_runs" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "runs_created_at_idx" ON "simulation_runs" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "runs_type_idx" ON "simulation_runs" ("run_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scenarios_tenant_idx" ON "simulation_scenarios" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scenarios_name_idx" ON "simulation_scenarios" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scenarios_active_idx" ON "simulation_scenarios" ("active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scenarios_created_at_idx" ON "simulation_scenarios" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_organisations_slug" ON "organisations" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_projects_org_slug" ON "projects" ("organisation_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_org_members_org" ON "org_members" ("organisation_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_alert_config_id_alert_configs_id_fk" FOREIGN KEY ("alert_config_id") REFERENCES "alert_configs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_scenario_id_simulation_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "simulation_scenarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
