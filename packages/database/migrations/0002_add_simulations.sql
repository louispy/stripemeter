-- Add simulation scenarios table
CREATE TABLE IF NOT EXISTS simulation_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- Scenario metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL DEFAULT '1',
  tags JSONB DEFAULT '[]'::jsonb,
  
  -- Scenario configuration
  model JSONB NOT NULL,
  inputs JSONB NOT NULL,
  expected JSONB,
  tolerances JSONB,
  
  -- Management fields
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);

-- Add indexes for scenarios
CREATE INDEX scenarios_tenant_idx ON simulation_scenarios(tenant_id);
CREATE INDEX scenarios_name_idx ON simulation_scenarios(name);
CREATE INDEX scenarios_active_idx ON simulation_scenarios(active);
CREATE INDEX scenarios_created_at_idx ON simulation_scenarios(created_at);

-- Add simulation runs table
CREATE TABLE IF NOT EXISTS simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  scenario_id UUID REFERENCES simulation_scenarios(id),
  
  -- Run metadata
  name VARCHAR(255),
  description TEXT,
  run_type VARCHAR(50) NOT NULL DEFAULT 'manual',
  
  -- Run configuration
  scenario_snapshot JSONB NOT NULL,
  
  -- Run status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  
  -- Results
  result JSONB,
  comparison JSONB,
  passed BOOLEAN,
  
  -- Error handling
  error JSONB,
  retry_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  triggered_by VARCHAR(255),
  metadata JSONB,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes for runs
CREATE INDEX runs_tenant_idx ON simulation_runs(tenant_id);
CREATE INDEX runs_scenario_idx ON simulation_runs(scenario_id);
CREATE INDEX runs_status_idx ON simulation_runs(status);
CREATE INDEX runs_created_at_idx ON simulation_runs(created_at);
CREATE INDEX runs_type_idx ON simulation_runs(run_type);

-- Add simulation batches table
CREATE TABLE IF NOT EXISTS simulation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Batch configuration
  scenario_ids JSONB NOT NULL,
  total_runs INTEGER NOT NULL,
  completed_runs INTEGER NOT NULL DEFAULT 0,
  failed_runs INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Summary
  summary JSONB,
  
  created_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes for batches
CREATE INDEX batches_tenant_idx ON simulation_batches(tenant_id);
CREATE INDEX batches_status_idx ON simulation_batches(status);
CREATE INDEX batches_created_at_idx ON simulation_batches(created_at);

