/**
 * @file page.tsx
 * @summary Legal Shield acceptance page
 * @dependencies next/navigation, @/components/shared/LegalShield, @/features/auth/hooks/useVectAuth
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, Suspense } from 'react';
import { LegalShield } from '@/components/shared/LegalShield';
import { useVectAuth } from '@/features/auth/hooks/useVectAuth';
import { useAuthStore } from '@/store/authStore';

/**
 * Inner component that uses useSearchParams
 */
function ShieldContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { acceptShield, signOut, isLoading, isAuthenticated } = useVectAuth();
  const { profile } = useAuthStore();

  const redirectPath = searchParams.get('redirect') ?? '/cockpit';

  // If already accepted, redirect to intended destination
  useEffect(() => {
    if (isAuthenticated && profile?.legalShieldStatus === 'accepted') {
      router.push(redirectPath);
    }
  }, [isAuthenticated, profile, redirectPath, router]);

  /**
   * Handle accept action
   */
  const handleAccept = useCallback(async () => {
    try {
      await acceptShield();
      router.push(redirectPath);
    } catch (error) {
      console.error('Failed to accept Legal Shield:', error);
    }
  }, [acceptShield, redirectPath, router]);

  /**
   * Handle decline action - sign out and redirect to home
   */
  const handleDecline = useCallback(async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Failed to sign out:', error);
      router.push('/');
    }
  }, [signOut, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="text-center">
        <h1 className="mb-4 text-3xl font-bold text-white">
          VECTERAI Foundation
        </h1>
        <p className="mb-8 text-gray-400">
          Please accept the Legal Shield to continue
        </p>
      </div>

      <LegalShield
        isOpen={true}
        onAccept={handleAccept}
        onDecline={handleDecline}
        isLoading={isLoading}
      />
    </main>
  );
}

/**
 * Legal Shield page component
 * Displayed when user needs to accept legal terms
 */
export default function ShieldPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="text-center">
            <h1 className="mb-4 text-3xl font-bold text-white">
              VECTERAI Foundation
            </h1>
            <p className="text-gray-400">Loading...</p>
          </div>
        </main>
      }
    >
      <ShieldContent />
    </Suspense>
  );
}
