/**
 * @file revokeAuthority.ts
 * @summary Instructions for revoking mint and freeze authorities
 * @dependencies @solana/web3.js, @solana/spl-token
 */

import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  createSetAuthorityInstruction,
  AuthorityType,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';

/**
 * Authority types that can be revoked
 */
export enum RevocableAuthority {
  /** Authority to mint new tokens */
  MintTokens = 'MintTokens',
  /** Authority to freeze token accounts */
  FreezeAccount = 'FreezeAccount',
}

/**
 * Create instruction to revoke mint authority
 * This makes the token supply permanently fixed
 *
 * @param mint - Token mint address
 * @param currentAuthority - Current mint authority
 * @returns Instruction to revoke mint authority
 */
export function createRevokeMintAuthorityInstruction(
  mint: PublicKey,
  currentAuthority: PublicKey
): TransactionInstruction {
  return createSetAuthorityInstruction(
    mint,
    currentAuthority,
    AuthorityType.MintTokens,
    null, // Setting to null revokes the authority
    [],
    TOKEN_2022_PROGRAM_ID
  );
}

/**
 * Create instruction to revoke freeze authority
 * This prevents anyone from freezing token accounts
 *
 * @param mint - Token mint address
 * @param currentAuthority - Current freeze authority
 * @returns Instruction to revoke freeze authority
 */
export function createRevokeFreezeAuthorityInstruction(
  mint: PublicKey,
  currentAuthority: PublicKey
): TransactionInstruction {
  return createSetAuthorityInstruction(
    mint,
    currentAuthority,
    AuthorityType.FreezeAccount,
    null, // Setting to null revokes the authority
    [],
    TOKEN_2022_PROGRAM_ID
  );
}

/**
 * Create instructions to revoke both mint and freeze authorities
 * This is the "Safe Launch" standard - fully decentralized token
 *
 * @param mint - Token mint address
 * @param currentAuthority - Current authority (usually the creator)
 * @returns Array of instructions to revoke both authorities
 */
export function createRevokeAllAuthoritiesInstructions(
  mint: PublicKey,
  currentAuthority: PublicKey
): TransactionInstruction[] {
  return [
    createRevokeMintAuthorityInstruction(mint, currentAuthority),
    createRevokeFreezeAuthorityInstruction(mint, currentAuthority),
  ];
}

/**
 * Check if revocation is safe to proceed
 * Returns warnings if any potential issues are detected
 *
 * @param params - Parameters to check
 * @returns Array of warning messages (empty if safe)
 */
export function checkRevocationSafety(params: {
  totalSupply: bigint;
  creatorBalance: bigint;
  hasLiquidity: boolean;
}): string[] {
  const warnings: string[] = [];

  // Check if creator holds all tokens (potential rug)
  if (params.creatorBalance === params.totalSupply) {
    warnings.push(
      'Creator holds 100% of supply - consider distributing before launch'
    );
  }

  // Check if there's liquidity
  if (!params.hasLiquidity) {
    warnings.push('No liquidity added - token will not be tradeable');
  }

  return warnings;
}

/**
 * Verify that authorities have been revoked by checking mint account
 *
 * @param mintInfo - Mint account info
 * @returns Object indicating which authorities are revoked
 */
export function verifyAuthoritiesRevoked(mintInfo: {
  mintAuthority: PublicKey | null;
  freezeAuthority: PublicKey | null;
}): {
  mintAuthorityRevoked: boolean;
  freezeAuthorityRevoked: boolean;
  isFullyDecentralized: boolean;
} {
  const mintAuthorityRevoked = mintInfo.mintAuthority === null;
  const freezeAuthorityRevoked = mintInfo.freezeAuthority === null;

  return {
    mintAuthorityRevoked,
    freezeAuthorityRevoked,
    isFullyDecentralized: mintAuthorityRevoked && freezeAuthorityRevoked,
  };
}
