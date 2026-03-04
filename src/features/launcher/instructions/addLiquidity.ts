/**
 * @file addLiquidity.ts
 * @summary Instructions for adding liquidity to Raydium CPMM pool
 * @dependencies @solana/web3.js
 */

import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { RAYDIUM_CPMM_PROGRAM, RAYDIUM_AMM_CONFIG } from '../constants/addresses';
import {
  derivePoolPda,
  derivePoolVaultPda,
  deriveLpMintPda,
  sortMints,
} from './createPool';

/**
 * Parameters for adding liquidity
 */
export interface AddLiquidityParams {
  /** Liquidity provider */
  owner: PublicKey;
  /** First token mint */
  tokenMint0: PublicKey;
  /** Second token mint */
  tokenMint1: PublicKey;
  /** Token program for mint0 */
  tokenProgram0: PublicKey;
  /** Token program for mint1 */
  tokenProgram1: PublicKey;
  /** Owner's token0 account */
  ownerToken0: PublicKey;
  /** Owner's token1 account */
  ownerToken1: PublicKey;
  /** Owner's LP token account */
  ownerLpToken: PublicKey;
  /** Amount of LP tokens to mint (minimum) */
  lpTokenAmount: bigint;
  /** Maximum amount of token0 to deposit */
  maxAmount0: bigint;
  /** Maximum amount of token1 to deposit */
  maxAmount1: bigint;
}

/**
 * Create instruction to add liquidity to a Raydium CPMM pool
 *
 * @param params - Liquidity parameters
 * @returns Instruction to add liquidity
 */
export function createAddLiquidityInstruction(
  params: AddLiquidityParams
): TransactionInstruction {
  const [sortedMint0, sortedMint1] = sortMints(
    params.tokenMint0,
    params.tokenMint1
  );

  // Derive PDAs
  const [poolState] = derivePoolPda(
    RAYDIUM_AMM_CONFIG,
    sortedMint0,
    sortedMint1
  );
  const [vault0] = derivePoolVaultPda(poolState, sortedMint0);
  const [vault1] = derivePoolVaultPda(poolState, sortedMint1);
  const [lpMint] = deriveLpMintPda(poolState);

  // Determine owner token accounts based on sorting
  const isSwapped = params.tokenMint0.toBase58() !== sortedMint0.toBase58();
  const ownerToken0 = isSwapped ? params.ownerToken1 : params.ownerToken0;
  const ownerToken1 = isSwapped ? params.ownerToken0 : params.ownerToken1;
  const tokenProgram0 = isSwapped ? params.tokenProgram1 : params.tokenProgram0;
  const tokenProgram1 = isSwapped ? params.tokenProgram0 : params.tokenProgram1;
  const maxAmount0 = isSwapped ? params.maxAmount1 : params.maxAmount0;
  const maxAmount1 = isSwapped ? params.maxAmount0 : params.maxAmount1;

  // Build instruction data
  // Discriminator (8 bytes) + lp_token_amount (u64) + max_amount_0 (u64) + max_amount_1 (u64)
  const data = Buffer.alloc(32);
  // Deposit instruction discriminator for CPMM
  const discriminator = Buffer.from([
    0xf2, 0x23, 0xc6, 0x89, 0x52, 0xe1, 0xf2, 0xb6,
  ]);
  discriminator.copy(data, 0);
  data.writeBigUInt64LE(params.lpTokenAmount, 8);
  data.writeBigUInt64LE(maxAmount0, 16);
  data.writeBigUInt64LE(maxAmount1, 24);

  return new TransactionInstruction({
    keys: [
      // Owner (signer)
      { pubkey: params.owner, isSigner: true, isWritable: false },
      // Pool authority
      { pubkey: poolState, isSigner: false, isWritable: true },
      // Pool state
      { pubkey: poolState, isSigner: false, isWritable: true },
      // Owner LP token account
      { pubkey: params.ownerLpToken, isSigner: false, isWritable: true },
      // Owner token accounts
      { pubkey: ownerToken0, isSigner: false, isWritable: true },
      { pubkey: ownerToken1, isSigner: false, isWritable: true },
      // Pool vaults
      { pubkey: vault0, isSigner: false, isWritable: true },
      { pubkey: vault1, isSigner: false, isWritable: true },
      // Token programs
      { pubkey: tokenProgram0, isSigner: false, isWritable: false },
      { pubkey: tokenProgram1, isSigner: false, isWritable: false },
      // LP mint
      { pubkey: lpMint, isSigner: false, isWritable: true },
    ],
    programId: RAYDIUM_CPMM_PROGRAM,
    data,
  });
}

/**
 * Calculate LP tokens to receive for a given deposit
 * This is a simplified calculation - actual amounts depend on pool state
 *
 * @param amount0 - Amount of token0 to deposit
 * @param amount1 - Amount of token1 to deposit
 * @param totalLpSupply - Current total LP supply
 * @param reserve0 - Current reserve of token0
 * @param reserve1 - Current reserve of token1
 * @returns Expected LP tokens to receive
 */
export function calculateLpTokens(
  amount0: bigint,
  amount1: bigint,
  totalLpSupply: bigint,
  reserve0: bigint,
  reserve1: bigint
): bigint {
  if (totalLpSupply === BigInt(0)) {
    // Initial liquidity - LP tokens = sqrt(amount0 * amount1)
    return sqrt(amount0 * amount1);
  }

  // Subsequent liquidity - LP tokens = min(amount0/reserve0, amount1/reserve1) * totalLpSupply
  const lpFromToken0 = (amount0 * totalLpSupply) / reserve0;
  const lpFromToken1 = (amount1 * totalLpSupply) / reserve1;

  return lpFromToken0 < lpFromToken1 ? lpFromToken0 : lpFromToken1;
}

/**
 * Integer square root using Newton's method
 */
function sqrt(value: bigint): bigint {
  if (value < BigInt(0)) {
    throw new Error('Square root of negative number');
  }
  if (value < BigInt(2)) {
    return value;
  }

  let x = value;
  let y = (x + BigInt(1)) / BigInt(2);

  while (y < x) {
    x = y;
    y = (x + value / x) / BigInt(2);
  }

  return x;
}
