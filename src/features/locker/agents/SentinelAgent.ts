/**
 * @file SentinelAgent.ts
 * @summary Security agent for lock verification and expiration monitoring
 * @dependencies @solana/web3.js, @supabase/supabase-js
 */

import { Connection, PublicKey } from '@solana/web3.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LockerAccount } from '../types/locker';
import type { SecurityCertificate, ExpiringLock } from '../types/sentinel';
import { getLockerAccount } from '../services/lockerService';

/**
 * Contract audit hash for verification
 * Placeholder until real audit is complete
 */
const CONTRACT_AUDIT_HASH = 'vecterai-locker-v1.0.0-audit-pending';

/**
 * Expiration warning threshold in days
 */
const EXPIRATION_THRESHOLD_DAYS = 7;

/**
 * SentinelAgent - Security verification agent for locked liquidity
 *
 * Provides:
 * - On-chain lock verification (Proof of Lock)
 * - Security certificate generation
 * - Expiration monitoring
 */
export class SentinelAgent {
  private readonly connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Generate a security certificate for a token
   *
   * @param tokenMint - The token mint address
   * @param lpMint - The LP token mint address
   * @param creatorWallet - The creator wallet address
   * @returns Security certificate with verification details
   */
  async generateSecurityCertificate(
    tokenMint: string,
    lpMint: string,
    creatorWallet: string
  ): Promise<SecurityCertificate> {
    const lpMintPubkey = new PublicKey(lpMint);
    const creatorPubkey = new PublicKey(creatorWallet);

    // Fetch lock data directly from chain
    const locker = await this.fetchLockFromChain(lpMintPubkey, creatorPubkey);

    if (!locker) {
      // No lock found - return non-compliant certificate
      return {
        tokenMint,
        lpMint,
        lockDepth: 'temporary',
        lockDays: null,
        authorityStatus: 'active',
        contractAuditHash: CONTRACT_AUDIT_HASH,
        verifiedAt: Date.now(),
        isCompliant: false,
      };
    }

    const lockDepth = this.calculateLockDepth(locker);
    const lockDays = this.calculateLockDays(locker);
    const isCompliant = !locker.isUnlocked && lockDays !== null && lockDays >= 90;

    return {
      tokenMint,
      lpMint,
      lockDepth,
      lockDays,
      authorityStatus: locker.isPermanent ? 'revoked' : 'active',
      contractAuditHash: this.getContractAuditHash(),
      verifiedAt: Date.now(),
      isCompliant,
    };
  }

  /**
   * Check for locks expiring within the threshold period
   *
   * @param supabase - Supabase client for querying scheduled launches
   * @returns Array of expiring locks
   */
  async checkImpendingExpirations(
    supabase: SupabaseClient
  ): Promise<ExpiringLock[]> {
    // Query completed launches to get LP mints
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
      const addresses = launch.bundle_addresses as {
        mint?: { toBase58?: () => string } | string;
        lpMint?: { toBase58?: () => string } | string;
      };

      if (!addresses?.lpMint) continue;

      // Handle both PublicKey-like objects and strings
      const lpMintStr = typeof addresses.lpMint === 'string'
        ? addresses.lpMint
        : addresses.lpMint.toBase58?.() ?? String(addresses.lpMint);

      const tokenMintStr = typeof addresses.mint === 'string'
        ? addresses.mint
        : addresses.mint?.toBase58?.() ?? String(addresses.mint ?? '');

      try {
        const lpMintPubkey = new PublicKey(lpMintStr);
        const creatorPubkey = new PublicKey(launch.creator_wallet);

        const locker = await this.fetchLockFromChain(lpMintPubkey, creatorPubkey);

        if (!locker || locker.isUnlocked || locker.isPermanent) {
          continue;
        }

        const releaseTime = locker.releaseTime.toNumber();
        const secondsRemaining = releaseTime - now;

        if (secondsRemaining > 0 && secondsRemaining <= thresholdSeconds) {
          const daysRemaining = Math.ceil(secondsRemaining / 86400);

          expiringLocks.push({
            tokenMint: tokenMintStr,
            lpMint: lpMintStr,
            creatorWallet: launch.creator_wallet,
            releaseTime: new Date(releaseTime * 1000),
            daysRemaining,
          });
        }
      } catch (err) {
        console.error('Error checking lock expiration:', err);
      }
    }

    return expiringLocks;
  }

  /**
   * Fetch lock data directly from the blockchain
   */
  private async fetchLockFromChain(
    lpMint: PublicKey,
    creator: PublicKey
  ): Promise<LockerAccount | null> {
    return getLockerAccount(this.connection, lpMint, creator);
  }

  /**
   * Calculate lock depth classification
   */
  private calculateLockDepth(locker: LockerAccount): 'temporary' | 'permanent' {
    return locker.isPermanent ? 'permanent' : 'temporary';
  }

  /**
   * Calculate days until lock expires
   */
  private calculateLockDays(locker: LockerAccount): number | null {
    if (locker.isPermanent) {
      return null;
    }

    if (locker.isUnlocked) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    const releaseTime = locker.releaseTime.toNumber();
    const secondsRemaining = releaseTime - now;

    return Math.max(0, Math.ceil(secondsRemaining / 86400));
  }

  /**
   * Get the contract audit hash
   */
  private getContractAuditHash(): string {
    return CONTRACT_AUDIT_HASH;
  }
}

/**
 * Singleton instance for client-side use
 */
let sentinelInstance: SentinelAgent | null = null;

export function getSentinelAgent(connection: Connection): SentinelAgent {
  if (!sentinelInstance) {
    sentinelInstance = new SentinelAgent(connection);
  }
  return sentinelInstance;
}
