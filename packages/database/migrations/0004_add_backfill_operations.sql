-- Create backfill_operations table
CREATE TABLE IF NOT EXISTS "backfill_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"metric" text NOT NULL,
	"customer_ref" text,
	"period_start" text NOT NULL,
	"period_end" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text NOT NULL,
	"actor" text NOT NULL,
	"total_events" integer DEFAULT 0,
	"processed_events" integer DEFAULT 0,
	"failed_events" integer DEFAULT 0,
	"duplicate_events" integer DEFAULT 0,
	"source_type" text NOT NULL,
	"source_data" text,
	"source_url" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "idx_backfill_operations_tenant" ON "backfill_operations" ("tenant_id","created_at");
CREATE INDEX IF NOT EXISTS "idx_backfill_operations_status" ON "backfill_operations" ("status","created_at");
CREATE INDEX IF NOT EXISTS "idx_backfill_operations_period" ON "backfill_operations" ("tenant_id","period_start","period_end");

-- Add constraint for status enum
ALTER TABLE "backfill_operations" ADD CONSTRAINT "backfill_operations_status_check" CHECK ("status" IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));

-- Add constraint for source_type enum
ALTER TABLE "backfill_operations" ADD CONSTRAINT "backfill_operations_source_type_check" CHECK ("source_type" IN ('json', 'csv', 'api'));
