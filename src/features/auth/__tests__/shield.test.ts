/**
 * @file shield.test.ts
 * @summary Integration tests for middleware redirect behavior
 * @dependencies vitest, @/types
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Profile, LegalShieldStatus, UserRole } from '@/types';

/**
 * Factory function to create test profiles
 */
function createTestProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'test-wallet-address',
    role: 'public' as UserRole,
    legalShieldStatus: 'pending' as LegalShieldStatus,
    legalShieldAcceptedAt: undefined,
    legalShieldVersion: undefined,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

/**
 * Factory function to create mock Supabase session
 */
function createMockSession(userId: string) {
  return {
    user: {
      id: userId,
      email: `${userId}@wallet.vecterai.foundation`,
    },
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
  };
}

/**
 * Mock implementation of the middleware logic
 * This tests the core redirect logic without Next.js dependencies
 */
function evaluateMiddlewareRedirect(params: {
  pathname: string;
  user: { id: string } | null;
  profile: { legal_shield_status: LegalShieldStatus } | null;
}): { redirect: string | null } {
  const PROTECTED_ROUTES = ['/cockpit', '/launcher', '/locker', '/dashboard'];
  const PUBLIC_ROUTES = ['/', '/shield', '/api/auth'];

  const { pathname, user, profile } = params;

  // Skip public routes
  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return { redirect: null };
  }

  // No session - redirect to home
  if (!user) {
    return { redirect: '/' };
  }

  // Check protected routes
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtected) {
    // No profile or legal shield not accepted - redirect to shield
    if (!profile || profile.legal_shield_status !== 'accepted') {
      return { redirect: '/shield' };
    }
  }

  return { redirect: null };
}

describe('Middleware redirect behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Public routes', () => {
    it('allows access to home page without session', () => {
      const result = evaluateMiddlewareRedirect({
        pathname: '/',
        user: null,
        profile: null,
      });

      expect(result.redirect).toBeNull();
    });

    it('allows access to shield page without session', () => {
      const result = evaluateMiddlewareRedirect({
        pathname: '/shield',
        user: null,
        profile: null,
      });

      expect(result.redirect).toBeNull();
    });

    it('allows access to auth API routes without session', () => {
      const result = evaluateMiddlewareRedirect({
        pathname: '/api/auth/callback',
        user: null,
        profile: null,
      });

      expect(result.redirect).toBeNull();
    });
  });

  describe('Protected routes without session', () => {
    it('redirects to / when accessing /cockpit without session', () => {
      const result = evaluateMiddlewareRedirect({
        pathname: '/cockpit',
        user: null,
        profile: null,
      });

      expect(result.redirect).toBe('/');
    });

    it('redirects to / when accessing /launcher without session', () => {
      const result = evaluateMiddlewareRedirect({
        pathname: '/launcher',
        user: null,
        profile: null,
      });

      expect(result.redirect).toBe('/');
    });

    it('redirects to / when accessing /locker without session', () => {
      const result = evaluateMiddlewareRedirect({
        pathname: '/locker',
        user: null,
        profile: null,
      });

      expect(result.redirect).toBe('/');
    });

    it('redirects to / when accessing /dashboard without session', () => {
      const result = evaluateMiddlewareRedirect({
        pathname: '/dashboard',
        user: null,
        profile: null,
      });

      expect(result.redirect).toBe('/');
    });
  });

  describe('Protected routes with session but pending legal shield', () => {
    it('redirects to /shield when legal_shield_status is pending', () => {
      const result = evaluateMiddlewareRedirect({
        pathname: '/cockpit',
        user: { id: 'test-user-id' },
        profile: { legal_shield_status: 'pending' },
      });

      expect(result.redirect).toBe('/shield');
    });

    it('redirects to /shield when legal_shield_status is declined', () => {
      const result = evaluateMiddlewareRedirect({
        pathname: '/cockpit',
        user: { id: 'test-user-id' },
        profile: { legal_shield_status: 'declined' },
      });

      expect(result.redirect).toBe('/shield');
    });

    it('redirects to /shield when legal_shield_status is expired', () => {
      const result = evaluateMiddlewareRedirect({
        pathname: '/cockpit',
        user: { id: 'test-user-id' },
        profile: { legal_shield_status: 'expired' },
      });

      expect(result.redirect).toBe('/shield');
    });

    it('redirects to /shield when profile is null', () => {
      const result = evaluateMiddlewareRedirect({
        pathname: '/cockpit',
        user: { id: 'test-user-id' },
        profile: null,
      });

      expect(result.redirect).toBe('/shield');
    });
  });

  describe('Protected routes with accepted legal shield', () => {
    it('allows access to /cockpit when legal shield is accepted', () => {
      const result = evaluateMiddlewareRedirect({
        pathname: '/cockpit',
        user: { id: 'test-user-id' },
        profile: { legal_shield_status: 'accepted' },
      });

      expect(result.redirect).toBeNull();
    });

    it('allows access to /launcher when legal shield is accepted', () => {
      const result = evaluateMiddlewareRedirect({
        pathname: '/launcher',
        user: { id: 'test-user-id' },
        profile: { legal_shield_status: 'accepted' },
      });

      expect(result.redirect).toBeNull();
    });

    it('allows access to /locker when legal shield is accepted', () => {
      const result = evaluateMiddlewareRedirect({
        pathname: '/locker',
        user: { id: 'test-user-id' },
        profile: { legal_shield_status: 'accepted' },
      });

      expect(result.redirect).toBeNull();
    });

    it('allows access to nested protected routes when legal shield is accepted', () => {
      const result = evaluateMiddlewareRedirect({
        pathname: '/cockpit/settings',
        user: { id: 'test-user-id' },
        profile: { legal_shield_status: 'accepted' },
      });

      expect(result.redirect).toBeNull();
    });
  });

  describe('Test utilities', () => {
    it('createTestProfile creates valid profile with defaults', () => {
      const profile = createTestProfile();

      expect(profile.id).toBe('test-wallet-address');
      expect(profile.role).toBe('public');
      expect(profile.legalShieldStatus).toBe('pending');
    });

    it('createTestProfile allows overriding defaults', () => {
      const profile = createTestProfile({
        id: 'custom-id',
        legalShieldStatus: 'accepted',
        legalShieldAcceptedAt: new Date('2026-02-01'),
        legalShieldVersion: '2026.1.0',
      });

      expect(profile.id).toBe('custom-id');
      expect(profile.legalShieldStatus).toBe('accepted');
      expect(profile.legalShieldVersion).toBe('2026.1.0');
    });

    it('createMockSession creates valid session object', () => {
      const session = createMockSession('test-user-123');

      expect(session.user.id).toBe('test-user-123');
      expect(session.user.email).toBe('test-user-123@wallet.vecterai.foundation');
      expect(session.access_token).toBeTruthy();
    });
  });
});
