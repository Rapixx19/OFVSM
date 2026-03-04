/**
 * @file PortfolioScanner.ts
 * @summary Portfolio balance aggregation and expiration monitoring
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AggregatedBalance } from '@/features/wallets/types/wallet';
import type { ExpiringLock } from '../types/sentinel';
import { getLockerAccount } from '../services/lockerService';

const EXPIRATION_THRESHOLD_DAYS = 7;

export class PortfolioScanner {
  constructor(private readonly connection: Connection) {}

  async aggregateBalances(walletAddresses: string[]): Promise<AggregatedBalance> {
    if (walletAddresses.length === 0) {
      return { totalSol: 0, tokenBalances: new Map(), walletCount: 0, lastUpdated: Date.now() };
    }

    try {
      const publicKeys = walletAddresses.map((addr) => new PublicKey(addr));
      const accountInfos = await this.connection.getMultipleAccountsInfo(publicKeys, 'confirmed');

      let totalSol = 0;
      for (const accountInfo of accountInfos) {
        if (accountInfo) totalSol += accountInfo.lamports / LAMPORTS_PER_SOL;
      }

      return { totalSol, tokenBalances: new Map(), walletCount: walletAddresses.length, lastUpdated: Date.now() };
    } catch (error) {
      console.error('Failed to aggregate balances:', error);
      return { totalSol: 0, tokenBalances: new Map(), walletCount: 0, lastUpdated: Date.now() };
    }
  }

  async aggregateUserBalances(supabase: SupabaseClient, profileId: string): Promise<AggregatedBalance> {
    const { data: wallets, error } = await supabase
      .from('user_wallets')
      .select('wallet_address')
      .eq('profile_id', profileId)
      .or('is_verified.eq.true,is_main.eq.true');

    if (error || !wallets) {
      console.error('Failed to fetch user wallets:', error);
      return { totalSol: 0, tokenBalances: new Map(), walletCount: 0, lastUpdated: Date.now() };
    }

    return this.aggregateBalances(wallets.map((w) => w.wallet_address));
  }

  async checkImpendingExpirations(supabase: SupabaseClient): Promise<ExpiringLock[]> {
    const { data: launches, error } = await supabase
      .from('scheduled_launches')
      .select('creator_wallet, bundle_addresses')
      .eq('status', 'completed');

    if (error || !launches) {
      console.error('Failed to fetch launches for expiration check:', error);
      return [];
    }

    const expiringLocks: ExpiringLock[] = [];
    const now = Math.floor(Date.now() / 1000);
    const thresholdSeconds = EXPIRATION_THRESHOLD_DAYS * 24 * 60 * 60;

    for (const launch of launches) {
      const addresses = launch.bundle_addresses as { mint?: { toBase58?: () => string } | string; lpMint?: { toBase58?: () => string } | string };
      if (!addresses?.lpMint) continue;

      const lpMintStr = typeof addresses.lpMint === 'string' ? addresses.lpMint : addresses.lpMint.toBase58?.() ?? String(addresses.lpMint);
      const tokenMintStr = typeof addresses.mint === 'string' ? addresses.mint : addresses.mint?.toBase58?.() ?? String(addresses.mint ?? '');

      try {
        const lpMintPubkey = new PublicKey(lpMintStr);
        const creatorPubkey = new PublicKey(launch.creator_wallet);
        const locker = await getLockerAccount(this.connection, lpMintPubkey, creatorPubkey);

        if (!locker || locker.isUnlocked || locker.isPermanent) continue;

        const releaseTime = locker.releaseTime.toNumber();
        const secondsRemaining = releaseTime - now;

        if (secondsRemaining > 0 && secondsRemaining <= thresholdSeconds) {
          expiringLocks.push({
            tokenMint: tokenMintStr, lpMint: lpMintStr, creatorWallet: launch.creator_wallet,
            releaseTime: new Date(releaseTime * 1000), daysRemaining: Math.ceil(secondsRemaining / 86400),
          });
        }
      } catch (err) {
        console.error('Error checking lock expiration:', err);
      }
    }

    return expiringLocks;
  }
}
