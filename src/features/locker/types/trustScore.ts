/**
 * @file trustScore.ts
 * @summary TypeScript types for Sentinel Trust Score system
 * @dependencies N/A
 */

/**
 * Pillar status indicator
 */
export type PillarStatus = 'pass' | 'warn' | 'fail';

/**
 * Trust grade scale
 */
export type TrustGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Individual trust pillar score
 */
export interface TrustPillar {
  /** Pillar display name */
  name: string;
  /** Current score (0-25) */
  score: number;
  /** Maximum possible score */
  maxScore: 25;
  /** Status indicator */
  status: PillarStatus;
  /** Human-readable details */
  details: string;
}

/**
 * Complete trust score result
 */
export interface TrustScore {
  /** Total score (0-100) */
  total: number;
  /** Individual pillar breakdowns */
  pillars: {
    metadata: TrustPillar;
    tokenomics: TrustPillar;
    authority: TrustPillar;
    lockDuration: TrustPillar;
  };
  /** Letter grade */
  grade: TrustGrade;
  /** Calculation timestamp */
  calculatedAt: number;
}

/**
 * Parameters for trust score calculation
 */
export interface AuditParams {
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Token image URI */
  imageUri: string;
  /** Liquidity in SOL */
  liquiditySol: number;
  /** Lock duration in days */
  lockDurationDays: number;
  /** Whether lock is permanent */
  isPermanentLock: boolean;
  /** Whether mint authority will be revoked */
  revokeMint: boolean;
  /** Whether freeze authority will be revoked */
  revokeFreeze: boolean;
}

/**
 * Grade color configuration
 */
export const GRADE_COLORS: Record<TrustGrade, string> = {
  A: 'text-emerald-400',
  B: 'text-cyan-400',
  C: 'text-yellow-400',
  D: 'text-orange-400',
  F: 'text-red-400',
};

/**
 * Grade background colors
 */
export const GRADE_BG_COLORS: Record<TrustGrade, string> = {
  A: 'bg-emerald-500/20',
  B: 'bg-cyan-500/20',
  C: 'bg-yellow-500/20',
  D: 'bg-orange-500/20',
  F: 'bg-red-500/20',
};
