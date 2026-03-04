/**
 * @file wallet.ts
 * @summary Type definitions for multi-wallet management
 * @dependencies None
 */

/**
 * User wallet from database
 */
export interface UserWallet {
  id: string;
  profileId: string;
  walletAddress: string;
  label: string;
  isMain: boolean;
  isVerified: boolean;
  verifiedAt: Date | null;
  createdAt: Date;
}

/**
 * Balance information for a single wallet
 */
export interface WalletBalance {
  walletId: string;
  walletAddress: string;
  solBalance: number;
  tokenBalances: TokenBalance[];
}

/**
 * Token balance entry
 */
export interface TokenBalance {
  mint: string;
  symbol: string;
  amount: number;
  decimals: number;
  usdValue?: number;
}

/**
 * Aggregated balance across all wallets
 */
export interface AggregatedBalance {
  totalSol: number;
  tokenBalances: Map<string, { symbol: string; total: number }>;
  walletCount: number;
  lastUpdated: number;
}

/**
 * Wallet status types
 */
export type WalletStatus = 'main' | 'verified' | 'unverified';

/**
 * Pending wallet verification state
 */
export interface PendingVerification {
  address: string;
  nonce: string;
  expiresAt: number;
}

/**
 * Convert database row to UserWallet
 */
export function toUserWallet(row: {
  id: string;
  profile_id: string;
  wallet_address: string;
  label: string | null;
  is_main: boolean;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
}): UserWallet {
  return {
    id: row.id,
    profileId: row.profile_id,
    walletAddress: row.wallet_address,
    label: row.label ?? 'Alt Wallet',
    isMain: row.is_main,
    isVerified: row.is_verified,
    verifiedAt: row.verified_at ? new Date(row.verified_at) : null,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Get wallet status from UserWallet
 */
export function getWalletStatus(wallet: UserWallet): WalletStatus {
  if (wallet.isMain) return 'main';
  if (wallet.isVerified) return 'verified';
  return 'unverified';
}
