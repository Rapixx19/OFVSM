/**
 * @file trustScoreCalculator.ts
 * @summary Trust score calculation service for Sentinel Auditor
 * @dependencies N/A
 */

import type {
  TrustScore,
  TrustPillar,
  TrustGrade,
  AuditParams,
  PillarStatus,
} from '../types/trustScore';

/**
 * Calculate metadata pillar score (25 pts max)
 */
function scoreMetadata(params: AuditParams): TrustPillar {
  let score = 0;
  const details: string[] = [];

  // Name: 8 pts
  if (params.name && params.name.length >= 3) {
    score += 8;
  } else {
    details.push('Name required (3+ chars)');
  }

  // Symbol: 8 pts
  if (params.symbol && params.symbol.length >= 2) {
    score += 8;
  } else {
    details.push('Symbol required (2+ chars)');
  }

  // Image URI: 9 pts
  if (params.imageUri && params.imageUri.length > 0) {
    score += 9;
  } else {
    details.push('Image required');
  }

  const status: PillarStatus = score >= 25 ? 'pass' : score >= 16 ? 'warn' : 'fail';

  return {
    name: 'Metadata',
    score,
    maxScore: 25,
    status,
    details: details.length > 0 ? details.join(', ') : 'All metadata complete',
  };
}

/**
 * Calculate tokenomics pillar score (25 pts max)
 */
function scoreTokenomics(params: AuditParams): TrustPillar {
  let score = 0;
  const details: string[] = [];

  // LP Amount: 15 pts max
  if (params.liquiditySol >= 1) {
    score += 15;
  } else if (params.liquiditySol >= 0.5) {
    score += 10;
    details.push('LP < 1 SOL');
  } else {
    details.push('LP too low');
  }

  // No hidden mint risk: 10 pts (assumed safe if revokeMint is true)
  if (params.revokeMint) {
    score += 10;
  } else {
    details.push('Hidden mint risk');
  }

  const status: PillarStatus = score >= 25 ? 'pass' : score >= 15 ? 'warn' : 'fail';

  return {
    name: 'Tokenomics',
    score,
    maxScore: 25,
    status,
    details: details.length > 0 ? details.join(', ') : 'Healthy tokenomics',
  };
}

/**
 * Calculate authority pillar score (25 pts max)
 */
function scoreAuthority(params: AuditParams): TrustPillar {
  let score = 0;
  const details: string[] = [];

  // Mint authority revoked: 12.5 pts
  if (params.revokeMint) {
    score += 12.5;
  } else {
    details.push('Mint authority active');
  }

  // Freeze authority revoked: 12.5 pts
  if (params.revokeFreeze) {
    score += 12.5;
  } else {
    details.push('Freeze authority active');
  }

  const status: PillarStatus = score >= 25 ? 'pass' : score >= 12.5 ? 'warn' : 'fail';

  return {
    name: 'Authority',
    score: Math.round(score),
    maxScore: 25,
    status,
    details: details.length > 0 ? details.join(', ') : 'All authorities revoked',
  };
}

/**
 * Calculate lock duration pillar score (25 pts max)
 */
function scoreLockDuration(params: AuditParams): TrustPillar {
  let score = 0;
  let details = '';

  if (params.isPermanentLock) {
    score = 25;
    details = 'Permanent lock';
  } else if (params.lockDurationDays >= 365) {
    score = 25;
    details = '365+ day lock';
  } else if (params.lockDurationDays >= 180) {
    score = 20;
    details = '180+ day lock';
  } else if (params.lockDurationDays >= 90) {
    score = 15;
    details = '90+ day lock (minimum)';
  } else {
    score = 0;
    details = 'Lock < 90 days (unsafe)';
  }

  const status: PillarStatus = score >= 25 ? 'pass' : score >= 15 ? 'warn' : 'fail';

  return { name: 'Lock Duration', score, maxScore: 25, status, details };
}

/**
 * Calculate letter grade from total score
 */
function calculateGrade(total: number): TrustGrade {
  if (total >= 90) return 'A';
  if (total >= 80) return 'B';
  if (total >= 70) return 'C';
  if (total >= 60) return 'D';
  return 'F';
}

/**
 * Calculate complete trust score from audit parameters
 */
export function calculateTrustScore(params: AuditParams): TrustScore {
  const metadata = scoreMetadata(params);
  const tokenomics = scoreTokenomics(params);
  const authority = scoreAuthority(params);
  const lockDuration = scoreLockDuration(params);

  const total = metadata.score + tokenomics.score + authority.score + lockDuration.score;

  return {
    total: Math.round(total),
    pillars: { metadata, tokenomics, authority, lockDuration },
    grade: calculateGrade(total),
    calculatedAt: Date.now(),
  };
}
