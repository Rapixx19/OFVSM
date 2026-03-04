/**
 * @file locker.ts
 * @summary TypeScript types for VECTERAI Locker program
 * @dependencies @coral-xyz/anchor, @solana/web3.js
 */

import type { PublicKey } from '@solana/web3.js';
import type { BN } from '@coral-xyz/anchor';

/**
 * Minimum lock period in seconds (90 days)
 */
export const MINIMUM_LOCK_PERIOD = 7_776_000;

/**
 * VECTERAI Locker Program ID
 * This is a placeholder program ID - replace with actual deployed program ID
 * Using Token Program ID format for valid PDA derivation during testing
 */
export const LOCKER_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

/**
 * Seed constants for PDA derivation
 */
export const LOCKER_SEED = 'locker';
export const VAULT_SEED = 'vault';

/**
 * Locker account structure (mirrors on-chain state)
 */
export interface LockerAccount {
  /** The wallet address of the lock creator */
  creator: PublicKey;
  /** The LP token mint address */
  lpMint: PublicKey;
  /** The vault PDA that holds the locked tokens */
  vault: PublicKey;
  /** Amount of LP tokens locked */
  amount: BN;
  /** Unix timestamp when the lock was created */
  lockedAt: BN;
  /** Unix timestamp when tokens can be withdrawn */
  releaseTime: BN;
  /** Whether this is a permanent lock */
  isPermanent: boolean;
  /** Whether the tokens have been unlocked/withdrawn */
  isUnlocked: boolean;
  /** Bump seed for the Locker PDA */
  bump: number;
  /** Bump seed for the Vault PDA */
  vaultBump: number;
}

/**
 * Lock status for display purposes
 */
export type LockStatus =
  | 'locked'
  | 'unlockable'
  | 'unlocked'
  | 'permanent';

/**
 * Safe Standard compliance status
 */
export interface SafeStandardStatus {
  /** Whether the token is Safe Standard compliant */
  isCompliant: boolean;
  /** The lock status */
  status: LockStatus;
  /** Days remaining until unlock (if applicable) */
  daysRemaining: number | null;
  /** Whether the lock is permanent */
  isPermanent: boolean;
  /** Amount of LP tokens locked */
  lockedAmount: BN | null;
  /** Release timestamp */
  releaseTime: Date | null;
}

/**
 * Lock LP instruction parameters
 */
export interface LockLpParams {
  /** Amount of LP tokens to lock */
  amount: BN;
  /** Lock duration in seconds */
  lockDuration: BN;
  /** Whether this is a permanent lock */
  isPermanent: boolean;
}

/**
 * Extend lock instruction parameters
 */
export interface ExtendLockParams {
  /** New release timestamp */
  newReleaseTime: BN;
}

/**
 * Locker error codes
 */
export enum LockerErrorCode {
  LockTooShort = 6000,
  LockNotExpired = 6001,
  Unauthorized = 6002,
  PermanentLock = 6003,
  AlreadyUnlocked = 6004,
  InvalidExtension = 6005,
  InvalidMint = 6006,
  ArithmeticOverflow = 6007,
}

/**
 * Locker error messages
 */
export const LOCKER_ERROR_MESSAGES: Record<LockerErrorCode, string> = {
  [LockerErrorCode.LockTooShort]:
    'Lock period must be at least 90 days (7776000 seconds)',
  [LockerErrorCode.LockNotExpired]: 'Lock has not yet expired',
  [LockerErrorCode.Unauthorized]:
    'Unauthorized: Only the creator can perform this action',
  [LockerErrorCode.PermanentLock]: 'Cannot unlock a permanent lock',
  [LockerErrorCode.AlreadyUnlocked]: 'Lock has already been unlocked',
  [LockerErrorCode.InvalidExtension]:
    'New release time must be after current release time',
  [LockerErrorCode.InvalidMint]: 'Invalid LP token mint',
  [LockerErrorCode.ArithmeticOverflow]: 'Arithmetic overflow',
};

// Re-export sentinel types for convenience
export type {
  SecurityEventType,
  SecurityCertificate,
  SafetyEvent,
  ExpiringLock,
} from './sentinel';
