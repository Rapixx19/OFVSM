# Phase 4: Orchestration (Scheduler & Speed Mode) - Implementation Plan

## Overview
Implement scheduled token launches and session-key-based speed mode for reduced wallet friction.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Orchestration Layer                          │
├─────────────────────────────────────────────────────────────────────┤
│  LaunchScheduler (Red Zone)          │  SpeedMode (Yellow Zone)     │
│  ┌─────────────────────────────┐    │  ┌─────────────────────────┐ │
│  │ Supabase scheduled_launches │    │  │ Ephemeral Ed25519 Key   │ │
│  │ - serialized bundle         │    │  │ - IndexedDB storage     │ │
│  │ - launch_at timestamp       │    │  │ - 24h expiry            │ │
│  │ - status tracking           │    │  └─────────────────────────┘ │
│  └─────────────────────────────┘    │  ┌─────────────────────────┐ │
│  ┌─────────────────────────────┐    │  │ Session PDA (on-chain)  │ │
│  │ Edge Function (cron)        │    │  │ - 0.05 SOL cap          │ │
│  │ - check due launches        │    │  │ - authorized operations │ │
│  │ - submit via Jito           │    │  └─────────────────────────┘ │
│  └─────────────────────────────┘    │                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Dependencies to Install

```bash
npm install idb uuid
npm install -D @types/uuid
```

## Implementation Order

### Phase 4A: Types & Database Schema

| Order | File | Purpose | Lines |
|-------|------|---------|-------|
| 1 | `src/features/orchestrator/types/scheduler.ts` | Scheduled launch types | ~60 |
| 2 | `src/features/orchestrator/types/speedMode.ts` | Session key types | ~50 |
| 3 | `supabase/migrations/scheduled_launches.sql` | Database schema | ~40 |

### Phase 4B: Scheduler Service (Red Zone)

| Order | File | Purpose | Lines |
|-------|------|---------|-------|
| 4 | `src/features/orchestrator/services/schedulerDb.ts` | Supabase CRUD operations | ~80 |
| 5 | `src/features/orchestrator/services/LaunchScheduler.ts` | Main scheduler orchestrator | ~100 |
| 6 | `supabase/functions/launch-cron/index.ts` | Edge function for cron | ~80 |

### Phase 4C: Speed Mode (Yellow Zone)

| Order | File | Purpose | Lines |
|-------|------|---------|-------|
| 7 | `src/features/orchestrator/services/keyStorage.ts` | IndexedDB key management | ~70 |
| 8 | `src/features/orchestrator/services/sessionPda.ts` | On-chain session PDA | ~90 |
| 9 | `src/features/orchestrator/hooks/useSpeedMode.ts` | Speed mode hook | ~100 |

### Phase 4D: UI Components (Green Zone)

| Order | File | Purpose | Lines |
|-------|------|---------|-------|
| 10 | `src/components/features/orchestrator/ScheduleToggle.tsx` | Calendar picker | ~120 |
| 11 | `src/components/features/orchestrator/SpeedGauge.tsx` | Session cap meter | ~80 |
| 12 | `src/components/features/orchestrator/SpeedModeToggle.tsx` | Header toggle | ~60 |

### Phase 4E: Integration & Testing

| Order | File | Purpose | Lines |
|-------|------|---------|-------|
| 13 | `src/features/orchestrator/__tests__/scheduler.test.ts` | Scheduler tests | ~120 |
| 14 | `src/features/orchestrator/__tests__/speedMode.test.ts` | Speed mode tests | ~100 |

## Key Interfaces

### Scheduler Types (`scheduler.ts`)
```typescript
export type LaunchStatus =
  | 'pending'      // Waiting for scheduled time
  | 'processing'   // Being submitted
  | 'completed'    // Successfully landed
  | 'failed'       // Submission failed
  | 'cancelled';   // User cancelled

export interface ScheduledLaunch {
  id: string;
  creatorWallet: string;
  serializedBundle: string;      // Base64 VersionedTransaction
  bundleAddresses: BundleAddresses;
  launchAt: Date;
  status: LaunchStatus;
  jitoTipLamports: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  signature?: string;
  errorMessage?: string;
}

export interface ScheduleLaunchParams {
  bundle: BuiltBundle;
  launchAt: Date;
  jitoTipLamports: number;
}
```

### Speed Mode Types (`speedMode.ts`)
```typescript
export interface SessionKey {
  publicKey: string;
  secretKey: Uint8Array;  // Stored encrypted in IndexedDB
  createdAt: number;
  expiresAt: number;      // 24 hours from creation
  solCapLamports: number; // Default 0.05 SOL
  usedLamports: number;
}

export interface SessionPdaAccount {
  authority: PublicKey;      // Main wallet
  sessionKey: PublicKey;     // Ephemeral key
  solCap: BN;
  spent: BN;
  expiresAt: BN;
  bump: number;
}

export interface SpeedModeState {
  isEnabled: boolean;
  sessionKey: SessionKey | null;
  remainingCapSol: number;
  expiresIn: number;         // Seconds
}
```

