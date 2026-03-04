/**
 * @file createMint.ts
 * @summary Instructions for creating Token-2022 mint with metadata
 * @dependencies @solana/web3.js, @solana/spl-token
 */

import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  type Keypair,
} from '@solana/web3.js';
import {
  createInitializeMint2Instruction,
  TOKEN_2022_PROGRAM_ID,
  getMintLen,
  ExtensionType,
  createInitializeMetadataPointerInstruction,
  TYPE_SIZE,
  LENGTH_SIZE,
} from '@solana/spl-token';
import {
  createInitializeInstruction,
  pack,
  type TokenMetadata,
} from '@solana/spl-token-metadata';
import { DEFAULT_DECIMALS } from '../constants/addresses';

/**
 * Metadata for the token
 */
export interface TokenMetadataParams {
  name: string;
  symbol: string;
  uri: string;
  additionalMetadata?: [string, string][];
}

/**
 * Calculate the space needed for mint with metadata
 */
export function calculateMintSpace(metadata: TokenMetadataParams): number {
  const tokenMetadata: TokenMetadata = {
    mint: PublicKey.default,
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    additionalMetadata: metadata.additionalMetadata || [],
  };

  const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
  const metadataSpace = pack(tokenMetadata).length;

  return getMintLen([ExtensionType.MetadataPointer]) + metadataExtension + metadataSpace;
}

/**
 * Create instructions for Token-2022 mint with embedded metadata
 *
 * @param mint - Mint keypair
 * @param payer - Payer public key
 * @param metadata - Token metadata
 * @param decimals - Token decimals (default 9)
 * @returns Array of instructions to create mint
 */
export function createMintInstructions(
  mint: Keypair,
  payer: PublicKey,
  metadata: TokenMetadataParams,
  decimals: number = DEFAULT_DECIMALS
): TransactionInstruction[] {
  const mintSpace = calculateMintSpace(metadata);
  const lamports = 2_039_280 + (mintSpace - 82) * 10; // Approximate rent

  const instructions: TransactionInstruction[] = [];

  // 1. Create account for mint
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint.publicKey,
      space: mintSpace,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  // 2. Initialize metadata pointer extension
  instructions.push(
    createInitializeMetadataPointerInstruction(
      mint.publicKey,
      payer, // Update authority
      mint.publicKey, // Metadata address (self for Token-2022)
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 3. Initialize mint
  instructions.push(
    createInitializeMint2Instruction(
      mint.publicKey,
      decimals,
      payer, // Mint authority (will be revoked)
      payer, // Freeze authority (will be revoked)
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 4. Initialize token metadata
  instructions.push(
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint.publicKey,
      metadata: mint.publicKey,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: payer,
      updateAuthority: payer,
    })
  );

  return instructions;
}

/**
 * Create mint to instruction for initial token distribution
 *
 * @param mint - Mint public key
 * @param destination - Destination token account
 * @param authority - Mint authority
 * @param amount - Amount to mint
 * @returns MintTo instruction
 */
export function createMintToInstruction(
  mint: PublicKey,
  destination: PublicKey,
  authority: PublicKey,
  amount: bigint
): TransactionInstruction {
  // MintTo instruction data: [7, amount (u64 LE)]
  const data = Buffer.alloc(9);
  data.writeUInt8(7, 0); // MintTo instruction discriminator
  data.writeBigUInt64LE(amount, 1);

  return new TransactionInstruction({
    keys: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  });
}
