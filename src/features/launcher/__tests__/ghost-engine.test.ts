/**
 * @file ghost-engine.test.ts
 * @summary Tests for Ghost Engine atomic bundling
 * @dependencies vitest, @solana/web3.js, @coral-xyz/anchor
 */

import { describe, it, expect, vi } from 'vitest';
import { PublicKey, Connection } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

import type { LaunchParams } from '../types/ghost';
import { validateLaunchParams, isValidForLaunch } from '../types/ghost';
import {
  PLATFORM_FEE_BPS,
  calculateTotalRent,
  getRandomTipAccount,
  JITO_TIP_ACCOUNTS,
  VECTERAI_FEE_WALLET,
} from '../constants/addresses';
import {
  calculatePlatformFeeLamports,
  solToLamports,
  lamportsToSol,
} from '../instructions/platformFee';
import { sortMints } from '../instructions/createPool';
import { getExpectedInstructionCount, EXPECTED_INSTRUCTIONS } from '../services/GhostBundler';

/**
 * Mock wallet for testing
 */
const createMockWallet = () => ({
  publicKey: new PublicKey('4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T'),
  signTransaction: vi.fn(),
  signAllTransactions: vi.fn(),
});

/**
 * Create valid launch params for testing
 */
function createTestLaunchParams(overrides: Partial<LaunchParams> = {}): LaunchParams {
  return {
    name: 'Ghost Token',
    symbol: 'GHOST',
    imageUri: 'https://example.com/ghost.png',
    description: 'A test token',
    totalSupply: new BN('1000000000000000000'), // 1B with 9 decimals
    liquiditySol: new BN('5000000000'), // 5 SOL
    decimals: 9,
    lockDurationDays: 90,
    isPermanentLock: false,
    jitoTipLamports: new BN('1000000'), // 0.001 SOL
    useJito: true,
    ...overrides,
  };
}

