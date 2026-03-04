/**
 * @file locker.test.ts
 * @summary Integration tests for VECTERAI Locker program
 * @dependencies vitest, @solana/web3.js, @coral-xyz/anchor
 */

import { describe, it, expect, vi } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import {
  MINIMUM_LOCK_PERIOD,
  type LockerAccount,
  type SafeStandardStatus,
  LockerErrorCode,
  LOCKER_ERROR_MESSAGES,
  LOCKER_SEED,
  VAULT_SEED,
} from '../types/locker';

/**
 * Mock constants for testing
 * Using valid base58 encoded public keys (well-known Solana addresses)
 */
const MOCK_LP_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const MOCK_CREATOR = new PublicKey('4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
const MOCK_VAULT = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

/**
 * Factory function to create test locker accounts
 */
function createTestLocker(overrides: Partial<LockerAccount> = {}): LockerAccount {
  const now = Math.floor(Date.now() / 1000);
  const releaseTime = now + MINIMUM_LOCK_PERIOD; // 90 days from now

  return {
    creator: MOCK_CREATOR,
    lpMint: MOCK_LP_MINT,
    vault: MOCK_VAULT,
    amount: new BN(1_000_000_000), // 1 billion LP tokens
    lockedAt: new BN(now),
    releaseTime: new BN(releaseTime),
    isPermanent: false,
    isUnlocked: false,
    bump: 255,
    vaultBump: 254,
    ...overrides,
  };
}

/**
 * Simulate the on-chain lock validation logic
 */
function validateLockPeriod(lockDurationSeconds: number): {
  valid: boolean;
  error?: LockerErrorCode;
} {
  if (lockDurationSeconds < MINIMUM_LOCK_PERIOD) {
    return { valid: false, error: LockerErrorCode.LockTooShort };
  }
  return { valid: true };
}

/**
 * Simulate the on-chain unlock validation logic
 */
function validateUnlock(
  locker: LockerAccount,
  currentTimestamp: number
): { valid: boolean; error?: LockerErrorCode } {
  // Check if already unlocked
  if (locker.isUnlocked) {
    return { valid: false, error: LockerErrorCode.AlreadyUnlocked };
  }

  // Check if permanent
  if (locker.isPermanent) {
    return { valid: false, error: LockerErrorCode.PermanentLock };
  }

  // Check if lock has expired
  if (currentTimestamp < locker.releaseTime.toNumber()) {
    return { valid: false, error: LockerErrorCode.LockNotExpired };
  }

  return { valid: true };
}

/**
 * Calculate Safe Standard compliance
 */
function calculateCompliance(locker: LockerAccount): SafeStandardStatus {
  const now = Math.floor(Date.now() / 1000);
  const releaseTime = locker.releaseTime.toNumber();
  const lockDuration = releaseTime - locker.lockedAt.toNumber();

  const isCompliant = !locker.isUnlocked && lockDuration >= MINIMUM_LOCK_PERIOD;

  let status: SafeStandardStatus['status'];
  if (locker.isUnlocked) {
    status = 'unlocked';
  } else if (locker.isPermanent) {
    status = 'permanent';
  } else if (now >= releaseTime) {
    status = 'unlockable';
  } else {
    status = 'locked';
  }

  const secondsRemaining = Math.max(0, releaseTime - now);
  const daysRemaining = Math.ceil(secondsRemaining / 86400);

  return {
    isCompliant,
    status,
    daysRemaining: locker.isPermanent ? null : daysRemaining,
    isPermanent: locker.isPermanent,
    lockedAmount: locker.amount,
    releaseTime: new Date(releaseTime * 1000),
  };
}

describe('VECTERAI Locker Program', () => {
  describe('PDA Seed Construction', () => {
    it('constructs Locker seeds with correct format', () => {
      // Test that seeds are constructed correctly
      const lockerSeeds = [
        Buffer.from(LOCKER_SEED),
        MOCK_LP_MINT.toBuffer(),
        MOCK_CREATOR.toBuffer(),
      ];

      expect(lockerSeeds[0]).toEqual(Buffer.from('locker'));
      expect(lockerSeeds[1]).toHaveLength(32);
      expect(lockerSeeds[2]).toHaveLength(32);
    });

    it('constructs Vault seeds with correct format', () => {
      // Test that vault seeds use correct prefix
      const vaultSeedPrefix = Buffer.from(VAULT_SEED);
      expect(vaultSeedPrefix).toEqual(Buffer.from('vault'));
    });

    it('generates different seed combinations for different mints', () => {
      const differentMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

      const seeds1 = [MOCK_LP_MINT.toBuffer(), MOCK_CREATOR.toBuffer()];
      const seeds2 = [differentMint.toBuffer(), MOCK_CREATOR.toBuffer()];

      expect(seeds1[0]).not.toEqual(seeds2[0]);
      expect(seeds1[1]).toEqual(seeds2[1]);
    });

    it('generates different seed combinations for different creators', () => {
      const differentCreator = new PublicKey('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');

      const seeds1 = [MOCK_LP_MINT.toBuffer(), MOCK_CREATOR.toBuffer()];
      const seeds2 = [MOCK_LP_MINT.toBuffer(), differentCreator.toBuffer()];

      expect(seeds1[0]).toEqual(seeds2[0]);
      expect(seeds1[1]).not.toEqual(seeds2[1]);
    });
  });

  describe('lock_lp instruction validation', () => {
    it('fails if lock period is less than 90 days', () => {
      const shortPeriod = MINIMUM_LOCK_PERIOD - 1; // 89 days, 23 hours, 59 minutes, 59 seconds
      const result = validateLockPeriod(shortPeriod);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(LockerErrorCode.LockTooShort);
    });

    it('fails if lock period is 0', () => {
      const result = validateLockPeriod(0);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(LockerErrorCode.LockTooShort);
    });

    it('fails if lock period is negative', () => {
      const result = validateLockPeriod(-1000);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(LockerErrorCode.LockTooShort);
    });

    it('succeeds with exactly 90 days', () => {
      const result = validateLockPeriod(MINIMUM_LOCK_PERIOD);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('succeeds with more than 90 days', () => {
      const longPeriod = MINIMUM_LOCK_PERIOD * 2; // 180 days
      const result = validateLockPeriod(longPeriod);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('succeeds with 1 year lock', () => {
      const oneYear = 365 * 24 * 60 * 60; // 365 days
      const result = validateLockPeriod(oneYear);

      expect(result.valid).toBe(true);
    });
  });

  describe('unlock_lp instruction validation', () => {
    it('fails before release_time', () => {
      const locker = createTestLocker();
      const now = Math.floor(Date.now() / 1000);

      // Current time is before release time
      const result = validateUnlock(locker, now);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(LockerErrorCode.LockNotExpired);
    });

    it('fails 1 second before release_time', () => {
      const locker = createTestLocker();
      const releaseTime = locker.releaseTime.toNumber();

      const result = validateUnlock(locker, releaseTime - 1);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(LockerErrorCode.LockNotExpired);
    });

    it('succeeds exactly at release_time', () => {
      const locker = createTestLocker();
      const releaseTime = locker.releaseTime.toNumber();

      const result = validateUnlock(locker, releaseTime);

      expect(result.valid).toBe(true);
    });

    it('succeeds after release_time', () => {
      const locker = createTestLocker();
      const releaseTime = locker.releaseTime.toNumber();

      const result = validateUnlock(locker, releaseTime + 1000);

      expect(result.valid).toBe(true);
    });

    it('fails for permanent locks', () => {
      const locker = createTestLocker({ isPermanent: true });
      const releaseTime = locker.releaseTime.toNumber();

      const result = validateUnlock(locker, releaseTime + 1000);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(LockerErrorCode.PermanentLock);
    });

    it('fails if already unlocked', () => {
      const locker = createTestLocker({ isUnlocked: true });
      const releaseTime = locker.releaseTime.toNumber();

      const result = validateUnlock(locker, releaseTime + 1000);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(LockerErrorCode.AlreadyUnlocked);
    });
  });

  describe('Safe Standard Compliance', () => {
    it('is compliant with 90+ day lock', () => {
      const locker = createTestLocker();
      const status = calculateCompliance(locker);

      expect(status.isCompliant).toBe(true);
      expect(status.status).toBe('locked');
      expect(status.isPermanent).toBe(false);
    });

    it('is compliant with permanent lock', () => {
      const locker = createTestLocker({ isPermanent: true });
      const status = calculateCompliance(locker);

      expect(status.isCompliant).toBe(true);
      expect(status.status).toBe('permanent');
      expect(status.isPermanent).toBe(true);
      expect(status.daysRemaining).toBeNull();
    });

    it('is not compliant after unlock', () => {
      const locker = createTestLocker({ isUnlocked: true });
      const status = calculateCompliance(locker);

      expect(status.isCompliant).toBe(false);
      expect(status.status).toBe('unlocked');
    });

    it('shows unlockable status after release time', () => {
      const now = Math.floor(Date.now() / 1000);
      const pastReleaseTime = now - 1000; // 1000 seconds ago

      const locker = createTestLocker({
        lockedAt: new BN(pastReleaseTime - MINIMUM_LOCK_PERIOD),
        releaseTime: new BN(pastReleaseTime),
      });

      const status = calculateCompliance(locker);

      expect(status.status).toBe('unlockable');
      expect(status.daysRemaining).toBe(0);
    });

    it('calculates days remaining correctly', () => {
      const now = Math.floor(Date.now() / 1000);
      const fiveDaysFromNow = now + 5 * 24 * 60 * 60;

      const locker = createTestLocker({
        releaseTime: new BN(fiveDaysFromNow),
      });

      const status = calculateCompliance(locker);

      expect(status.daysRemaining).toBe(5);
    });
  });

  describe('Error Messages', () => {
    it('has correct error message for LockTooShort', () => {
      expect(LOCKER_ERROR_MESSAGES[LockerErrorCode.LockTooShort]).toContain(
        '90 days'
      );
    });

    it('has correct error message for LockNotExpired', () => {
      expect(LOCKER_ERROR_MESSAGES[LockerErrorCode.LockNotExpired]).toContain(
        'expired'
      );
    });

    it('has correct error message for Unauthorized', () => {
      expect(LOCKER_ERROR_MESSAGES[LockerErrorCode.Unauthorized]).toContain(
        'creator'
      );
    });

    it('has correct error message for PermanentLock', () => {
      expect(LOCKER_ERROR_MESSAGES[LockerErrorCode.PermanentLock]).toContain(
        'permanent'
      );
    });
  });

  describe('Constants', () => {
    it('MINIMUM_LOCK_PERIOD equals 90 days in seconds', () => {
      const ninetyDays = 90 * 24 * 60 * 60;
      expect(MINIMUM_LOCK_PERIOD).toBe(ninetyDays);
      expect(MINIMUM_LOCK_PERIOD).toBe(7_776_000);
    });
  });
});

describe('Integration: Lock Lifecycle', () => {
  it('simulates complete lock lifecycle', () => {
    // Step 1: Create lock with 90 days
    const lockDuration = MINIMUM_LOCK_PERIOD;
    const lockResult = validateLockPeriod(lockDuration);
    expect(lockResult.valid).toBe(true);

    // Step 2: Create locker state
    const now = Math.floor(Date.now() / 1000);
    const locker = createTestLocker({
      lockedAt: new BN(now),
      releaseTime: new BN(now + lockDuration),
    });

    // Step 3: Verify lock is active
    let status = calculateCompliance(locker);
    expect(status.isCompliant).toBe(true);
    expect(status.status).toBe('locked');

    // Step 4: Attempt early unlock (should fail)
    const earlyUnlockResult = validateUnlock(locker, now + 1000);
    expect(earlyUnlockResult.valid).toBe(false);
    expect(earlyUnlockResult.error).toBe(LockerErrorCode.LockNotExpired);

    // Step 5: Time passes, now past release time
    const futureTime = locker.releaseTime.toNumber() + 1;

    // Step 6: Unlock succeeds
    const unlockResult = validateUnlock(locker, futureTime);
    expect(unlockResult.valid).toBe(true);

    // Step 7: Mark as unlocked
    locker.isUnlocked = true;

    // Step 8: Verify no longer compliant
    status = calculateCompliance(locker);
    expect(status.isCompliant).toBe(false);
    expect(status.status).toBe('unlocked');
  });

  it('simulates permanent lock lifecycle', () => {
    // Step 1: Create permanent lock
    const locker = createTestLocker({ isPermanent: true });

    // Step 2: Verify compliance
    let status = calculateCompliance(locker);
    expect(status.isCompliant).toBe(true);
    expect(status.status).toBe('permanent');
    expect(status.daysRemaining).toBeNull();

    // Step 3: Time passes beyond release time
    const futureTime = locker.releaseTime.toNumber() + 1_000_000;

    // Step 4: Unlock attempt fails (permanent)
    const unlockResult = validateUnlock(locker, futureTime);
    expect(unlockResult.valid).toBe(false);
    expect(unlockResult.error).toBe(LockerErrorCode.PermanentLock);

    // Step 5: Status remains permanent
    status = calculateCompliance(locker);
    expect(status.status).toBe('permanent');
    expect(status.isCompliant).toBe(true);
  });
});
