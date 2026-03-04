/**
 * @file index.ts
 * @summary Core type definitions for VECTERAI Foundation
 * @dependencies None
 */

/**
 * Legal Shield acceptance status for user profiles
 */
export type LegalShieldStatus = 'pending' | 'accepted' | 'declined' | 'expired';

/**
 * User roles in the system
 */
export type UserRole = 'developer' | 'creator' | 'investor' | 'public';

/**
 * User profile with legal shield status and role information
 */
export interface Profile {
  /** Unique identifier (Solana wallet address) */
  id: string;
  /** Display name (optional) */
  displayName?: string;
  /** User's role in the platform */
  role: UserRole;
  /** Legal Shield acceptance status */
  legalShieldStatus: LegalShieldStatus;
  /** Timestamp of Legal Shield acceptance (if accepted) */
  legalShieldAcceptedAt?: Date;
  /** Version of Legal Shield terms accepted */
  legalShieldVersion?: string;
  /** Profile creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Token launch configuration
 */
export interface LaunchPlan {
  /** Unique identifier for the launch plan */
  id: string;
  /** Creator's profile ID (wallet address) */
  creatorId: string;
  /** Token name */
  tokenName: string;
  /** Token symbol (ticker) */
  tokenSymbol: string;
  /** Token description */
  description: string;
  /** Total supply of tokens */
  totalSupply: number;
  /** Initial price in SOL */
  initialPrice: number;
  /** Percentage allocated to liquidity pool */
  liquidityPercentage: number;
  /** Lock duration for liquidity in days */
  liquidityLockDays: number;
  /** Whether the launch has Safe Standard badge */
  hasSafeStandardBadge: boolean;
  /** Launch status */
  status: 'draft' | 'pending' | 'approved' | 'launched' | 'cancelled';
  /** Creation timestamp */
  createdAt: Date;
  /** Scheduled launch date (optional) */
  scheduledLaunchDate?: Date;
}

/**
 * Safe Standard compliance badge structure
 */
export interface SafeStandardBadge {
  /** Badge identifier */
  id: string;
  /** Associated launch plan ID */
  launchPlanId: string;
  /** Badge issuance date */
  issuedAt: Date;
  /** Badge expiration date */
  expiresAt: Date;
  /** Compliance checks passed */
  complianceChecks: {
    /** Liquidity locked verification */
    liquidityLocked: boolean;
    /** Minimum lock duration met */
    minimumLockDuration: boolean;
    /** Legal Shield verified */
    legalShieldVerified: boolean;
    /** Smart contract audited */
    contractAudited: boolean;
  };
  /** Overall badge status */
  status: 'active' | 'expired' | 'revoked';
}

/**
 * Fee tier for public users
 */
export interface FeeTier {
  /** Tier name */
  name: string;
  /** Minimum transaction value in SOL */
  minValue: number;
  /** Maximum transaction value in SOL (null for unlimited) */
  maxValue: number | null;
  /** Fee percentage (e.g., 0.02 for 2%) */
  feePercentage: number;
}

/**
 * Fee configuration for different roles
 */
export interface FeeConfig {
  /** Developer role fees */
  developer: {
    /** Flat fee per transaction in SOL */
    flatFee: number;
  };
  /** Public user tiered fees */
  public: FeeTier[];
}
