-- Migration: Add execution parameters for Strategist Agent
-- @file 20260305_execution_params.sql
-- @summary Add market-aware execution columns to scheduled_launches

-- Add execution type column
ALTER TABLE scheduled_launches
ADD COLUMN execution_type TEXT NOT NULL DEFAULT 'timestamp';

-- Add execution params column (thresholds for market evaluation)
ALTER TABLE scheduled_launches
ADD COLUMN execution_params JSONB DEFAULT '{}';

-- Add last evaluation column (stores latest market condition check)
ALTER TABLE scheduled_launches
ADD COLUMN last_evaluation JSONB;

-- Update status constraint to include 'waiting'
ALTER TABLE scheduled_launches
DROP CONSTRAINT valid_status;

ALTER TABLE scheduled_launches
ADD CONSTRAINT valid_status CHECK (
  status IN ('pending', 'waiting', 'processing', 'completed', 'failed', 'cancelled')
);

-- Add constraint for execution type values
ALTER TABLE scheduled_launches
ADD CONSTRAINT valid_execution_type CHECK (
  execution_type IN ('immediate', 'timestamp', 'market_optimized')
);

-- Index for waiting launches (market-optimized launches waiting for conditions)
CREATE INDEX IF NOT EXISTS idx_waiting_launches
  ON scheduled_launches (created_at)
  WHERE status = 'waiting';

-- Comment for documentation
COMMENT ON COLUMN scheduled_launches.execution_type IS
  'Launch execution strategy: immediate, timestamp, or market_optimized';
COMMENT ON COLUMN scheduled_launches.execution_params IS
  'JSON params: maxWaitHours, priorityFeeThreshold, congestionThreshold';
COMMENT ON COLUMN scheduled_launches.last_evaluation IS
  'Last market condition evaluation result for market_optimized launches';
