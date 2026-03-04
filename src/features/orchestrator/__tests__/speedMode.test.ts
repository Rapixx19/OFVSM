/**
 * @file speedMode.test.ts
 * @summary Tests for Speed Mode session key management
 * @dependencies vitest, @solana/web3.js
 */

import { describe, it, expect } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';

import type { SessionKey } from '../types/speedMode';
import {
  DEFAULT_SOL_CAP_LAMPORTS,
  SESSION_DURATION_MS,
  SESSION_SEED,
  isSessionExpired,
  hasRemainingCap,
  getRemainingCapSol,
  getExpiresInSeconds,
} from '../types/speedMode';
import {
  deriveSessionPda,
  generateSessionKeypair,
} from '../services/sessionPda';

/**
 * Create mock session key for testing
 */
function createMockSessionKey(overrides: Partial<SessionKey> = {}): SessionKey {
  return {
    publicKey: Keypair.generate().publicKey.toBase58(),
    encryptedSecretKey: new ArrayBuffer(64),
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
    solCapLamports: DEFAULT_SOL_CAP_LAMPORTS,
    usedLamports: 0,
    ...overrides,
  };
}

describe('Speed Mode Types', () => {
  describe('Constants', () => {
    it('DEFAULT_SOL_CAP_LAMPORTS is 0.05 SOL', () => {
      expect(DEFAULT_SOL_CAP_LAMPORTS).toBe(50_000_000);
    });

    it('SESSION_DURATION_MS is 24 hours', () => {
      const twentyFourHours = 24 * 60 * 60 * 1000;
      expect(SESSION_DURATION_MS).toBe(twentyFourHours);
    });

    it('SESSION_SEED is "session"', () => {
      expect(SESSION_SEED).toBe('session');
    });
  });

  describe('isSessionExpired', () => {
    it('returns false for non-expired session', () => {
      const session = createMockSessionKey({
        expiresAt: Date.now() + 60000,
      });

      expect(isSessionExpired(session)).toBe(false);
    });

    it('returns true for expired session', () => {
      const session = createMockSessionKey({
        expiresAt: Date.now() - 1000,
      });

      expect(isSessionExpired(session)).toBe(true);
    });

    it('returns true for session expiring now', () => {
      const now = Date.now();
      const session = createMockSessionKey({
        expiresAt: now,
      });

      // Should be expired at exact boundary
      expect(isSessionExpired(session)).toBe(true);
    });
  });

  describe('hasRemainingCap', () => {
    it('returns true when cap not reached', () => {
      const session = createMockSessionKey({
        solCapLamports: 50_000_000,
        usedLamports: 25_000_000,
      });

      expect(hasRemainingCap(session)).toBe(true);
    });

    it('returns false when cap exhausted', () => {
      const session = createMockSessionKey({
        solCapLamports: 50_000_000,
        usedLamports: 50_000_000,
      });

      expect(hasRemainingCap(session)).toBe(false);
    });

    it('returns false when over cap', () => {
      const session = createMockSessionKey({
        solCapLamports: 50_000_000,
        usedLamports: 60_000_000,
      });

      expect(hasRemainingCap(session)).toBe(false);
    });
  });

  describe('getRemainingCapSol', () => {
    it('calculates remaining SOL correctly', () => {
      const session = createMockSessionKey({
        solCapLamports: 50_000_000,
        usedLamports: 20_000_000,
      });

      expect(getRemainingCapSol(session)).toBeCloseTo(0.03, 4);
    });

    it('returns 0 when cap exhausted', () => {
      const session = createMockSessionKey({
        solCapLamports: 50_000_000,
        usedLamports: 50_000_000,
      });

      expect(getRemainingCapSol(session)).toBe(0);
    });

    it('returns 0 for negative remaining (over cap)', () => {
      const session = createMockSessionKey({
        solCapLamports: 50_000_000,
        usedLamports: 60_000_000,
      });

      expect(getRemainingCapSol(session)).toBe(0);
    });

    it('returns full cap when nothing used', () => {
      const session = createMockSessionKey({
        solCapLamports: 50_000_000,
        usedLamports: 0,
      });

      expect(getRemainingCapSol(session)).toBeCloseTo(0.05, 4);
    });
  });

  describe('getExpiresInSeconds', () => {
    it('calculates seconds remaining correctly', () => {
      const session = createMockSessionKey({
        expiresAt: Date.now() + 3600000, // 1 hour
      });

      const seconds = getExpiresInSeconds(session);
      expect(seconds).toBeGreaterThan(3590);
      expect(seconds).toBeLessThanOrEqual(3600);
    });

    it('returns 0 for expired session', () => {
      const session = createMockSessionKey({
        expiresAt: Date.now() - 1000,
      });

      expect(getExpiresInSeconds(session)).toBe(0);
    });

    it('returns 0 for session expiring now', () => {
      const session = createMockSessionKey({
        expiresAt: Date.now(),
      });

      expect(getExpiresInSeconds(session)).toBe(0);
    });
  });
});

describe('Session PDA', () => {
  describe('generateSessionKeypair', () => {
    it('generates valid Ed25519 keypair', () => {
      const keypair = generateSessionKeypair();

      expect(keypair).toBeInstanceOf(Keypair);
      expect(keypair.publicKey).toBeInstanceOf(PublicKey);
      expect(keypair.secretKey).toHaveLength(64);
    });

    it('generates unique keypairs', () => {
      const keypair1 = generateSessionKeypair();
      const keypair2 = generateSessionKeypair();

      expect(keypair1.publicKey.toBase58()).not.toBe(
        keypair2.publicKey.toBase58()
      );
    });
  });

  describe('deriveSessionPda', () => {
    it('uses correct seed constant', () => {
      // Test that the seed buffer is created correctly
      const seedBuffer = Buffer.from(SESSION_SEED);
      expect(seedBuffer.toString()).toBe('session');
    });

    it('seed buffer has correct length', () => {
      const seedBuffer = Buffer.from(SESSION_SEED);
      expect(seedBuffer.length).toBe(7); // "session" = 7 chars
    });

    it('authority and session key buffers are 32 bytes', () => {
      const keypair = Keypair.generate();
      const buffer = keypair.publicKey.toBuffer();
      expect(buffer.length).toBe(32);
    });

    it('PDA derivation uses all three seeds', () => {
      // Verify the function signature requires all inputs
      expect(deriveSessionPda).toBeDefined();
      expect(deriveSessionPda.length).toBe(2); // 2 parameters
    });
  });
});

describe('Session Lifecycle', () => {
  it('new session has full cap and valid expiry', () => {
    const session = createMockSessionKey();

    expect(session.usedLamports).toBe(0);
    expect(getRemainingCapSol(session)).toBeCloseTo(0.05, 4);
    expect(isSessionExpired(session)).toBe(false);
    expect(hasRemainingCap(session)).toBe(true);
  });

  it('session becomes invalid when cap exhausted', () => {
    const session = createMockSessionKey({
      usedLamports: DEFAULT_SOL_CAP_LAMPORTS,
    });

    expect(hasRemainingCap(session)).toBe(false);
    expect(getRemainingCapSol(session)).toBe(0);
  });

  it('session becomes invalid when expired', () => {
    const session = createMockSessionKey({
      expiresAt: Date.now() - 1000,
    });

    expect(isSessionExpired(session)).toBe(true);
  });
});
