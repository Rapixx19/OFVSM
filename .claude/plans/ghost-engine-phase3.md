# Phase 3: The Ghost Engine (Atomic Bundling) - Implementation Plan

## Overview
Implement atomic token launch bundling with Jito Block Engine integration. All 6 operations execute atomically - if any fails, the entire launch reverts.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GhostBundler (Yellow Zone)                │
├─────────────────────────────────────────────────────────────┤
│  VersionedTransaction (Atomic Bundle)                        │
│  ┌─────────────┬─────────────┬─────────────┬──────────────┐ │
│  │ createMint  │ createPool  │ addLiquidity│ revokeAuth   │ │
│  │ Token-2022  │ Raydium CPMM│             │ Mint+Freeze  │ │
│  └─────────────┴─────────────┴─────────────┴──────────────┘ │
│  ┌─────────────┬─────────────────────────────────────────┐  │
│  │ lockLp      │ systemTransfer (VECTERAI Fee)           │  │
│  │ 90-day min  │                                         │  │
│  └─────────────┴─────────────────────────────────────────┘  │
│                          ↓                                   │
│              Jito Block Engine (Bundle Submission)           │
└─────────────────────────────────────────────────────────────┘
```

## Dependencies to Install

```bash
npm install @jito-foundation/jito-ts @metaplex-foundation/mpl-token-metadata
```

## Implementation Order

### Phase 3A: Core Types & Constants

| Order | File | Purpose |
|-------|------|---------|
| 1 | `src/features/launcher/types/ghost.ts` | Launch params, bundle config types |
| 2 | `src/features/launcher/constants/addresses.ts` | Program IDs, fee wallet, tip accounts |

### Phase 3B: Instruction Builders

| Order | File | Purpose |
|-------|------|---------|
| 3 | `src/features/launcher/instructions/createMint.ts` | Token-2022 mint + metadata |
| 4 | `src/features/launcher/instructions/createPool.ts` | Raydium CPMM pool creation |
| 5 | `src/features/launcher/instructions/addLiquidity.ts` | Initial liquidity deposit |
| 6 | `src/features/launcher/instructions/revokeAuthority.ts` | Revoke mint & freeze auth |
| 7 | `src/features/launcher/instructions/platformFee.ts` | VECTERAI fee transfer |

### Phase 3C: Bundle Orchestrator

| Order | File | Purpose |
|-------|------|---------|
| 8 | `src/features/launcher/services/GhostBundler.ts` | Main orchestrator + Jito integration |

### Phase 3D: UI Components

| Order | File | Purpose |
|-------|------|---------|
| 9 | `src/features/launcher/hooks/useGhostLaunch.ts` | Launch state management hook |
| 10 | `src/components/features/launcher/steps/BrandingStep.tsx` | Step 1: Name, Symbol, Image |
| 11 | `src/components/features/launcher/steps/EconomicsStep.tsx` | Step 2: SOL Liquidity Slider |
| 12 | `src/components/features/launcher/steps/ReviewStep.tsx` | Step 3: Fee breakdown + Jito toggle |
| 13 | `src/components/features/launcher/GhostStepper.tsx` | Main stepper container |

### Phase 3E: Testing

| Order | File | Purpose |
|-------|------|---------|
| 14 | `src/features/launcher/__tests__/ghost-engine.test.ts` | Bundle assembly + fee injection tests |

## Key Interfaces

### Launch Parameters (`src/features/launcher/types/ghost.ts`)
```typescript
export interface LaunchParams {
  // Branding
  name: string;
  symbol: string;
  imageUri: string;
  description?: string;

  // Economics
  totalSupply: BN;
  liquiditySol: BN;

  // Lock settings
  lockDurationDays: number;
  isPermanentLock: boolean;

  // Jito settings
  jitoTipLamports: BN;
  useJito: boolean;
}

export interface BundleResult {
  signature: string;
  mintAddress: PublicKey;
  poolAddress: PublicKey;
  lockerAddress: PublicKey;
  bundleId?: string; // Jito bundle ID
}

export interface FeeBreakdown {
  platformFeeSol: number;
  jitoTipSol: number;
  rentSol: number;
  totalSol: number;
}
```

### GhostBundler Class (`src/features/launcher/services/GhostBundler.ts`)
```typescript
export class GhostBundler {
  constructor(connection: Connection, wallet: WalletAdapter);

  // Build the atomic bundle
  async buildBundle(params: LaunchParams): Promise<{
    transaction: VersionedTransaction;
    addresses: {
      mint: PublicKey;
      pool: PublicKey;
      locker: PublicKey;
      vault: PublicKey;
    };
  }>;

  // Submit via Jito Block Engine
  async sendBundle(
    transaction: VersionedTransaction,
    tipLamports: BN
  ): Promise<BundleResult>;

