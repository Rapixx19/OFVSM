# VECTERAI System Audit Log

## Overview

This document provides architectural rationale for key design decisions in the VECTERAI token launch platform. Intended for security auditors and technical reviewers.

---

## Why Jito?

**Decision:** All token launch transactions are submitted via Jito bundles by default.

**Rationale:**

- **MEV Protection:** Jito provides atomic bundle execution, preventing front-running and sandwich attacks that plague standard mempool transactions
- **Atomic Execution:** All instructions in a bundle execute together or fail together - no partial execution states
- **Priority Ordering:** Bundles with tips get priority inclusion by Jito validators, ensuring reliable confirmation
- **User Protection:** Without MEV protection, malicious actors could front-run token launches, extracting value from liquidity pool creation

**Implementation:** `src/features/launcher/services/GhostBundler.ts`

- Default tip: 0.01 SOL (configurable)
- Jito RPC endpoints for bundle submission
- Fallback to standard RPC if Jito is disabled

---

## Why Token-2022?

**Decision:** All tokens are minted using the Solana Token-2022 (Token Extensions) program instead of the original SPL Token program.

**Rationale:**

- **Embedded Metadata:** Token-2022 supports native metadata extension, eliminating need for separate Metaplex metadata accounts
- **Cost Efficiency:** Single account for token mint + metadata vs. multiple accounts with Metaplex (~0.002 SOL savings per launch)
- **Future-Proof:** Token-2022 is Solana's forward-looking token standard with ongoing extension development
- **Simpler Architecture:** Fewer accounts to manage, fewer instructions in transaction, lower complexity surface

**Implementation:** `src/features/launcher/instructions/createPool.ts`

- Uses `@solana/spl-token` Token-2022 APIs
- Metadata extension configured at mint creation
- No separate Metaplex account creation required

---

## Why 90-Day Minimum Lock?

**Decision:** Liquidity pool tokens are locked for a minimum of 90 days, enforced at the program level.

**Rationale:**

- **Rug Pull Prevention:** 90 days is sufficient time for community verification and due diligence
- **Trust Standard:** Creates a baseline "Safe-Standard" that users can rely on
- **Program Enforcement:** Lock duration is validated on-chain - no admin override possible
- **Market Signal:** Projects willing to lock for 90+ days demonstrate commitment
- **Optional Permanence:** Users can opt for permanent (infinite) lock for maximum trust

**Implementation:** `src/features/locker/constants/locker.ts`

- `MIN_LOCK_DAYS = 90` - enforced constant
- Permanent lock option: `isPermanentLock = true`
- Lock period displayed on SuccessCard with badge

---

## Why Ephemeral Session Keys?

**Decision:** Session keys are generated client-side, used for signing, and never persisted.

**Rationale:**

- **Client-Side Only:** Private keys never leave the user's browser
- **Limited Exposure:** Session keys hold maximum 0.05 SOL operational budget
- **Single-Use:** Keys are generated per session, not stored or reused
- **No Server Storage:** VECTERAI backend never sees or stores private keys
- **Wallet Integration:** User's main wallet only signs final transaction, not intermediate operations

**Implementation:** `src/features/orchestrator/services/sessionPda.ts`

- Keys derived per session with unique seed
- Automatic cleanup on session end
- Budget cap enforced at transfer level

---

## Security Architecture Summary

| Layer                  | Protection                           |
| ---------------------- | ------------------------------------ |
| Transaction Submission | Jito MEV bundles                     |
| Token Standard         | Token-2022 with extensions           |
| Liquidity Lock         | 90-day minimum, program-enforced     |
| Key Management         | Ephemeral client-side only           |
| User Feedback          | Haptic + audio for critical actions  |
| Mobile Safety          | Safe-area insets for notched devices |

---

## Verification Checklist

- [ ] Jito bundle submission active by default
- [ ] Token-2022 mint creation with metadata extension
- [ ] Lock duration >= 90 days validated on-chain
- [ ] No private key persistence in localStorage/cookies
- [ ] Session key budget capped at 0.05 SOL
- [ ] TypeScript strict mode with zero errors

---

## Audit Contact

For security inquiries, contact the VECTERAI team.

_Document Version: 1.0_
_Last Updated: 2025-03_
