/**
 * @file createPool.ts
 * @summary Instructions for creating Raydium CPMM pool
 * @dependencies @solana/web3.js
 */

import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import {
  RAYDIUM_CPMM_PROGRAM,
  RAYDIUM_AMM_CONFIG,
} from '../constants/addresses';

/**
 * Raydium CPMM pool state size
 */
const POOL_STATE_SIZE = 637;

/**
 * Seeds for deriving pool PDAs
 */
const POOL_SEED = Buffer.from('pool');
const POOL_VAULT_SEED = Buffer.from('pool_vault');
const POOL_LP_MINT_SEED = Buffer.from('pool_lp_mint');
const ORACLE_SEED = Buffer.from('observation');

/**
 * Derive pool state PDA
 */
export function derivePoolPda(
  ammConfig: PublicKey,
  tokenMint0: PublicKey,
  tokenMint1: PublicKey
): [PublicKey, number] {
  // Sort mints to ensure deterministic order
  const [mint0, mint1] = sortMints(tokenMint0, tokenMint1);

  return PublicKey.findProgramAddressSync(
    [POOL_SEED, ammConfig.toBuffer(), mint0.toBuffer(), mint1.toBuffer()],
    RAYDIUM_CPMM_PROGRAM
  );
}

/**
 * Derive pool vault PDA for a token
 */
export function derivePoolVaultPda(
  pool: PublicKey,
  tokenMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POOL_VAULT_SEED, pool.toBuffer(), tokenMint.toBuffer()],
    RAYDIUM_CPMM_PROGRAM
  );
}

/**
 * Derive LP mint PDA
 */
export function deriveLpMintPda(pool: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POOL_LP_MINT_SEED, pool.toBuffer()],
    RAYDIUM_CPMM_PROGRAM
  );
}

/**
 * Derive oracle observation PDA
 */
export function deriveOraclePda(pool: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ORACLE_SEED, pool.toBuffer()],
    RAYDIUM_CPMM_PROGRAM
  );
}

/**
 * Sort two mints to ensure consistent ordering
 */
export function sortMints(
  mint0: PublicKey,
  mint1: PublicKey
): [PublicKey, PublicKey] {
  const mint0Bytes = mint0.toBytes();
  const mint1Bytes = mint1.toBytes();

  for (let i = 0; i < 32; i++) {
    if (mint0Bytes[i] < mint1Bytes[i]) {
      return [mint0, mint1];
    } else if (mint0Bytes[i] > mint1Bytes[i]) {
      return [mint1, mint0];
    }
  }

  return [mint0, mint1];
}

/**
 * Pool creation parameters
 */
export interface CreatePoolParams {
  /** Pool creator/payer */
  creator: PublicKey;
  /** First token mint (usually SOL/WSOL) */
  tokenMint0: PublicKey;
  /** Second token mint (the new token) */
  tokenMint1: PublicKey;
  /** Token program for mint0 */
  tokenProgram0: PublicKey;
  /** Token program for mint1 */
  tokenProgram1: PublicKey;
  /** Creator's token0 account */
  creatorToken0: PublicKey;
  /** Creator's token1 account */
  creatorToken1: PublicKey;
  /** Initial price (token1/token0) */
  initAmount0: bigint;
  /** Initial amount of token1 */
  initAmount1: bigint;
  /** Open time (unix timestamp, 0 for immediate) */
  openTime: bigint;
}

/**
 * Create instruction to initialize a Raydium CPMM pool
 *
 * @param params - Pool creation parameters
 * @returns Instruction to create pool
 */
