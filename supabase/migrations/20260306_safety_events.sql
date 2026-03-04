-- Migration: Create safety_events table for Sentinel Agent
-- @file 20260306_safety_events.sql
-- @summary Security event audit log for lock verification tracking

CREATE TABLE safety_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  token_mint TEXT NOT NULL,
  creator_wallet TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_event_type CHECK (
    type IN ('lock_confirmed', 'expiring_soon', 'lock_extended', 'unlock_detected')
  )
);

-- Index for looking up events by token
CREATE INDEX idx_safety_events_token ON safety_events (token_mint);

-- Index for filtering by event type
CREATE INDEX idx_safety_events_type ON safety_events (type);

-- Index for chronological queries
CREATE INDEX idx_safety_events_created ON safety_events (created_at DESC);

-- Comments for documentation
COMMENT ON TABLE safety_events IS 'Audit log of security events for lock verification';
COMMENT ON COLUMN safety_events.type IS 'Event type: lock_confirmed, expiring_soon, lock_extended, unlock_detected';
COMMENT ON COLUMN safety_events.token_mint IS 'The token mint address being monitored';
COMMENT ON COLUMN safety_events.creator_wallet IS 'Wallet address of the lock creator';
COMMENT ON COLUMN safety_events.details IS 'Additional event metadata (lock duration, amount, etc.)';
