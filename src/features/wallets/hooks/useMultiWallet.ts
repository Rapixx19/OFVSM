/**
 * @file useMultiWallet.ts
 * @summary Facade composing all wallet hooks
 * @dependencies ./useWalletStore, ./useWalletActions, ./useWalletVerification
 */

'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from './useWalletStore';
import { useWalletActions } from './useWalletActions';
import { useWalletVerification } from './useWalletVerification';

// Re-export store for external consumers
export { useMultiWalletStore } from '../store/multiWalletStore';

/**
 * Hook for multi-wallet management
 * Facade that composes store, actions, and verification hooks
 */
export function useMultiWallet() {
  const { profile } = useAuthStore();
  const fetchedRef = useRef(false);

  // Compose hooks
  const storeHook = useWalletStore();
  const actions = useWalletActions();
  const verification = useWalletVerification(actions.fetchWallets);

  // Fetch wallets on mount and when profile changes
  useEffect(() => {
    if (profile?.id && !fetchedRef.current) {
      fetchedRef.current = true;
      actions.fetchWallets();
    }
  }, [profile?.id, actions.fetchWallets]);

  // Reset when profile changes
  useEffect(() => {
    if (!profile?.id) {
      fetchedRef.current = false;
      storeHook.reset();
    }
  }, [profile?.id, storeHook.reset]);

  return {
    // State from store
    wallets: storeHook.wallets,
    activeWalletId: storeHook.activeWalletId,
    isLoading: storeHook.isLoading,
    error: storeHook.error,
    pendingVerification: storeHook.pendingVerification,

    // Actions
    fetchWallets: actions.fetchWallets,
    addAltWallet: actions.addAltWallet,
    removeWallet: actions.removeWallet,
    updateLabel: actions.updateLabel,
    setActiveWallet: actions.setActiveWallet,

    // Verification
    verifyAltWallet: verification.verifyAltWallet,
    cancelVerification: verification.cancelVerification,

    // Getters
    getMainWallet: storeHook.getMainWallet,
    getActiveWallet: storeHook.getActiveWallet,
    getVerifiedWallets: storeHook.getVerifiedWallets,
  };
}