### LaunchScheduler Service
```typescript
export class LaunchScheduler {
  constructor(supabase: SupabaseClient, connection: Connection);

  // Schedule a launch
  async scheduleLaunch(params: ScheduleLaunchParams): Promise<ScheduledLaunch>;

  // Cancel a pending launch
  async cancelLaunch(id: string): Promise<void>;

  // Get launches for a wallet
  async getLaunches(wallet: string): Promise<ScheduledLaunch[]>;

  // Update launch status (used by edge function)
  async updateStatus(id: string, status: LaunchStatus, meta?: object): Promise<void>;
}
```

### useSpeedMode Hook
```typescript
export function useSpeedMode(): {
  // State
  isEnabled: boolean;
  isLoading: boolean;
  sessionKey: SessionKey | null;
  remainingCapSol: number;
  expiresIn: number;
  error: Error | null;

  // Actions
  enableSpeedMode: (solCap?: number) => Promise<void>;
  disableSpeedMode: () => Promise<void>;
  getSessionSigner: () => Keypair | null;
  refreshSession: () => Promise<void>;
};
```

## Database Schema

### scheduled_launches Table
```sql
CREATE TABLE scheduled_launches (
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

-- Index for cron job queries
CREATE INDEX idx_pending_launches
  ON scheduled_launches (launch_at)
  WHERE status = 'pending';

-- RLS: Users can only see their own launches
ALTER TABLE scheduled_launches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own launches"
  ON scheduled_launches FOR SELECT
  USING (creator_wallet = auth.jwt() ->> 'wallet_address');

CREATE POLICY "Users can insert own launches"
  ON scheduled_launches FOR INSERT
  WITH CHECK (creator_wallet = auth.jwt() ->> 'wallet_address');

CREATE POLICY "Users can update own launches"
  ON scheduled_launches FOR UPDATE
  USING (creator_wallet = auth.jwt() ->> 'wallet_address');
```

## Edge Function (Cron)

```typescript
// supabase/functions/launch-cron/index.ts
// Runs every minute via pg_cron

Deno.serve(async () => {
  // 1. Query pending launches where launch_at <= now
  // 2. Mark as 'processing'
  // 3. Deserialize bundle
  // 4. Submit via Jito relayer
  // 5. Update status to 'completed' or 'failed'
});
```

## IndexedDB Schema (Speed Mode)

```typescript
// Database: vecterai-speed-mode
// Object Store: session-keys

interface StoredSessionKey {
  id: 'current';  // Single active session
  publicKey: string;
  encryptedSecretKey: ArrayBuffer;  // Encrypted with wallet signature
  createdAt: number;
  expiresAt: number;
  solCapLamports: number;
  usedLamports: number;
}
```

## Session PDA Seeds

```rust
// On-chain program (future implementation)
const SESSION_SEED: &[u8] = b"session";

// PDA: [SESSION_SEED, authority.key(), session_key.key()]
```

## Security Considerations

### Scheduler (Red Zone)
1. **Bundle Validation**: Re-validate bundle before submission
2. **RLS Policies**: Users can only manage their own launches
3. **Rate Limiting**: Max 5 pending launches per wallet
4. **Expiry**: Auto-cancel launches older than 7 days

### Speed Mode (Yellow Zone)
1. **SOL Cap**: Hard limit on session key spending (0.05 SOL default)
2. **Time Limit**: 24-hour automatic expiry
3. **Key Encryption**: Secret key encrypted in IndexedDB
4. **Revocation**: Main wallet can revoke session instantly

## UI Components

### ScheduleToggle
- Calendar picker with time selection
- Shows upcoming launches
- Quick presets: "Peak Hours", "Low Gas", "Custom"
- Timezone display

### SpeedGauge
- Circular progress showing remaining cap
- Color coding: green > 50%, yellow 20-50%, red < 20%
- Time remaining countdown
- Click to expand details

### SpeedModeToggle
- Simple toggle in header
- Lightning bolt icon when active
- Tooltip showing remaining cap/time

## Testing Strategy

### scheduler.test.ts
```typescript
describe('LaunchScheduler', () => {
  it('serializes and deserializes bundle correctly');
  it('stores scheduled launch in database');
  it('retrieves pending launches for wallet');
  it('updates status on completion');
  it('handles failed submissions gracefully');
});
```

### speedMode.test.ts
```typescript
describe('useSpeedMode', () => {
  it('generates ephemeral keypair');
  it('stores key in IndexedDB');
  it('tracks spending against cap');
  it('expires after 24 hours');
  it('clears session on disable');
});
```

## Environment Variables

```bash
# Add to .env.local
NEXT_PUBLIC_JITO_RELAYER_URL=https://mainnet.block-engine.jito.wtf
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For edge function
```

## Verification Checklist

- [ ] scheduled_launches table created with RLS
- [ ] Edge function deployed and running
- [ ] IndexedDB key storage working
- [ ] Speed mode toggle in header
- [ ] Schedule picker integrated with GhostStepper
- [ ] All tests passing
- [ ] No files over 150 lines
