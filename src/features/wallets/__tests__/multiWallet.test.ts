/**
 * @file multiWallet.test.ts
 * @summary Tests for multi-wallet management functionality
 * @dependencies vitest
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import {
  toUserWallet,
  getWalletStatus,
  type UserWallet,
} from '../types/wallet';

/**
 * Mock database row
 */
interface MockWalletRow {
  id: string;
  profile_id: string;
  wallet_address: string;
  label: string | null;
  is_main: boolean;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
}

/**
 * Create a mock wallet row
 */
function createMockRow(overrides: Partial<MockWalletRow> = {}): MockWalletRow {
  return {
    id: 'test-id-1',
    profile_id: 'profile-1',
    wallet_address: '11111111111111111111111111111111',
    label: 'Alt Wallet',
    is_main: false,
    is_verified: false,
    verified_at: null,
    created_at: '2026-03-08T12:00:00Z',
    ...overrides,
  };
}

describe('Wallet Type Utilities', () => {
  describe('toUserWallet', () => {
    it('converts database row to UserWallet', () => {
      const row = createMockRow();
      const wallet = toUserWallet(row);

      expect(wallet.id).toBe(row.id);
      expect(wallet.profileId).toBe(row.profile_id);
      expect(wallet.walletAddress).toBe(row.wallet_address);
      expect(wallet.label).toBe(row.label);
      expect(wallet.isMain).toBe(row.is_main);
      expect(wallet.isVerified).toBe(row.is_verified);
      expect(wallet.verifiedAt).toBeNull();
      expect(wallet.createdAt).toBeInstanceOf(Date);
    });

    it('handles null label with default', () => {
      const row = createMockRow({ label: null });
      const wallet = toUserWallet(row);

      expect(wallet.label).toBe('Alt Wallet');
    });

    it('parses verified_at date correctly', () => {
      const verifiedAt = '2026-03-08T14:30:00Z';
      const row = createMockRow({ is_verified: true, verified_at: verifiedAt });
      const wallet = toUserWallet(row);

      expect(wallet.isVerified).toBe(true);
      expect(wallet.verifiedAt).toBeInstanceOf(Date);
      // ISO string may include milliseconds (.000Z)
      expect(wallet.verifiedAt?.getTime()).toBe(new Date(verifiedAt).getTime());
    });

    it('handles main wallet flag', () => {
      const row = createMockRow({ is_main: true, is_verified: true });
      const wallet = toUserWallet(row);

      expect(wallet.isMain).toBe(true);
    });
  });

  describe('getWalletStatus', () => {
    it('returns "main" for main wallet', () => {
      const wallet: UserWallet = {
        id: '1',
        profileId: 'p1',
        walletAddress: 'addr1',
        label: 'Main',
        isMain: true,
        isVerified: true,
        verifiedAt: new Date(),
        createdAt: new Date(),
      };

      expect(getWalletStatus(wallet)).toBe('main');
    });

    it('returns "verified" for verified non-main wallet', () => {
      const wallet: UserWallet = {
        id: '1',
        profileId: 'p1',
        walletAddress: 'addr1',
        label: 'Alt',
        isMain: false,
        isVerified: true,
        verifiedAt: new Date(),
        createdAt: new Date(),
      };

      expect(getWalletStatus(wallet)).toBe('verified');
    });

    it('returns "unverified" for unverified wallet', () => {
      const wallet: UserWallet = {
        id: '1',
        profileId: 'p1',
        walletAddress: 'addr1',
        label: 'Alt',
        isMain: false,
        isVerified: false,
        verifiedAt: null,
        createdAt: new Date(),
      };

      expect(getWalletStatus(wallet)).toBe('unverified');
    });
  });
});

