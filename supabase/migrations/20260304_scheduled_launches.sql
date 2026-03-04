-- Migration: Create scheduled_launches table for Ghost Engine scheduling
-- @file 20260304_scheduled_launches.sql
-- @summary Database schema for scheduled token launches

CREATE TABLE IF NOT EXISTS scheduled_launches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_wallet TEXT NOT NULL,
  serialized_bundle TEXT NOT NULL,
  bundle_addresses JSONB NOT NULL,
  launch_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  jito_tip_lamports BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  signature TEXT,
  error_message TEXT,

  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  )
);

-- Index for cron job queries (pending launches due for execution)
CREATE INDEX IF NOT EXISTS idx_pending_launches
  ON scheduled_launches (launch_at)
  WHERE status = 'pending';

-- Index for wallet lookups
CREATE INDEX IF NOT EXISTS idx_creator_wallet
  ON scheduled_launches (creator_wallet);

-- Enable Row Level Security
ALTER TABLE scheduled_launches ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own launches
CREATE POLICY "Users can view own launches"
  ON scheduled_launches FOR SELECT
  USING (creator_wallet = auth.jwt() ->> 'wallet_address');

-- RLS Policy: Users can insert their own launches
CREATE POLICY "Users can insert own launches"
  ON scheduled_launches FOR INSERT
  WITH CHECK (creator_wallet = auth.jwt() ->> 'wallet_address');

-- RLS Policy: Users can update their own launches
CREATE POLICY "Users can update own launches"
  ON scheduled_launches FOR UPDATE
  USING (creator_wallet = auth.jwt() ->> 'wallet_address');

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_launches_updated_at
  BEFORE UPDATE ON scheduled_launches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