  // Fallback to standard RPC
  async sendStandard(
    transaction: VersionedTransaction
  ): Promise<string>;

  // Calculate fees
  calculateFees(params: LaunchParams): FeeBreakdown;
}
```

### Stepper State (`src/features/launcher/hooks/useGhostLaunch.ts`)
```typescript
interface GhostLaunchState {
  step: 1 | 2 | 3;
  params: Partial<LaunchParams>;
  fees: FeeBreakdown | null;
  isBuilding: boolean;
  isSending: boolean;
  error: Error | null;
  result: BundleResult | null;

  // Actions
  setStep: (step: 1 | 2 | 3) => void;
  updateParams: (partial: Partial<LaunchParams>) => void;
  calculateFees: () => void;
  launch: () => Promise<void>;
  reset: () => void;
}
```

## Program IDs & Addresses

```typescript
// Raydium CPMM (Mainnet)
export const RAYDIUM_CPMM_PROGRAM = new PublicKey('CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C');
export const RAYDIUM_AUTHORITY = new PublicKey('GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ');

// Jito Block Engine
export const JITO_TIP_ACCOUNTS = [
  new PublicKey('96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'),
  new PublicKey('HFqU5x63VTqvQss8hp11i4bVmkdzGZVJCbGxRJe5mq7X'),
  // ... 6 more tip accounts
];

// VECTERAI Platform
export const VECTERAI_FEE_WALLET = new PublicKey('VECTfeewallet111111111111111111111111111111');
export const PLATFORM_FEE_BPS = 100; // 1%
export const MINIMUM_TIP_LAMPORTS = 10_000; // 0.00001 SOL
```

## Instruction Count Verification

The bundle must contain exactly these instructions in order:

| # | Instruction | Program |
|---|-------------|---------|
| 1 | CreateAccount (mint) | System Program |
| 2 | InitializeMint2 | Token-2022 |
| 3 | CreateMetadataAccount | Token Metadata |
| 4 | CreateAccount (pool) | System Program |
| 5 | InitializePool | Raydium CPMM |
| 6 | CreateATA (creator LP) | Associated Token |
| 7 | AddLiquidity | Raydium CPMM |
| 8 | SetAuthority (mint) | Token-2022 |
| 9 | SetAuthority (freeze) | Token-2022 |
| 10 | LockLp | VECTERAI Locker |
| 11 | Transfer (fee) | System Program |
| 12 | Transfer (Jito tip)* | System Program |

*Jito tip is optional based on `useJito` flag.

## Security Considerations (Yellow Zone)

1. **Atomicity**: All instructions in single transaction - partial execution impossible
2. **Authority Revocation**: Mint and freeze authorities revoked BEFORE any public trading
3. **LP Lock**: 90-day minimum enforced by on-chain program
4. **Fee Validation**: Platform fee calculated server-side, verified client-side
5. **Jito Tip**: Random tip account selection to prevent MEV targeting

## UI/UX Design (Green Zone)

### Step 1: Branding
- Token name input (3-32 chars)
- Symbol input (2-10 chars, uppercase)
- Image upload with preview (max 5MB)
- Optional description textarea

### Step 2: Economics
- SOL liquidity slider (0.5 - 100 SOL)
- Visual pool preview
- Lock duration selector (90 days / 180 days / 1 year / Permanent)

### Step 3: Review
- Fee breakdown card
- Jito tip toggle with slider
- Estimated confirmation time
- Launch button with loading state

## Testing Strategy

### Unit Tests (`ghost-engine.test.ts`)
```typescript
describe('GhostBundler', () => {
  describe('buildBundle', () => {
    it('assembles exactly 11 instructions without Jito');
    it('assembles exactly 12 instructions with Jito');
    it('places platform fee as second-to-last instruction');
    it('places Jito tip as last instruction when enabled');
    it('calculates correct fee breakdown');
  });

  describe('instruction order', () => {
    it('revokes authority AFTER pool creation');
    it('locks LP AFTER liquidity addition');
    it('transfers fee AFTER all operations');
  });
});
```

## Environment Variables

```bash
# Add to .env.local
NEXT_PUBLIC_JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf
NEXT_PUBLIC_VECTERAI_FEE_WALLET=VECTfeewallet111111111111111111111111111111
NEXT_PUBLIC_PLATFORM_FEE_BPS=100
```

## Verification Checklist

- [ ] All 12 instructions present in correct order
- [ ] Authority revocation cannot be skipped
- [ ] LP lock uses 90-day minimum
- [ ] Platform fee correctly calculated (1% of liquidity)
- [ ] Jito tip randomizes across 8 accounts
- [ ] framer-motion transitions smooth between steps
- [ ] All tests pass with mock connection