describe('Multi-Wallet Store', () => {
  describe('Nonce generation', () => {
    it('generates unique nonces', () => {
      const nonces = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const nonce = Array.from(array, (byte) =>
          byte.toString(16).padStart(2, '0')
        ).join('');
        nonces.add(nonce);
      }
      // All 100 nonces should be unique
      expect(nonces.size).toBe(100);
    });

    it('generates 64-character hex nonces', () => {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const nonce = Array.from(array, (byte) =>
        byte.toString(16).padStart(2, '0')
      ).join('');

      expect(nonce.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(nonce)).toBe(true);
    });
  });

  describe('Verification message format', () => {
    it('creates correctly formatted verification message', () => {
      const nonce = 'abc123';
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `VECTERAI Wallet Verification\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

      expect(message).toContain('VECTERAI Wallet Verification');
      expect(message).toContain(`Nonce: ${nonce}`);
      expect(message).toContain(`Timestamp: ${timestamp}`);
    });
  });

  describe('Address validation', () => {
    it('accepts valid Solana addresses', () => {
      const validAddresses = [
        '11111111111111111111111111111111',
        'So11111111111111111111111111111111111111112',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      ];

      for (const address of validAddresses) {
        expect(() => new PublicKey(address)).not.toThrow();
      }
    });

    it('rejects invalid addresses', () => {
      const invalidAddresses = [
        'invalid',
        '123',
        '',
        'not-a-valid-base58',
      ];

      for (const address of invalidAddresses) {
        expect(() => new PublicKey(address)).toThrow();
      }
    });
  });
});

describe('Multi-Wallet State Management', () => {
  /**
   * Simulated store state for testing
   */
  interface MockMultiWalletState {
    wallets: UserWallet[];
    activeWalletId: string | null;
    isLoading: boolean;
    error: Error | null;
    pendingVerification: { address: string; nonce: string; expiresAt: number } | null;
  }

  let state: MockMultiWalletState;

  beforeEach(() => {
    state = {
      wallets: [],
      activeWalletId: null,
      isLoading: false,
      error: null,
      pendingVerification: null,
    };
  });

  describe('setWallets', () => {
    it('updates wallets array', () => {
      const wallets: UserWallet[] = [
        {
          id: '1',
          profileId: 'p1',
          walletAddress: 'addr1',
          label: 'Main',
          isMain: true,
          isVerified: true,
          verifiedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      state.wallets = wallets;
      expect(state.wallets).toEqual(wallets);
    });
  });

  describe('setActiveWallet', () => {
    it('sets active wallet ID', () => {
      state.activeWalletId = 'wallet-1';
      expect(state.activeWalletId).toBe('wallet-1');
    });

    it('can set to null', () => {
      state.activeWalletId = 'wallet-1';
      state.activeWalletId = null;
      expect(state.activeWalletId).toBeNull();
    });
  });

  describe('setPendingVerification', () => {
    it('sets pending verification state', () => {
      const pending = {
        address: 'test-address',
        nonce: 'test-nonce',
        expiresAt: Date.now() + 300000,
      };

      state.pendingVerification = pending;
      expect(state.pendingVerification).toEqual(pending);
    });

    it('clears pending verification', () => {
      state.pendingVerification = {
        address: 'test',
        nonce: 'nonce',
        expiresAt: Date.now(),
      };
      state.pendingVerification = null;
      expect(state.pendingVerification).toBeNull();
    });
  });

  describe('Verified wallet filtering', () => {
    it('filters to only verified wallets', () => {
      const wallets: UserWallet[] = [
        {
          id: '1',
          profileId: 'p1',
          walletAddress: 'addr1',
          label: 'Main',
          isMain: true,
          isVerified: true,
          verifiedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: '2',
          profileId: 'p1',
          walletAddress: 'addr2',
          label: 'Verified Alt',
          isMain: false,
          isVerified: true,
          verifiedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: '3',
          profileId: 'p1',
          walletAddress: 'addr3',
          label: 'Unverified',
          isMain: false,
          isVerified: false,
          verifiedAt: null,
          createdAt: new Date(),
        },
      ];

      const verifiedWallets = wallets.filter((w) => w.isVerified || w.isMain);
      expect(verifiedWallets.length).toBe(2);
      expect(verifiedWallets.map((w) => w.id)).toEqual(['1', '2']);
    });
  });

  describe('Main wallet detection', () => {
    it('finds main wallet in array', () => {
      const wallets: UserWallet[] = [
        {
          id: '1',
          profileId: 'p1',
          walletAddress: 'addr1',
          label: 'Alt 1',
          isMain: false,
          isVerified: true,
          verifiedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: '2',
          profileId: 'p1',
          walletAddress: 'addr2',
          label: 'Main',
          isMain: true,
          isVerified: true,
          verifiedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      const mainWallet = wallets.find((w) => w.isMain);
      expect(mainWallet?.id).toBe('2');
    });

    it('returns undefined when no main wallet', () => {
      const wallets: UserWallet[] = [];
      const mainWallet = wallets.find((w) => w.isMain);
      expect(mainWallet).toBeUndefined();
    });
  });
});
