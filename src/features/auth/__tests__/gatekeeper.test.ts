/**
 * @file gatekeeper.test.ts
 * @summary Tests for Legal Shield acceptance detection from profile data
 * @dependencies vitest, @/features/auth/services/gatekeeper, @/types
 */

import { describe, it, expect } from 'vitest';
import {
  hasAcceptedLegalShield,
  isLegalShieldExpired,
  hasMinimumVersion,
  validateAccess,
  getLegalShieldStatusLabel,
  LEGAL_SHIELD_EXPIRATION_DAYS,
} from '../services/gatekeeper';
import type { Profile } from '@/types';

/**
 * Factory function to create test profiles
 */
function createTestProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'test-wallet-address',
    role: 'public',
    legalShieldStatus: 'accepted',
    legalShieldAcceptedAt: new Date(),
    legalShieldVersion: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('gatekeeper', () => {
  describe('hasAcceptedLegalShield', () => {
    it('returns true when Legal Shield status is accepted', () => {
      const profile = createTestProfile({ legalShieldStatus: 'accepted' });
      expect(hasAcceptedLegalShield(profile)).toBe(true);
    });

    it('returns false when Legal Shield status is pending', () => {
      const profile = createTestProfile({ legalShieldStatus: 'pending' });
      expect(hasAcceptedLegalShield(profile)).toBe(false);
    });

    it('returns false when Legal Shield status is declined', () => {
      const profile = createTestProfile({ legalShieldStatus: 'declined' });
      expect(hasAcceptedLegalShield(profile)).toBe(false);
    });

    it('returns false when Legal Shield status is expired', () => {
      const profile = createTestProfile({ legalShieldStatus: 'expired' });
      expect(hasAcceptedLegalShield(profile)).toBe(false);
    });
  });

  describe('isLegalShieldExpired', () => {
    it('returns false when acceptance is recent', () => {
      const profile = createTestProfile({
        legalShieldStatus: 'accepted',
        legalShieldAcceptedAt: new Date(),
      });
      expect(isLegalShieldExpired(profile)).toBe(false);
    });

    it('returns true when acceptance is older than expiration period', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - (LEGAL_SHIELD_EXPIRATION_DAYS + 1));

      const profile = createTestProfile({
        legalShieldStatus: 'accepted',
        legalShieldAcceptedAt: oldDate,
      });
      expect(isLegalShieldExpired(profile)).toBe(true);
    });

    it('returns true when status is not accepted', () => {
      const profile = createTestProfile({ legalShieldStatus: 'pending' });
      expect(isLegalShieldExpired(profile)).toBe(true);
    });

    it('returns true when acceptedAt date is missing', () => {
      const profile = createTestProfile({
        legalShieldStatus: 'accepted',
        legalShieldAcceptedAt: undefined,
      });
      expect(isLegalShieldExpired(profile)).toBe(true);
    });
  });

  describe('hasMinimumVersion', () => {
    it('returns true for matching minimum version', () => {
      const profile = createTestProfile({ legalShieldVersion: '1.0.0' });
      expect(hasMinimumVersion(profile)).toBe(true);
    });

    it('returns true for higher version', () => {
      const profile = createTestProfile({ legalShieldVersion: '2.0.0' });
      expect(hasMinimumVersion(profile)).toBe(true);
    });

    it('returns false for lower version', () => {
      const profile = createTestProfile({ legalShieldVersion: '0.9.0' });
      expect(hasMinimumVersion(profile)).toBe(false);
    });

    it('returns false when version is missing', () => {
      const profile = createTestProfile({ legalShieldVersion: undefined });
      expect(hasMinimumVersion(profile)).toBe(false);
    });
  });

  describe('validateAccess', () => {
    it('allows access for valid profile', () => {
      const profile = createTestProfile();
      const result = validateAccess(profile);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('denies access when Legal Shield not accepted', () => {
      const profile = createTestProfile({ legalShieldStatus: 'pending' });
      const result = validateAccess(profile);

      expect(result.allowed).toBe(false);
      expect(result.requiredAction).toBe('accept_legal_shield');
    });

    it('denies access when Legal Shield expired', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - (LEGAL_SHIELD_EXPIRATION_DAYS + 1));

      const profile = createTestProfile({ legalShieldAcceptedAt: oldDate });
      const result = validateAccess(profile);

      expect(result.allowed).toBe(false);
      expect(result.requiredAction).toBe('renew');
    });

    it('denies access when version is outdated', () => {
      const profile = createTestProfile({ legalShieldVersion: '0.5.0' });
      const result = validateAccess(profile);

      expect(result.allowed).toBe(false);
      expect(result.requiredAction).toBe('update_legal_shield');
    });
  });

  describe('getLegalShieldStatusLabel', () => {
    it('returns correct label for accepted status', () => {
      expect(getLegalShieldStatusLabel('accepted')).toBe('Accepted');
    });

    it('returns correct label for pending status', () => {
      expect(getLegalShieldStatusLabel('pending')).toBe('Pending Review');
    });

    it('returns correct label for declined status', () => {
      expect(getLegalShieldStatusLabel('declined')).toBe('Declined');
    });

    it('returns correct label for expired status', () => {
      expect(getLegalShieldStatusLabel('expired')).toBe('Expired');
    });
  });
});
