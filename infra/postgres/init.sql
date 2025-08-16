-- Initialize StripeMeter database
-- This script runs automatically when the PostgreSQL container starts

-- Create database if not exists (handled by Docker environment variables)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE event_source AS ENUM ('sdk', 'http', 'etl', 'import', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE aggregation_type AS ENUM ('sum', 'max', 'last');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reconciliation_status AS ENUM ('ok', 'investigate', 'resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE adjustment_reason AS ENUM ('backfill', 'correction', 'promo', 'credit', 'manual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_type AS ENUM ('threshold', 'spike', 'budget');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_action AS ENUM ('email', 'webhook', 'slack', 'hard_cap', 'soft_cap');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_status AS ENUM ('triggered', 'acknowledged', 'resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Grant permissions to the application user
GRANT ALL PRIVILEGES ON DATABASE stripemeter TO stripemeter;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO stripemeter;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO stripemeter;

-- Create partitioning function for events table (monthly partitions)
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    start_date date;
    end_date date;
    partition_name text;
BEGIN
    -- Create partitions for the current month and next 3 months
    FOR i IN 0..3 LOOP
        start_date := date_trunc('month', CURRENT_DATE + (i || ' month')::interval);
        end_date := start_date + interval '1 month';
        partition_name := 'events_' || to_char(start_date, 'YYYY_MM');
        
        -- Check if partition exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_class 
            WHERE relname = partition_name
        ) THEN
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS %I PARTITION OF events 
                FOR VALUES FROM (%L) TO (%L)',
                partition_name, start_date, end_date
            );
            RAISE NOTICE 'Created partition: %', partition_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to create new partitions (requires pg_cron extension)
-- Uncomment if pg_cron is available:
-- SELECT cron.schedule('create-partitions', '0 0 1 * *', 'SELECT create_monthly_partition();');

-- Create initial partitions
-- Note: This will be called after the tables are created by Drizzle migrations

-- Performance indexes (additional to those created by Drizzle)
-- These will be created after the tables exist

-- Sample data for development (only in dev environment)
-- Uncomment for development:
/*
INSERT INTO events (idempotency_key, tenant_id, metric, customer_ref, quantity, ts, meta, source)
VALUES 
    ('evt_sample_001', '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 'api_calls', 'cus_TEST001', 100, NOW() - INTERVAL '1 hour', '{"endpoint": "/v1/test"}', 'system'),
    ('evt_sample_002', '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 'api_calls', 'cus_TEST001', 150, NOW() - INTERVAL '30 minutes', '{"endpoint": "/v1/test"}', 'system'),
    ('evt_sample_003', '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 'gb_storage', 'cus_TEST001', 2.5, NOW() - INTERVAL '2 hours', '{}', 'system')
ON CONFLICT DO NOTHING;
*/
