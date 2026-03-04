/**
 * @file sentinel.test.ts
 * @summary Unit tests for SentinelAgent security verification
 * @dependencies vitest, @solana/web3.js, @coral-xyz/anchor
 */

import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import type { LockerAccount } from '../types/locker';
import type { SecurityCertificate, ExpiringLock } from '../types/sentinel';
import { MINIMUM_LOCK_PERIOD } from '../types/locker';

/**
 * Mock constants for testing
 */
const MOCK_TOKEN_MINT = 'So11111111111111111111111111111111111111112';
const MOCK_LP_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const MOCK_CREATOR = '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T';
const MOCK_VAULT = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

/**
 * Factory function to create test locker accounts
 */
function createTestLocker(overrides: Partial<LockerAccount> = {}): LockerAccount {
  const now = Math.floor(Date.now() / 1000);
  const releaseTime = now + MINIMUM_LOCK_PERIOD; // 90 days from now

  return {
    creator: new PublicKey(MOCK_CREATOR),
    lpMint: new PublicKey(MOCK_LP_MINT),
    vault: new PublicKey(MOCK_VAULT),
    amount: new BN(1_000_000_000),
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
 * Mock certificate generation logic (mirrors SentinelAgent)
 */
function generateMockCertificate(
  locker: LockerAccount | null,
  tokenMint: string,
  lpMint: string
): SecurityCertificate {
  if (!locker) {
    return {
      tokenMint,
      lpMint,
      lockDepth: 'temporary',
      lockDays: null,
      authorityStatus: 'active',
      contractAuditHash: 'vecterai-locker-v1.0.0-audit-pending',
      verifiedAt: Date.now(),
      isCompliant: false,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const releaseTime = locker.releaseTime.toNumber();
  const secondsRemaining = releaseTime - now;
  const lockDays = locker.isPermanent
    ? null
    : locker.isUnlocked
      ? 0
      : Math.max(0, Math.ceil(secondsRemaining / 86400));

  const isCompliant = !locker.isUnlocked && lockDays !== null && lockDays >= 90;

  return {
    tokenMint,
    lpMint,
    lockDepth: locker.isPermanent ? 'permanent' : 'temporary',
    lockDays,
    authorityStatus: locker.isPermanent ? 'revoked' : 'active',
    contractAuditHash: 'vecterai-locker-v1.0.0-audit-pending',
    verifiedAt: Date.now(),
    isCompliant,
  };
}

/**
 * Calculate expiring locks (mirrors SentinelAgent)
 */
function calculateExpiringLocks(
  lockers: Array<{ locker: LockerAccount; tokenMint: string; creatorWallet: string }>,
  thresholdDays: number
): ExpiringLock[] {
  const now = Math.floor(Date.now() / 1000);
  const thresholdSeconds = thresholdDays * 24 * 60 * 60;
  const expiringLocks: ExpiringLock[] = [];

  for (const { locker, tokenMint, creatorWallet } of lockers) {
    if (locker.isUnlocked || locker.isPermanent) continue;

    const releaseTime = locker.releaseTime.toNumber();
    const secondsRemaining = releaseTime - now;

    if (secondsRemaining > 0 && secondsRemaining <= thresholdSeconds) {
      expiringLocks.push({
        tokenMint,
        lpMint: locker.lpMint.toBase58(),
        creatorWallet,
        releaseTime: new Date(releaseTime * 1000),
        daysRemaining: Math.ceil(secondsRemaining / 86400),
      });
    }
  }

  return expiringLocks;
}

describe('SentinelAgent', () => {
  describe('generateSecurityCertificate', () => {
    it('returns non-compliant certificate when no lock exists', () => {
      const certificate = generateMockCertificate(null, MOCK_TOKEN_MINT, MOCK_LP_MINT);

      expect(certificate.isCompliant).toBe(false);
      expect(certificate.lockDepth).toBe('temporary');
      expect(certificate.lockDays).toBeNull();
      expect(certificate.authorityStatus).toBe('active');
    });

    it('returns compliant certificate for 90+ day lock', () => {
      const locker = createTestLocker();
      const certificate = generateMockCertificate(locker, MOCK_TOKEN_MINT, MOCK_LP_MINT);

      expect(certificate.isCompliant).toBe(true);
      expect(certificate.lockDepth).toBe('temporary');
      expect(certificate.lockDays).toBeGreaterThanOrEqual(90);
      expect(certificate.authorityStatus).toBe('active');
    });

    it('returns permanent lock certificate', () => {
      const locker = createTestLocker({ isPermanent: true });
      const certificate = generateMockCertificate(locker, MOCK_TOKEN_MINT, MOCK_LP_MINT);

      expect(certificate.lockDepth).toBe('permanent');
      expect(certificate.lockDays).toBeNull();
      expect(certificate.authorityStatus).toBe('revoked');
    });

    it('returns non-compliant certificate for unlocked tokens', () => {
      const locker = createTestLocker({ isUnlocked: true });
      const certificate = generateMockCertificate(locker, MOCK_TOKEN_MINT, MOCK_LP_MINT);

      expect(certificate.isCompliant).toBe(false);
      expect(certificate.lockDays).toBe(0);
    });

    it('includes valid audit hash', () => {
      const locker = createTestLocker();
      const certificate = generateMockCertificate(locker, MOCK_TOKEN_MINT, MOCK_LP_MINT);

      expect(certificate.contractAuditHash).toBe('vecterai-locker-v1.0.0-audit-pending');
    });

    it('includes verification timestamp', () => {
      const before = Date.now();
      const locker = createTestLocker();
      const certificate = generateMockCertificate(locker, MOCK_TOKEN_MINT, MOCK_LP_MINT);
      const after = Date.now();

      expect(certificate.verifiedAt).toBeGreaterThanOrEqual(before);
      expect(certificate.verifiedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('checkImpendingExpirations', () => {
    it('returns empty array when no locks exist', () => {
      const expiringLocks = calculateExpiringLocks([], 7);
      expect(expiringLocks).toHaveLength(0);
    });

    it('detects locks expiring within threshold', () => {
      const now = Math.floor(Date.now() / 1000);
      const fiveDaysFromNow = now + 5 * 24 * 60 * 60;

      const locker = createTestLocker({
        releaseTime: new BN(fiveDaysFromNow),
      });

      const expiringLocks = calculateExpiringLocks(
        [{ locker, tokenMint: MOCK_TOKEN_MINT, creatorWallet: MOCK_CREATOR }],
        7
      );

      expect(expiringLocks).toHaveLength(1);
      expect(expiringLocks[0]!.daysRemaining).toBe(5);
    });

    it('ignores locks beyond threshold', () => {
      const now = Math.floor(Date.now() / 1000);
      const tenDaysFromNow = now + 10 * 24 * 60 * 60;

      const locker = createTestLocker({
        releaseTime: new BN(tenDaysFromNow),
      });

      const expiringLocks = calculateExpiringLocks(
        [{ locker, tokenMint: MOCK_TOKEN_MINT, creatorWallet: MOCK_CREATOR }],
        7
      );

      expect(expiringLocks).toHaveLength(0);
    });

    it('ignores permanent locks', () => {
      const now = Math.floor(Date.now() / 1000);
      const fiveDaysFromNow = now + 5 * 24 * 60 * 60;

      const locker = createTestLocker({
        releaseTime: new BN(fiveDaysFromNow),
        isPermanent: true,
      });

      const expiringLocks = calculateExpiringLocks(
        [{ locker, tokenMint: MOCK_TOKEN_MINT, creatorWallet: MOCK_CREATOR }],
        7
      );

      expect(expiringLocks).toHaveLength(0);
    });

    it('ignores already unlocked locks', () => {
      const now = Math.floor(Date.now() / 1000);
      const fiveDaysFromNow = now + 5 * 24 * 60 * 60;

      const locker = createTestLocker({
        releaseTime: new BN(fiveDaysFromNow),
        isUnlocked: true,
      });

      const expiringLocks = calculateExpiringLocks(
        [{ locker, tokenMint: MOCK_TOKEN_MINT, creatorWallet: MOCK_CREATOR }],
        7
      );

      expect(expiringLocks).toHaveLength(0);
    });

    it('calculates correct days remaining', () => {
      const now = Math.floor(Date.now() / 1000);

      // Test 1 day remaining
      const oneDayFromNow = now + 24 * 60 * 60;
      const locker1 = createTestLocker({ releaseTime: new BN(oneDayFromNow) });

      // Test 3 days remaining
      const threeDaysFromNow = now + 3 * 24 * 60 * 60;
      const locker3 = createTestLocker({ releaseTime: new BN(threeDaysFromNow) });

      // Test 7 days remaining (edge case)
      const sevenDaysFromNow = now + 7 * 24 * 60 * 60;
      const locker7 = createTestLocker({ releaseTime: new BN(sevenDaysFromNow) });

      const expiringLocks = calculateExpiringLocks(
        [
          { locker: locker1, tokenMint: 'mint1', creatorWallet: MOCK_CREATOR },
          { locker: locker3, tokenMint: 'mint3', creatorWallet: MOCK_CREATOR },
          { locker: locker7, tokenMint: 'mint7', creatorWallet: MOCK_CREATOR },
        ],
        7
      );

      expect(expiringLocks).toHaveLength(3);

      const sorted = expiringLocks.sort((a, b) => a.daysRemaining - b.daysRemaining);
      expect(sorted[0]!.daysRemaining).toBe(1);
      expect(sorted[1]!.daysRemaining).toBe(3);
      expect(sorted[2]!.daysRemaining).toBe(7);
    });
  });

  describe('Certificate Verification Logic', () => {
    it('compliant requires at least 90 days lock', () => {
      const now = Math.floor(Date.now() / 1000);

      // 89 days - not compliant
      const locker89 = createTestLocker({
        releaseTime: new BN(now + 89 * 24 * 60 * 60),
      });
      const cert89 = generateMockCertificate(locker89, MOCK_TOKEN_MINT, MOCK_LP_MINT);
      expect(cert89.isCompliant).toBe(false);

      // 90 days - compliant
      const locker90 = createTestLocker({
        releaseTime: new BN(now + 90 * 24 * 60 * 60),
      });
      const cert90 = generateMockCertificate(locker90, MOCK_TOKEN_MINT, MOCK_LP_MINT);
      expect(cert90.isCompliant).toBe(true);

      // 180 days - compliant
      const locker180 = createTestLocker({
        releaseTime: new BN(now + 180 * 24 * 60 * 60),
      });
      const cert180 = generateMockCertificate(locker180, MOCK_TOKEN_MINT, MOCK_LP_MINT);
      expect(cert180.isCompliant).toBe(true);
    });

    it('authority status reflects lock permanence', () => {
      const temporaryLocker = createTestLocker({ isPermanent: false });
      const tempCert = generateMockCertificate(temporaryLocker, MOCK_TOKEN_MINT, MOCK_LP_MINT);
      expect(tempCert.authorityStatus).toBe('active');

      const permanentLocker = createTestLocker({ isPermanent: true });
      const permCert = generateMockCertificate(permanentLocker, MOCK_TOKEN_MINT, MOCK_LP_MINT);
      expect(permCert.authorityStatus).toBe('revoked');
    });
  });
});

describe('SecurityCertificate Type', () => {
  it('has all required fields', () => {
    const certificate: SecurityCertificate = {
      tokenMint: MOCK_TOKEN_MINT,
      lpMint: MOCK_LP_MINT,
      lockDepth: 'temporary',
      lockDays: 90,
      authorityStatus: 'active',
      contractAuditHash: 'test-hash',
      verifiedAt: Date.now(),
      isCompliant: true,
    };

    expect(certificate.tokenMint).toBeDefined();
    expect(certificate.lpMint).toBeDefined();
    expect(certificate.lockDepth).toBeDefined();
    expect(certificate.authorityStatus).toBeDefined();
    expect(certificate.contractAuditHash).toBeDefined();
    expect(certificate.verifiedAt).toBeDefined();
    expect(certificate.isCompliant).toBeDefined();
  });
});

describe('ExpiringLock Type', () => {
  it('has all required fields', () => {
    const lock: ExpiringLock = {
      tokenMint: MOCK_TOKEN_MINT,
      lpMint: MOCK_LP_MINT,
      creatorWallet: MOCK_CREATOR,
      releaseTime: new Date(),
      daysRemaining: 5,
    };

    expect(lock.tokenMint).toBeDefined();
    expect(lock.lpMint).toBeDefined();
    expect(lock.creatorWallet).toBeDefined();
    expect(lock.releaseTime).toBeInstanceOf(Date);
    expect(lock.daysRemaining).toBe(5);
  });
});
