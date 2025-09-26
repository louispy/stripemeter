-- Adjustments: add approval/revert workflow fields and indexes

ALTER TABLE adjustments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reverted_by TEXT,
  ADD COLUMN IF NOT EXISTS reverted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS parent_adjustment_id UUID,
  ADD COLUMN IF NOT EXISTS request_id TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT;

-- Simple status index for common queries
CREATE INDEX IF NOT EXISTS idx_adjustments_status ON adjustments (status, tenant_id);

-- Optional: weak FK to self (no constraint to avoid cross-migration constraints)
-- ALTER TABLE adjustments ADD CONSTRAINT fk_adjustments_parent FOREIGN KEY (parent_adjustment_id) REFERENCES adjustments(id);

-- Ensure audit_logs exists (created in base migration). No changes needed here, but retained for clarity.


