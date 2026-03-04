/**
 * @file SentinelAgent.ts
 * @summary Security agent facade composing auditor and scanner
 */

import { Connection } from '@solana/web3.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SecurityCertificate, ExpiringLock } from '../types/sentinel';
import type { AggregatedBalance } from '@/features/wallets/types/wallet';
import { SecurityAuditor } from './SecurityAuditor';
import { PortfolioScanner } from './PortfolioScanner';

export class SentinelAgent {
  private readonly auditor: SecurityAuditor;
  private readonly scanner: PortfolioScanner;

  constructor(connection: Connection) {
    this.auditor = new SecurityAuditor(connection);
    this.scanner = new PortfolioScanner(connection);
  }

  async generateSecurityCertificate(
    tokenMint: string,
    lpMint: string,
    creatorWallet: string
  ): Promise<SecurityCertificate> {
    return this.auditor.generateSecurityCertificate(tokenMint, lpMint, creatorWallet);
  }

  async checkImpendingExpirations(supabase: SupabaseClient): Promise<ExpiringLock[]> {
    return this.scanner.checkImpendingExpirations(supabase);
  }

  async aggregateBalances(walletAddresses: string[]): Promise<AggregatedBalance> {
    return this.scanner.aggregateBalances(walletAddresses);
  }

  async aggregateUserBalances(supabase: SupabaseClient, profileId: string): Promise<AggregatedBalance> {
    return this.scanner.aggregateUserBalances(supabase, profileId);
  }
}

let sentinelInstance: SentinelAgent | null = null;

export function getSentinelAgent(connection: Connection): SentinelAgent {
  if (!sentinelInstance) {
    sentinelInstance = new SentinelAgent(connection);
  }
  return sentinelInstance;
}
