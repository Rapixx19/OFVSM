-- =============================================================================
-- user_wallets: Multi-wallet management with signature-based verification
-- =============================================================================

CREATE TABLE user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  label TEXT DEFAULT 'Alt Wallet',
  is_main BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  nonce TEXT,  -- For verification handshake
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_wallet_per_profile UNIQUE (profile_id, wallet_address)
);

-- Performance indexes
CREATE INDEX idx_user_wallets_profile ON user_wallets (profile_id);
CREATE INDEX idx_user_wallets_verified ON user_wallets (profile_id, is_verified);

-- =============================================================================
-- Row Level Security Policies
-- =============================================================================
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

-- Users can view their own wallets
CREATE POLICY "Users can view own wallets"
  ON user_wallets FOR SELECT
  USING (profile_id = auth.uid());

-- Users can insert their own wallets
CREATE POLICY "Users can insert own wallets"
  ON user_wallets FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Users can update their own wallets
CREATE POLICY "Users can update own wallets"
  ON user_wallets FOR UPDATE
  USING (profile_id = auth.uid());

-- Users can delete their own wallets
CREATE POLICY "Users can delete own wallets"
  ON user_wallets FOR DELETE
  USING (profile_id = auth.uid());
