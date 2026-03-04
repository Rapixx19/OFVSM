/**
 * @file useWalletStore.ts
 * @summary Pure state selectors and derived getters
 * @dependencies zustand
 */

'use client';

import { useCallback } from 'react';
import { useMultiWalletStore } from '../store/multiWalletStore';
import type { UserWallet } from '../types/wallet';

/**
 * Hook for wallet state selectors and getters
 */
export function useWalletStore() {
  const store = useMultiWalletStore();

  /**
   * Get main wallet
   */
  const getMainWallet = useCallback((): UserWallet | undefined => {
    return store.wallets.find((w) => w.isMain);
  }, [store.wallets]);

  /**
   * Get active wallet
   */
  const getActiveWallet = useCallback((): UserWallet | undefined => {
    return store.wallets.find((w) => w.id === store.activeWalletId);
  }, [store.wallets, store.activeWalletId]);

  /**
   * Get verified wallets only
   */
  const getVerifiedWallets = useCallback((): UserWallet[] => {
    return store.wallets.filter((w) => w.isVerified || w.isMain);
  }, [store.wallets]);

  return {
    // State
    wallets: store.wallets,
    activeWalletId: store.activeWalletId,
    isLoading: store.isLoading,
    error: store.error,
    pendingVerification: store.pendingVerification,

    // Store actions (for internal use)
    setWallets: store.setWallets,
    setActiveWallet: store.setActiveWallet,
    setPendingVerification: store.setPendingVerification,
    setLoading: store.setLoading,
    setError: store.setError,
    reset: store.reset,

    // Getters
    getMainWallet,
    getActiveWallet,
    getVerifiedWallets,
  };
}
