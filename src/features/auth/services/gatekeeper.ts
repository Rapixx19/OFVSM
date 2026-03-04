/**
 * @file gatekeeper.ts
 * @summary Service for validating user legal shield status and access control
 * @dependencies @/types
 */

import type { Profile, LegalShieldStatus } from '@/types';

/**
 * Minimum Legal Shield version required for platform access
 */
export const MINIMUM_LEGAL_SHIELD_VERSION = '1.0.0';

/**
 * Legal Shield expiration period in days
 */
export const LEGAL_SHIELD_EXPIRATION_DAYS = 365;

/**
 * Check if a user has accepted the Legal Shield
 */
export function hasAcceptedLegalShield(profile: Profile): boolean {
  return profile.legalShieldStatus === 'accepted';
}

/**
 * Check if the Legal Shield acceptance has expired
 */
export function isLegalShieldExpired(profile: Profile): boolean {
  if (profile.legalShieldStatus !== 'accepted') {
    return true;
  }

  if (!profile.legalShieldAcceptedAt) {
    return true;
  }

  const expirationDate = new Date(profile.legalShieldAcceptedAt);
  expirationDate.setDate(
    expirationDate.getDate() + LEGAL_SHIELD_EXPIRATION_DAYS
  );

  return new Date() > expirationDate;
}

/**
 * Check if the user has accepted the minimum required version
 */
export function hasMinimumVersion(profile: Profile): boolean {
  if (!profile.legalShieldVersion) {
    return false;
  }

  return compareVersions(
    profile.legalShieldVersion,
    MINIMUM_LEGAL_SHIELD_VERSION
  ) >= 0;
}

/**
 * Compare two semantic version strings
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;

    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }

  return 0;
}

/**
 * Validation result for gatekeeper checks
 */
export interface GatekeeperResult {
  allowed: boolean;
  reason?: string;
  requiredAction?: 'accept_legal_shield' | 'update_legal_shield' | 'renew';
}

/**
 * Validate if a user can access the platform based on Legal Shield status
 */
export function validateAccess(profile: Profile): GatekeeperResult {
  // Check if Legal Shield has been accepted
  if (!hasAcceptedLegalShield(profile)) {
    return {
      allowed: false,
      reason: 'Legal Shield has not been accepted',
      requiredAction: 'accept_legal_shield',
    };
  }

  // Check if Legal Shield has expired
  if (isLegalShieldExpired(profile)) {
    return {
      allowed: false,
      reason: 'Legal Shield acceptance has expired',
      requiredAction: 'renew',
    };
  }

  // Check minimum version requirement
  if (!hasMinimumVersion(profile)) {
    return {
      allowed: false,
      reason: 'Legal Shield version is outdated',
      requiredAction: 'update_legal_shield',
    };
  }

  return { allowed: true };
}

/**
 * Get the Legal Shield status label for display
 */
export function getLegalShieldStatusLabel(status: LegalShieldStatus): string {
  const labels: Record<LegalShieldStatus, string> = {
    pending: 'Pending Review',
    accepted: 'Accepted',
    declined: 'Declined',
    expired: 'Expired',
  };

  return labels[status];
}
