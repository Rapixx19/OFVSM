/**
 * @file SecurityAuditor.ts
 * @summary Security certificate generation and lock verification
 */

import { Connection, PublicKey } from '@solana/web3.js';
import type { LockerAccount } from '../types/locker';
import type { SecurityCertificate } from '../types/sentinel';
import { getLockerAccount } from '../services/lockerService';

const CONTRACT_AUDIT_HASH = 'vecterai-locker-v1.0.0-audit-pending';

export class SecurityAuditor {
  constructor(private readonly connection: Connection) {}

  async generateSecurityCertificate(
    tokenMint: string,
    lpMint: string,
    creatorWallet: string
  ): Promise<SecurityCertificate> {
    const lpMintPubkey = new PublicKey(lpMint);
    const creatorPubkey = new PublicKey(creatorWallet);

    const locker = await this.fetchLockFromChain(lpMintPubkey, creatorPubkey);

    if (!locker) {
      return {
        tokenMint, lpMint, lockDepth: 'temporary', lockDays: null,
        authorityStatus: 'active', contractAuditHash: CONTRACT_AUDIT_HASH,
        verifiedAt: Date.now(), isCompliant: false,
      };
    }

    const lockDepth = this.calculateLockDepth(locker);
    const lockDays = this.calculateLockDays(locker);
    const isCompliant = !locker.isUnlocked && lockDays !== null && lockDays >= 90;

    return {
      tokenMint, lpMint, lockDepth, lockDays,
      authorityStatus: locker.isPermanent ? 'revoked' : 'active',
      contractAuditHash: CONTRACT_AUDIT_HASH, verifiedAt: Date.now(), isCompliant,
    };
  }

  private async fetchLockFromChain(lpMint: PublicKey, creator: PublicKey): Promise<LockerAccount | null> {
    return getLockerAccount(this.connection, lpMint, creator);
  }

  private calculateLockDepth(locker: LockerAccount): 'temporary' | 'permanent' {
    return locker.isPermanent ? 'permanent' : 'temporary';
  }

  private calculateLockDays(locker: LockerAccount): number | null {
    if (locker.isPermanent) return null;
    if (locker.isUnlocked) return 0;
    const now = Math.floor(Date.now() / 1000);
    const releaseTime = locker.releaseTime.toNumber();
    return Math.max(0, Math.ceil((releaseTime - now) / 86400));
  }
}
