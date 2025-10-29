-- Add simulation assertions table for granular differences
CREATE TABLE IF NOT EXISTS simulation_assertions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  expected JSONB,
  actual JSONB,
  difference NUMERIC(20,6),
  passed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for quick lookup by run
CREATE INDEX assertions_run_idx ON simulation_assertions(run_id);


