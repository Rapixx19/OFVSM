/**
 * @file sentinel.ts
 * @summary TypeScript types for Sentinel Agent security verification
 * @dependencies N/A
 */

/**
 * Security event types for the safety audit log
 */
export type SecurityEventType =
  | 'lock_confirmed'
  | 'expiring_soon'
  | 'lock_extended'
  | 'unlock_detected';

/**
 * Security certificate issued by the Sentinel Agent
 * Provides verifiable proof of lock status for buyer trust
 */
export interface SecurityCertificate {
  /** The token mint address */
  tokenMint: string;
  /** The LP token mint address */
  lpMint: string;
  /** Lock depth classification */
  lockDepth: 'temporary' | 'permanent';
  /** Number of days locked (null for permanent) */
  lockDays: number | null;
  /** Whether mint authority has been revoked */
  authorityStatus: 'revoked' | 'active';
  /** Hash of the verified contract audit */
  contractAuditHash: string;
  /** Timestamp when verification was performed */
  verifiedAt: number;
  /** Whether the token meets Safe Standard compliance */
  isCompliant: boolean;
}

/**
 * Safety event record for the audit log
 */
export interface SafetyEvent {
  /** Unique event identifier */
  id: string;
  /** Type of security event */
  type: SecurityEventType;
  /** The token mint address */
  tokenMint: string;
  /** Creator wallet address */
  creatorWallet: string;
  /** Additional event details */
  details: Record<string, unknown>;
  /** When the event was created */
  createdAt: Date;
}

/**
 * Lock approaching expiration
 */
export interface ExpiringLock {
  /** The token mint address */
  tokenMint: string;
  /** The LP token mint address */
  lpMint: string;
  /** Creator wallet address */
  creatorWallet: string;
  /** When the lock expires */
  releaseTime: Date;
  /** Days until expiration */
  daysRemaining: number;
}
