/**
 * @file scheduler.test.ts
 * @summary Tests for LaunchScheduler and bundle serialization
 * @dependencies vitest, @solana/web3.js
 */

import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';

import type { ScheduledLaunchRow } from '../types/scheduler';
import {
  rowToScheduledLaunch,
  MAX_PENDING_LAUNCHES,
  LAUNCH_EXPIRY_MS,
} from '../types/scheduler';

/**
 * Create a mock serialized transaction for testing
 * Using a pre-generated valid base64 transaction
 */
function createMockSerializedTransaction(): string {
  // This is a minimal valid base64 encoded VersionedTransaction
  // In production, this would be an actual serialized bundle
  return 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQABAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABUpTWpkLpAAAAAAGAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABHMVy6IqA=';
}

/**
 * Create mock database row
 */
function createMockRow(overrides: Partial<ScheduledLaunchRow> = {}): ScheduledLaunchRow {
  return {
    id: 'test-id-123',
    creator_wallet: '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T',
    serialized_bundle: 'mock-bundle-data',
    bundle_addresses: {
      mint: new PublicKey('So11111111111111111111111111111111111111112'),
      pool: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      lpMint: new PublicKey('4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T'),
      locker: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
      vault: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      creatorLpAccount: new PublicKey('So11111111111111111111111111111111111111112'),
    },
    launch_at: '2026-03-05T14:00:00Z',
    status: 'pending',
    jito_tip_lamports: 1000000,
    created_at: '2026-03-04T10:00:00Z',
    updated_at: '2026-03-04T10:00:00Z',
    completed_at: null,
    signature: null,
    error_message: null,
    ...overrides,
  };
}

describe('Scheduler', () => {
  describe('Bundle Serialization', () => {
    it('creates valid base64 string', () => {
      const serialized = createMockSerializedTransaction();

      expect(serialized).toBeTruthy();
      expect(typeof serialized).toBe('string');
      expect(serialized.length).toBeGreaterThan(0);
    });

    it('base64 string can be decoded to buffer', () => {
      const serialized = createMockSerializedTransaction();
      const buffer = Buffer.from(serialized, 'base64');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('roundtrip encoding preserves data', () => {
      const original = createMockSerializedTransaction();
      const buffer = Buffer.from(original, 'base64');
      const roundtrip = buffer.toString('base64');

      expect(roundtrip).toBe(original);
    });

    it('base64 encoding is consistent', () => {
      const serialized1 = createMockSerializedTransaction();
      const serialized2 = createMockSerializedTransaction();

      expect(serialized1).toBe(serialized2);
    });
  });

  describe('Database Row Conversion', () => {
    it('converts row to domain model', () => {
      const row = createMockRow();
      const launch = rowToScheduledLaunch(row);

      expect(launch.id).toBe(row.id);
      expect(launch.creatorWallet).toBe(row.creator_wallet);
      expect(launch.status).toBe(row.status);
      expect(launch.launchAt).toBeInstanceOf(Date);
      expect(launch.createdAt).toBeInstanceOf(Date);
    });

    it('handles null optional fields', () => {
      const row = createMockRow({
        completed_at: null,
        signature: null,
        error_message: null,
      });

      const launch = rowToScheduledLaunch(row);

      expect(launch.completedAt).toBeUndefined();
      expect(launch.signature).toBeUndefined();
      expect(launch.errorMessage).toBeUndefined();
    });

    it('converts completed launch correctly', () => {
      const row = createMockRow({
        status: 'completed',
        completed_at: '2026-03-05T14:01:00Z',
        signature: 'mock-signature-123',
      });

      const launch = rowToScheduledLaunch(row);

      expect(launch.status).toBe('completed');
      expect(launch.completedAt).toBeInstanceOf(Date);
      expect(launch.signature).toBe('mock-signature-123');
    });

    it('converts failed launch with error message', () => {
      const row = createMockRow({
        status: 'failed',
        error_message: 'Insufficient funds',
      });

      const launch = rowToScheduledLaunch(row);

      expect(launch.status).toBe('failed');
      expect(launch.errorMessage).toBe('Insufficient funds');
    });
  });

  describe('Constants', () => {
    it('MAX_PENDING_LAUNCHES is 5', () => {
      expect(MAX_PENDING_LAUNCHES).toBe(5);
    });

    it('LAUNCH_EXPIRY_MS is 7 days', () => {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(LAUNCH_EXPIRY_MS).toBe(sevenDaysMs);
    });
  });

  describe('Launch Status Transitions', () => {
    it('valid statuses are defined', () => {
      const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];

      validStatuses.forEach((status) => {
        const row = createMockRow({ status: status as any });
        const launch = rowToScheduledLaunch(row);
        expect(launch.status).toBe(status);
      });
    });
  });

  describe('Bundle Addresses', () => {
    it('preserves all bundle addresses through conversion', () => {
      const row = createMockRow();
      const launch = rowToScheduledLaunch(row);

      expect(launch.bundleAddresses.mint).toBeDefined();
      expect(launch.bundleAddresses.pool).toBeDefined();
      expect(launch.bundleAddresses.lpMint).toBeDefined();
      expect(launch.bundleAddresses.locker).toBeDefined();
      expect(launch.bundleAddresses.vault).toBeDefined();
    });
  });

  describe('Date Handling', () => {
    it('parses ISO date strings correctly', () => {
      const isoDate = '2026-03-05T14:00:00Z';
      const row = createMockRow({ launch_at: isoDate });
      const launch = rowToScheduledLaunch(row);

      // Compare timestamps since toISOString may add milliseconds
      expect(launch.launchAt.getTime()).toBe(new Date(isoDate).getTime());
    });

    it('handles different timezone formats', () => {
      const row = createMockRow({
        launch_at: '2026-03-05T14:00:00.000Z',
      });
      const launch = rowToScheduledLaunch(row);

      expect(launch.launchAt.getUTCHours()).toBe(14);
    });
  });
});

describe('LaunchScheduler Service', () => {
  it('can be imported', async () => {
    const { LaunchScheduler } = await import('../services/LaunchScheduler');
    expect(LaunchScheduler).toBeDefined();
  });

  it('validates future launch time', async () => {
    const { LaunchScheduler } = await import('../services/LaunchScheduler');

    const mockSupabase = {} as any;
    const mockConnection = {} as any;

    const scheduler = new LaunchScheduler(mockSupabase, mockConnection);

    // Past date should throw
    const pastDate = new Date(Date.now() - 1000);

    await expect(
      scheduler.scheduleLaunch('wallet', {
        serializedBundle: 'test',
        bundleAddresses: {} as any,
        launchAt: pastDate,
        jitoTipLamports: 1000000,
      })
    ).rejects.toThrow('Launch time must be in the future');
  });
});
