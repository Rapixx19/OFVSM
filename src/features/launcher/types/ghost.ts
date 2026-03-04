/**
 * @file ghost.ts
 * @summary Type definitions for Ghost Engine atomic bundling
 * @dependencies @solana/web3.js, @coral-xyz/anchor
 */

import type { PublicKey } from '@solana/web3.js';
import type { BN } from '@coral-xyz/anchor';

/**
 * Launch parameters for atomic token creation
 */
export interface LaunchParams {
  /** Token name (3-32 characters) */
  name: string;
  /** Token symbol (2-10 characters, uppercase) */
  symbol: string;
  /** Token image URI (IPFS or HTTP) */
  imageUri: string;
  /** Optional token description */
  description?: string;

  /** Total token supply (in base units) */
  totalSupply: BN;
  /** SOL amount for initial liquidity */
  liquiditySol: BN;
  /** Token decimals (default 9) */
  decimals?: number;

  /** Lock duration in days (minimum 90) */
  lockDurationDays: number;
  /** Whether to permanently lock LP tokens */
  isPermanentLock: boolean;

  /** Jito tip amount in lamports */
  jitoTipLamports: BN;
  /** Whether to use Jito Block Engine */
  useJito: boolean;
}

/**
 * Addresses generated during bundle creation
 */
export interface BundleAddresses {
  /** Token mint address */
  mint: PublicKey;
  /** Raydium CPMM pool address */
  pool: PublicKey;
  /** LP token mint address */
  lpMint: PublicKey;
  /** Locker PDA address */
  locker: PublicKey;
  /** Vault PDA address (holds locked LP) */
  vault: PublicKey;
  /** Creator's LP token account */
  creatorLpAccount: PublicKey;
}

/**
 * Result of a successful bundle execution
 */
export interface BundleResult {
  /** Transaction signature */
  signature: string;
  /** Token mint address */
  mintAddress: PublicKey;
  /** Pool address */
  poolAddress: PublicKey;
  /** Locker PDA address */
  lockerAddress: PublicKey;
  /** Jito bundle ID (if Jito was used) */
  bundleId?: string;
  /** Block slot the transaction landed in */
  slot?: number;
}

/**
 * Fee breakdown for launch
 */
export interface FeeBreakdown {
  /** Platform fee in SOL */
  platformFeeSol: number;
  /** Jito tip in SOL */
  jitoTipSol: number;
  /** Rent for accounts in SOL */
  rentSol: number;
  /** Liquidity amount in SOL */
  liquiditySol: number;
  /** Total cost in SOL */
  totalSol: number;
}

/**
 * Bundle build result before sending
 */
export interface BuiltBundle {
  /** Serialized transaction bytes */
  serializedTransaction: Uint8Array;
  /** Generated addresses */
  addresses: BundleAddresses;
  /** Fee breakdown */
  fees: FeeBreakdown;
  /** Number of instructions in bundle */
  instructionCount: number;
  /** Blockhash used */
  blockhash: string;
  /** Last valid block height */
  lastValidBlockHeight: number;
}

/**
 * Ghost launch status
 */
export type LaunchStatus =
  | 'idle'
  | 'building'
  | 'signing'
  | 'sending'
  | 'confirming'
  | 'success'
  | 'error';

/**
 * Stepper step definitions
 */
export type StepId = 1 | 2 | 3;

export interface StepConfig {
  id: StepId;
  title: string;
  description: string;
}

export const STEPS: StepConfig[] = [
  {
    id: 1,
    title: 'Branding',
    description: 'Name, symbol, and image',
  },
  {
    id: 2,
    title: 'Economics',
    description: 'Liquidity and lock settings',
  },
  {
    id: 3,
    title: 'Launch',
    description: 'Review and deploy',
  },
];

/**
 * Validation errors for launch params
 */
export interface ValidationErrors {
  name?: string;
  symbol?: string;
  imageUri?: string;
  liquiditySol?: string;
  lockDurationDays?: string;
}

/**
 * Validate launch parameters
 */
export function validateLaunchParams(
  params: Partial<LaunchParams>
): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!params.name) {
    errors.name = 'Name is required';
  } else if (params.name.length < 3) {
    errors.name = 'Name must be at least 3 characters';
  } else if (params.name.length > 32) {
    errors.name = 'Name must be at most 32 characters';
  }

  if (!params.symbol) {
    errors.symbol = 'Symbol is required';
  } else if (params.symbol.length < 2) {
    errors.symbol = 'Symbol must be at least 2 characters';
  } else if (params.symbol.length > 10) {
    errors.symbol = 'Symbol must be at most 10 characters';
  } else if (!/^[A-Z0-9]+$/.test(params.symbol)) {
    errors.symbol = 'Symbol must be uppercase letters and numbers only';
  }

  if (!params.imageUri) {
    errors.imageUri = 'Image is required';
  }

  if (params.liquiditySol) {
    const solAmount = params.liquiditySol.toNumber() / 1e9;
    if (solAmount < 0.5) {
      errors.liquiditySol = 'Minimum liquidity is 0.5 SOL';
    } else if (solAmount > 100) {
      errors.liquiditySol = 'Maximum liquidity is 100 SOL';
    }
  }

  if (params.lockDurationDays !== undefined) {
    if (params.lockDurationDays < 90) {
      errors.lockDurationDays = 'Minimum lock duration is 90 days';
    }
  }

  return errors;
}

/**
 * Check if params are valid for launch
 */
export function isValidForLaunch(params: Partial<LaunchParams>): boolean {
  const errors = validateLaunchParams(params);
  return Object.keys(errors).length === 0;
}
