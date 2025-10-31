CREATE TABLE IF NOT EXISTS "alert_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"metric" text,
	"customer_ref" text,
	"alert_config_id" uuid,
	"status" text DEFAULT 'triggered' NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"title" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_alerts_tenant" ON "alert_states" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alerts_customer" ON "alert_states" ("tenant_id","customer_ref");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alerts_metric" ON "alert_states" ("tenant_id","metric");--> statement-breakpoint
