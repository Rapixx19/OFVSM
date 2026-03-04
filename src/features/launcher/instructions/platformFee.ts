/**
 * @file platformFee.ts
 * @summary Instructions for VECTERAI platform fee and Jito tip transfers
 * @dependencies @solana/web3.js
 */

import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  VECTERAI_FEE_WALLET,
  PLATFORM_FEE_BPS,
  getRandomTipAccount,
  MINIMUM_TIP_LAMPORTS,
} from '../constants/addresses';

/**
 * Create instruction to transfer platform fee
 *
 * @param payer - Fee payer public key
 * @param feeLamports - Fee amount in lamports
 * @returns Instruction to transfer platform fee
 */
export function createPlatformFeeInstruction(
  payer: PublicKey,
  feeLamports: bigint
): TransactionInstruction {
  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: VECTERAI_FEE_WALLET,
    lamports: feeLamports,
  });
}

/**
 * Create instruction to transfer Jito tip
 * Uses a random tip account to prevent MEV targeting
 *
 * @param payer - Tip payer public key
 * @param tipLamports - Tip amount in lamports
 * @param tipAccount - Optional specific tip account (random if not provided)
 * @returns Instruction to transfer Jito tip
 */
export function createJitoTipInstruction(
  payer: PublicKey,
  tipLamports: bigint,
  tipAccount?: PublicKey
): TransactionInstruction {
  const destination = tipAccount || getRandomTipAccount();

  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: destination,
    lamports: tipLamports,
  });
}

/**
 * Calculate platform fee from liquidity amount
 *
 * @param liquidityLamports - Liquidity amount in lamports
 * @returns Fee amount in lamports
 */
export function calculatePlatformFeeLamports(liquidityLamports: bigint): bigint {
  return (liquidityLamports * BigInt(PLATFORM_FEE_BPS)) / BigInt(10_000);
}

/**
 * Calculate all fees for a launch
 *
 * @param liquidityLamports - Liquidity amount in lamports
 * @param jitoTipLamports - Jito tip amount in lamports (0 if not using Jito)
 * @param rentLamports - Rent exemption amount in lamports
 * @returns Breakdown of all fees
 */
export function calculateAllFees(
  liquidityLamports: bigint,
  jitoTipLamports: bigint,
  rentLamports: bigint
): {
  platformFeeLamports: bigint;
  jitoTipLamports: bigint;
  rentLamports: bigint;
  liquidityLamports: bigint;
  totalLamports: bigint;
} {
  const platformFeeLamports = calculatePlatformFeeLamports(liquidityLamports);

  return {
    platformFeeLamports,
    jitoTipLamports,
    rentLamports,
    liquidityLamports,
    totalLamports:
      platformFeeLamports + jitoTipLamports + rentLamports + liquidityLamports,
  };
}

/**
 * Validate Jito tip amount
 *
 * @param tipLamports - Tip amount in lamports
 * @returns Validation result with error message if invalid
 */
export function validateJitoTip(tipLamports: bigint): {
  valid: boolean;
  error?: string;
} {
  if (tipLamports < BigInt(MINIMUM_TIP_LAMPORTS)) {
    return {
      valid: false,
      error: `Minimum tip is ${MINIMUM_TIP_LAMPORTS / 1e9} SOL`,
    };
  }

  return { valid: true };
}

/**
 * Format lamports as SOL string
 *
 * @param lamports - Amount in lamports
 * @param decimals - Number of decimal places (default 4)
 * @returns Formatted SOL string
 */
export function formatLamportsAsSol(
  lamports: bigint | number,
  decimals: number = 4
): string {
  const value = Number(lamports) / 1e9;
  return value.toFixed(decimals);
}

/**
 * Convert SOL to lamports
 *
 * @param sol - Amount in SOL
 * @returns Amount in lamports
 */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * 1e9));
}

/**
 * Convert lamports to SOL
 *
 * @param lamports - Amount in lamports
 * @returns Amount in SOL
 */
export function lamportsToSol(lamports: bigint | number): number {
  return Number(lamports) / 1e9;
}
