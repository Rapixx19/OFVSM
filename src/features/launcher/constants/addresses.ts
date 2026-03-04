/**
 * @file addresses.ts
 * @summary Program IDs, fee wallets, and Jito tip accounts for Ghost Engine
 * @dependencies @solana/web3.js
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Raydium CPMM Program (Mainnet)
 * Concentrated Pool Market Maker for efficient AMM swaps
 */
export const RAYDIUM_CPMM_PROGRAM = new PublicKey(
  'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C'
);

/**
 * Raydium CPMM Authority PDA
 */
export const RAYDIUM_AUTHORITY = new PublicKey(
  'GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ'
);

/**
 * Raydium AMM Config for standard pools
 */
export const RAYDIUM_AMM_CONFIG = new PublicKey(
  'D4FPEruKEHrG5TenZ2Yaq7vmxLqmxj3XLNQBY4VjJKmx'
);

/**
 * Token-2022 Program ID
 */
export const TOKEN_2022_PROGRAM_ID = new PublicKey(
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
);

/**
 * Token Metadata Program (Metaplex)
 */
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
);

/**
 * VECTERAI Locker Program ID
 * Replace with actual deployed program ID
 * Using Token Program format as placeholder
 */
export const LOCKER_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_LOCKER_PROGRAM_ID ||
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
);

/**
 * VECTERAI Platform Fee Wallet
 * This address receives the 1% platform fee from each launch
 * Using Associated Token Program as placeholder
 */
export const VECTERAI_FEE_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_VECTERAI_FEE_WALLET ||
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
);

/**
 * Platform fee in basis points (100 = 1%)
 */
export const PLATFORM_FEE_BPS =
  Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_BPS) || 100;

/**
 * Minimum Jito tip in lamports (0.00001 SOL)
 */
export const MINIMUM_TIP_LAMPORTS = 10_000;

/**
 * Default Jito tip in lamports (0.001 SOL)
 */
export const DEFAULT_TIP_LAMPORTS = 1_000_000;

/**
 * Maximum Jito tip in lamports (0.1 SOL)
 */
export const MAXIMUM_TIP_LAMPORTS = 100_000_000;

/**
 * Jito Block Engine URL
 */
export const JITO_BLOCK_ENGINE_URL =
  process.env.NEXT_PUBLIC_JITO_BLOCK_ENGINE_URL ||
  'https://mainnet.block-engine.jito.wtf';

/**
 * Jito tip accounts (8 accounts for random selection)
 * These are official Jito tip payment addresses
 */
export const JITO_TIP_ACCOUNTS: PublicKey[] = [
  new PublicKey('96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'),
  new PublicKey('HFqU5x63VTqvQss8hp11i4bVmkdzGZVJCbGxRJe5mq7X'),
  new PublicKey('Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY'),
  new PublicKey('ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49'),
  new PublicKey('DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh'),
  new PublicKey('ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt'),
  new PublicKey('DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL'),
  new PublicKey('3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT'),
];

/**
 * Get a random Jito tip account
 * Randomization prevents MEV bots from predicting tip destination
 */
export function getRandomTipAccount(): PublicKey {
  const index = Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length);
  return JITO_TIP_ACCOUNTS[index];
}

/**
 * Rent-exempt minimum for various account types (in lamports)
 */
export const RENT_EXEMPTION = {
  /** Mint account (Token-2022 with metadata) */
  MINT: 2_039_280,
  /** Token account */
  TOKEN_ACCOUNT: 2_039_280,
  /** Metadata account (approximate) */
  METADATA: 5_616_000,
  /** Locker PDA */
  LOCKER: 1_461_600,
  /** Pool state (Raydium CPMM) */
  POOL: 10_000_000,
} as const;

/**
 * Minimum SOL liquidity (0.5 SOL)
 */
export const MIN_LIQUIDITY_SOL = 0.5;

/**
 * Maximum SOL liquidity (100 SOL)
 */
export const MAX_LIQUIDITY_SOL = 100;

/**
 * Default token decimals
 */
export const DEFAULT_DECIMALS = 9;

/**
 * Default total supply (1 billion tokens)
 */
export const DEFAULT_TOTAL_SUPPLY = 1_000_000_000;

/**
 * Lock duration options in days
 */
export const LOCK_DURATION_OPTIONS = [
  { label: '90 Days (Minimum)', value: 90 },
  { label: '180 Days', value: 180 },
  { label: '1 Year', value: 365 },
  { label: 'Permanent', value: -1 }, // -1 indicates permanent
] as const;

/**
 * Calculate platform fee from liquidity amount
 * @param liquidityLamports - Liquidity amount in lamports
 * @returns Fee amount in lamports
 */
export function calculatePlatformFee(liquidityLamports: bigint): bigint {
  return (liquidityLamports * BigInt(PLATFORM_FEE_BPS)) / BigInt(10_000);
}

/**
 * Calculate total rent needed for launch
 * @returns Total rent in lamports
 */
export function calculateTotalRent(): number {
  return (
    RENT_EXEMPTION.MINT +
    RENT_EXEMPTION.METADATA +
    RENT_EXEMPTION.TOKEN_ACCOUNT * 2 + // Creator ATA + LP ATA
    RENT_EXEMPTION.POOL +
    RENT_EXEMPTION.LOCKER
  );
}