export function createPoolInstruction(
  params: CreatePoolParams
): TransactionInstruction {
  const [sortedMint0, sortedMint1] = sortMints(
    params.tokenMint0,
    params.tokenMint1
  );

  // Derive all PDAs
  const [poolState] = derivePoolPda(
    RAYDIUM_AMM_CONFIG,
    sortedMint0,
    sortedMint1
  );
  const [vault0] = derivePoolVaultPda(poolState, sortedMint0);
  const [vault1] = derivePoolVaultPda(poolState, sortedMint1);
  const [lpMint] = deriveLpMintPda(poolState);
  const [oracle] = deriveOraclePda(poolState);

  // Determine creator token accounts based on sorting
  const isSwapped =
    params.tokenMint0.toBase58() !== sortedMint0.toBase58();
  const creatorToken0 = isSwapped
    ? params.creatorToken1
    : params.creatorToken0;
  const creatorToken1 = isSwapped
    ? params.creatorToken0
    : params.creatorToken1;
  const tokenProgram0 = isSwapped
    ? params.tokenProgram1
    : params.tokenProgram0;
  const tokenProgram1 = isSwapped
    ? params.tokenProgram0
    : params.tokenProgram1;
  const initAmount0 = isSwapped ? params.initAmount1 : params.initAmount0;
  const initAmount1 = isSwapped ? params.initAmount0 : params.initAmount1;

  // Build instruction data
  // Discriminator (8 bytes) + init_amount_0 (u64) + init_amount_1 (u64) + open_time (u64)
  const data = Buffer.alloc(32);
  // Initialize instruction discriminator for CPMM
  const discriminator = Buffer.from([
    0x2f, 0x65, 0xa0, 0x96, 0x1a, 0x69, 0x23, 0x9f,
  ]);
  discriminator.copy(data, 0);
  data.writeBigUInt64LE(initAmount0, 8);
  data.writeBigUInt64LE(initAmount1, 16);
  data.writeBigUInt64LE(params.openTime, 24);

  return new TransactionInstruction({
    keys: [
      // Signer accounts
      { pubkey: params.creator, isSigner: true, isWritable: true },
      // AMM config
      { pubkey: RAYDIUM_AMM_CONFIG, isSigner: false, isWritable: false },
      // Pool authority (derived)
      { pubkey: poolState, isSigner: false, isWritable: true },
      // Token mints
      { pubkey: sortedMint0, isSigner: false, isWritable: false },
      { pubkey: sortedMint1, isSigner: false, isWritable: false },
      // LP mint
      { pubkey: lpMint, isSigner: false, isWritable: true },
      // Creator token accounts
      { pubkey: creatorToken0, isSigner: false, isWritable: true },
      { pubkey: creatorToken1, isSigner: false, isWritable: true },
      // Creator LP account (will receive LP tokens)
      { pubkey: params.creator, isSigner: false, isWritable: true }, // Placeholder - actual LP ATA
      // Pool vaults
      { pubkey: vault0, isSigner: false, isWritable: true },
      { pubkey: vault1, isSigner: false, isWritable: true },
      // Oracle
      { pubkey: oracle, isSigner: false, isWritable: true },
      // Programs
      { pubkey: tokenProgram0, isSigner: false, isWritable: false },
      { pubkey: tokenProgram1, isSigner: false, isWritable: false },
      {
        pubkey: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
        isSigner: false,
        isWritable: false,
      },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: RAYDIUM_CPMM_PROGRAM,
    data,
  });
}

/**
 * Get all pool addresses for a given token pair
 */
export function getPoolAddresses(
  tokenMint0: PublicKey,
  tokenMint1: PublicKey
): {
  pool: PublicKey;
  vault0: PublicKey;
  vault1: PublicKey;
  lpMint: PublicKey;
  oracle: PublicKey;
} {
  const [sortedMint0, sortedMint1] = sortMints(tokenMint0, tokenMint1);
  const [pool] = derivePoolPda(RAYDIUM_AMM_CONFIG, sortedMint0, sortedMint1);
  const [vault0] = derivePoolVaultPda(pool, sortedMint0);
  const [vault1] = derivePoolVaultPda(pool, sortedMint1);
  const [lpMint] = deriveLpMintPda(pool);
  const [oracle] = deriveOraclePda(pool);

  return { pool, vault0, vault1, lpMint, oracle };
}