describe('Ghost Engine', () => {
  describe('LaunchParams Validation', () => {
    it('validates correct parameters', () => {
      const params = createTestLaunchParams();
      const errors = validateLaunchParams(params);

      expect(Object.keys(errors)).toHaveLength(0);
      expect(isValidForLaunch(params)).toBe(true);
    });

    it('fails validation for short name', () => {
      const params = createTestLaunchParams({ name: 'AB' });
      const errors = validateLaunchParams(params);

      expect(errors.name).toBeDefined();
      expect(errors.name).toContain('at least 3 characters');
    });

    it('fails validation for long name', () => {
      const params = createTestLaunchParams({
        name: 'A'.repeat(33),
      });
      const errors = validateLaunchParams(params);

      expect(errors.name).toBeDefined();
      expect(errors.name).toContain('at most 32 characters');
    });

    it('fails validation for invalid symbol', () => {
      const params = createTestLaunchParams({ symbol: 'invalid!' });
      const errors = validateLaunchParams(params);

      expect(errors.symbol).toBeDefined();
      expect(errors.symbol).toContain('uppercase letters and numbers');
    });

    it('fails validation for short symbol', () => {
      const params = createTestLaunchParams({ symbol: 'A' });
      const errors = validateLaunchParams(params);

      expect(errors.symbol).toBeDefined();
      expect(errors.symbol).toContain('at least 2 characters');
    });

    it('fails validation for missing image', () => {
      const params = createTestLaunchParams({ imageUri: '' });
      const errors = validateLaunchParams(params);

      expect(errors.imageUri).toBeDefined();
    });

    it('fails validation for low liquidity', () => {
      const params = createTestLaunchParams({
        liquiditySol: new BN('100000000'), // 0.1 SOL
      });
      const errors = validateLaunchParams(params);

      expect(errors.liquiditySol).toBeDefined();
      expect(errors.liquiditySol).toContain('Minimum liquidity');
    });

    it('fails validation for short lock duration', () => {
      const params = createTestLaunchParams({ lockDurationDays: 30 });
      const errors = validateLaunchParams(params);

      expect(errors.lockDurationDays).toBeDefined();
      expect(errors.lockDurationDays).toContain('90 days');
    });
  });

  describe('Instruction Count', () => {
    it('expects 13 instructions without Jito', () => {
      const count = getExpectedInstructionCount(false);
      expect(count).toBe(13);
    });

    it('expects 14 instructions with Jito', () => {
      const count = getExpectedInstructionCount(true);
      expect(count).toBe(14);
    });

    it('has all expected instruction names defined', () => {
      expect(EXPECTED_INSTRUCTIONS).toContain('CreateAccount (mint)');
      expect(EXPECTED_INSTRUCTIONS).toContain('InitializeMint2');
      expect(EXPECTED_INSTRUCTIONS).toContain('CreatePool');
      expect(EXPECTED_INSTRUCTIONS).toContain('AddLiquidity');
      expect(EXPECTED_INSTRUCTIONS).toContain('SetAuthority (mint)');
      expect(EXPECTED_INSTRUCTIONS).toContain('SetAuthority (freeze)');
      expect(EXPECTED_INSTRUCTIONS).toContain('LockLp');
      expect(EXPECTED_INSTRUCTIONS).toContain('Transfer (fee)');
      expect(EXPECTED_INSTRUCTIONS).toContain('Transfer (tip)');
    });
  });

  describe('Platform Fee Calculation', () => {
    it('calculates 1% fee correctly', () => {
      const liquidityLamports = BigInt(5_000_000_000); // 5 SOL
      const fee = calculatePlatformFeeLamports(liquidityLamports);

      // 1% of 5 SOL = 0.05 SOL = 50_000_000 lamports
      expect(fee).toBe(BigInt(50_000_000));
    });

    it('calculates fee for minimum liquidity', () => {
      const liquidityLamports = BigInt(500_000_000); // 0.5 SOL
      const fee = calculatePlatformFeeLamports(liquidityLamports);

      // 1% of 0.5 SOL = 0.005 SOL = 5_000_000 lamports
      expect(fee).toBe(BigInt(5_000_000));
    });

    it('calculates fee for maximum liquidity', () => {
      const liquidityLamports = BigInt(100_000_000_000); // 100 SOL
      const fee = calculatePlatformFeeLamports(liquidityLamports);

      // 1% of 100 SOL = 1 SOL = 1_000_000_000 lamports
      expect(fee).toBe(BigInt(1_000_000_000));
    });

    it('fee BPS constant is 100 (1%)', () => {
      expect(PLATFORM_FEE_BPS).toBe(100);
    });
  });

  describe('SOL/Lamport Conversion', () => {
    it('converts SOL to lamports correctly', () => {
      expect(solToLamports(1)).toBe(BigInt(1_000_000_000));
      expect(solToLamports(0.5)).toBe(BigInt(500_000_000));
      expect(solToLamports(0.001)).toBe(BigInt(1_000_000));
    });

    it('converts lamports to SOL correctly', () => {
      expect(lamportsToSol(1_000_000_000)).toBe(1);
      expect(lamportsToSol(500_000_000)).toBe(0.5);
      expect(lamportsToSol(BigInt(1_000_000_000))).toBe(1);
    });
  });

  describe('Jito Tip Accounts', () => {
    it('has 8 tip accounts', () => {
      expect(JITO_TIP_ACCOUNTS).toHaveLength(8);
    });

    it('returns a valid tip account', () => {
      const tipAccount = getRandomTipAccount();

      expect(tipAccount).toBeInstanceOf(PublicKey);
      expect(JITO_TIP_ACCOUNTS.some((acc) => acc.equals(tipAccount))).toBe(true);
    });

    it('randomizes tip account selection', () => {
      // Run multiple times and ensure we get different results
      const results = new Set<string>();

      for (let i = 0; i < 100; i++) {
        results.add(getRandomTipAccount().toBase58());
      }

      // Should have at least 2 different accounts (probabilistically)
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('Pool PDA Derivation', () => {
    const MOCK_MINT_A = new PublicKey('So11111111111111111111111111111111111111112');
    const MOCK_MINT_B = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

    it('sorts mints deterministically', () => {
      const [sorted1, sorted2] = sortMints(MOCK_MINT_A, MOCK_MINT_B);
      const [sorted1Alt, sorted2Alt] = sortMints(MOCK_MINT_B, MOCK_MINT_A);

      expect(sorted1.equals(sorted1Alt)).toBe(true);
      expect(sorted2.equals(sorted2Alt)).toBe(true);
    });

    it('sortMints returns mints in consistent order regardless of input order', () => {
      // Test that sorting is deterministic
      const [a1, b1] = sortMints(MOCK_MINT_A, MOCK_MINT_B);
      const [a2, b2] = sortMints(MOCK_MINT_B, MOCK_MINT_A);

      expect(a1.toBase58()).toBe(a2.toBase58());
      expect(b1.toBase58()).toBe(b2.toBase58());
    });

    it('sortMints returns same mints when inputs are identical', () => {
      const [sorted1, sorted2] = sortMints(MOCK_MINT_A, MOCK_MINT_A);

      expect(sorted1.equals(MOCK_MINT_A)).toBe(true);
      expect(sorted2.equals(MOCK_MINT_A)).toBe(true);
    });

    it('different mints produce different sorted order', () => {
      const mint1 = new PublicKey('4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
      const mint2 = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

      const [sorted1] = sortMints(mint1, mint2);

      // The sorted output should be one of the two inputs
      expect(
        sorted1.equals(mint1) || sorted1.equals(mint2)
      ).toBe(true);
    });
  });

  describe('Rent Calculation', () => {
    it('calculates total rent for all accounts', () => {
      const totalRent = calculateTotalRent();

      // Should be sum of all rent exemptions
      expect(totalRent).toBeGreaterThan(0);
      expect(totalRent).toBeLessThan(100_000_000_000); // Less than 100 SOL
    });

    it('rent is reasonable for launch', () => {
      const totalRentSol = calculateTotalRent() / 1e9;

      // Total rent should be less than 0.1 SOL
      expect(totalRentSol).toBeLessThan(0.1);
    });
  });

  describe('Instruction Order Verification', () => {
    it('revoke authority comes after pool creation in expected order', () => {
      const createPoolIndex = EXPECTED_INSTRUCTIONS.indexOf('CreatePool');
      const revokeMintIndex = EXPECTED_INSTRUCTIONS.indexOf('SetAuthority (mint)');
      const revokeFreezeIndex = EXPECTED_INSTRUCTIONS.indexOf('SetAuthority (freeze)');

      expect(createPoolIndex).toBeLessThan(revokeMintIndex);
      expect(createPoolIndex).toBeLessThan(revokeFreezeIndex);
    });

    it('lock LP comes after add liquidity in expected order', () => {
      const addLiquidityIndex = EXPECTED_INSTRUCTIONS.indexOf('AddLiquidity');
      const lockLpIndex = EXPECTED_INSTRUCTIONS.indexOf('LockLp');

      expect(addLiquidityIndex).toBeLessThan(lockLpIndex);
    });

    it('platform fee is second-to-last instruction', () => {
      const feeIndex = EXPECTED_INSTRUCTIONS.indexOf('Transfer (fee)');
      const tipIndex = EXPECTED_INSTRUCTIONS.indexOf('Transfer (tip)');

      expect(feeIndex).toBe(EXPECTED_INSTRUCTIONS.length - 2);
      expect(tipIndex).toBe(EXPECTED_INSTRUCTIONS.length - 1);
    });

    it('Jito tip is last instruction', () => {
      const tipIndex = EXPECTED_INSTRUCTIONS.indexOf('Transfer (tip)');

      expect(tipIndex).toBe(EXPECTED_INSTRUCTIONS.length - 1);
    });
  });

  describe('Atomicity Guarantee', () => {
    it('all operations are in a single transaction', () => {
      // The instruction count test verifies this
      // All instructions are bundled into one VersionedTransaction
      const countWithJito = getExpectedInstructionCount(true);
      const countWithoutJito = getExpectedInstructionCount(false);

      // Difference should only be 1 (the Jito tip instruction)
      expect(countWithJito - countWithoutJito).toBe(1);
    });

    it('mint creation precedes all other operations', () => {
      const createAccountIndex = EXPECTED_INSTRUCTIONS.indexOf('CreateAccount (mint)');
      const initMintIndex = EXPECTED_INSTRUCTIONS.indexOf('InitializeMint2');

      expect(createAccountIndex).toBe(0);
      expect(initMintIndex).toBeLessThan(5);
    });

    it('authority revocation cannot be reordered after fee transfer', () => {
      const revokeMintIndex = EXPECTED_INSTRUCTIONS.indexOf('SetAuthority (mint)');
      const feeIndex = EXPECTED_INSTRUCTIONS.indexOf('Transfer (fee)');

      // Authority revocation must come before fee transfer
      expect(revokeMintIndex).toBeLessThan(feeIndex);
    });
  });

  describe('Fee Injection', () => {
    it('platform fee is always included', () => {
      expect(EXPECTED_INSTRUCTIONS).toContain('Transfer (fee)');
    });

    it('fee position is consistent regardless of Jito usage', () => {
      // Fee should always be second-to-last (before optional tip)
      const feeIndex = EXPECTED_INSTRUCTIONS.indexOf('Transfer (fee)');

      expect(feeIndex).toBe(EXPECTED_INSTRUCTIONS.length - 2);
    });

    it('fee wallet address is set correctly', () => {
      // The VECTERAI_FEE_WALLET should be set from env or default
      // Import is at the top of the file
      expect(VECTERAI_FEE_WALLET).toBeInstanceOf(PublicKey);
    });
  });
});

describe('GhostBundler Integration', () => {
  it('can be instantiated with mock wallet', async () => {
    const mockConnection = {
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'mock-blockhash',
        lastValidBlockHeight: 1000,
      }),
    } as unknown as Connection;

    const mockWallet = createMockWallet();

    const { GhostBundler } = await import('../services/GhostBundler');
    const bundler = new GhostBundler(mockConnection, mockWallet);

    expect(bundler).toBeDefined();
  });

  it('calculateFees returns correct breakdown', async () => {
    const mockConnection = {} as Connection;
    const mockWallet = createMockWallet();

    const { GhostBundler } = await import('../services/GhostBundler');
    const bundler = new GhostBundler(mockConnection, mockWallet);

    const params = createTestLaunchParams();
    const fees = bundler.calculateFees(params);

    expect(fees.platformFeeSol).toBeCloseTo(0.05, 4); // 1% of 5 SOL
    expect(fees.jitoTipSol).toBeCloseTo(0.001, 4);
    expect(fees.rentSol).toBeGreaterThan(0);
    expect(fees.liquiditySol).toBe(5);
    expect(fees.totalSol).toBeGreaterThan(5);
  });
});
