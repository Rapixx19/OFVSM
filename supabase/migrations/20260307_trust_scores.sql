-- Migration: Add trust score columns to safety_events
-- @file 20260307_trust_scores.sql
-- @summary Extend safety_events with Sentinel Auditor trust scores

-- Add trust score columns
ALTER TABLE safety_events
ADD COLUMN final_score INTEGER;

ALTER TABLE safety_events
ADD COLUMN pillar_breakdown JSONB;

ALTER TABLE safety_events
ADD COLUMN audit_timestamp TIMESTAMPTZ;

-- Add constraint for valid score range
ALTER TABLE safety_events
ADD CONSTRAINT valid_trust_score CHECK (
  final_score IS NULL OR (final_score >= 0 AND final_score <= 100)
);

-- Update event type constraint to include audit events
ALTER TABLE safety_events
DROP CONSTRAINT valid_event_type;

ALTER TABLE safety_events
ADD CONSTRAINT valid_event_type CHECK (
  type IN (
    'lock_confirmed',
    'expiring_soon',
    'lock_extended',
    'unlock_detected',
    'audit_requested',
    'audit_completed'
  )
);

-- Index for score-based queries
CREATE INDEX IF NOT EXISTS idx_safety_events_score
  ON safety_events (final_score)
  WHERE final_score IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN safety_events.final_score IS 'Sentinel trust score (0-100)';
COMMENT ON COLUMN safety_events.pillar_breakdown IS 'JSON breakdown of 4 pillar scores';
COMMENT ON COLUMN safety_events.audit_timestamp IS 'When the audit was performed';
