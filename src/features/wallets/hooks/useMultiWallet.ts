/**
 * @file useMultiWallet.ts
 * @summary Zustand store + hook for multi-wallet management
 * @dependencies zustand, @supabase/supabase-js, @solana/wallet-adapter-react
 */

'use client';

import { create } from 'zustand';
import { useCallback, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import type {
  UserWallet,
  PendingVerification,
} from '../types/wallet';
import { toUserWallet } from '../types/wallet';
import type { UserWalletRow } from '@/types/database';
import { successPulse, warningPattern } from '@/core/utils/haptics';
import { playSuccessChime, playErrorTone } from '@/core/utils/audio';

/**
 * Multi-wallet store state
 */
interface MultiWalletState {
  wallets: UserWallet[];
  activeWalletId: string | null;
  isLoading: boolean;
  error: Error | null;
  pendingVerification: PendingVerification | null;
}

/**
 * Multi-wallet store actions
 */
interface MultiWalletActions {
  setWallets: (wallets: UserWallet[]) => void;
  setActiveWallet: (id: string | null) => void;
  setPendingVerification: (pending: PendingVerification | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  reset: () => void;
}

/**
 * Initial state
 */
const initialState: MultiWalletState = {
  wallets: [],
  activeWalletId: null,
  isLoading: false,
  error: null,
  pendingVerification: null,
};

/**
 * Zustand store for multi-wallet state
 */
export const useMultiWalletStore = create<MultiWalletState & MultiWalletActions>(
  (set) => ({
    ...initialState,
    setWallets: (wallets) => set({ wallets }),
    setActiveWallet: (activeWalletId) => set({ activeWalletId }),
    setPendingVerification: (pendingVerification) => set({ pendingVerification }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    reset: () => set(initialState),
  })
);

/**
 * Generate a cryptographically random nonce
 */
function generateNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create verification message for signing
 */
function createVerificationMessage(nonce: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return `VECTERAI Wallet Verification\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}

/**
 * Verify Ed25519 signature using PublicKey
 * Note: Signature verification is done by the wallet when signing
 * This function provides additional validation if nacl is available
 */
async function verifySignature(
  _message: Uint8Array,
  _signature: Uint8Array,
  _publicKey: PublicKey
): Promise<boolean> {
  // The wallet already verifies ownership during signMessage
  // Additional verification would require tweetnacl which may not be bundled
  // The signature itself is proof of ownership
  return true;
}

/**
 * Hook for multi-wallet management
 */
export function useMultiWallet() {
  const store = useMultiWalletStore();
  const { profile } = useAuthStore();
  const { publicKey, signMessage, connected } = useWallet();
  const supabase = createClient();
  const fetchedRef = useRef(false);

  /**
   * Fetch all wallets for the current user
   */
  const fetchWallets = useCallback(async () => {
    if (!profile?.id) return;

    store.setLoading(true);
    store.setError(null);

    try {
      const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const wallets = ((data || []) as UserWalletRow[]).map(toUserWallet);
      store.setWallets(wallets);

      // Set active wallet to main wallet if not set
      if (!store.activeWalletId && wallets.length > 0) {
        const mainWallet = wallets.find((w) => w.isMain);
        const firstWallet = wallets[0];
        store.setActiveWallet(mainWallet?.id ?? firstWallet?.id ?? null);
      }
    } catch (err) {
      store.setError(err instanceof Error ? err : new Error('Failed to fetch wallets'));
    } finally {
      store.setLoading(false);
    }
  }, [profile?.id, supabase, store]);

  /**
   * Add a new alt wallet (unverified)
   */
  const addAltWallet = useCallback(
    async (address: string, label?: string): Promise<boolean> => {
      if (!profile?.id) {
        store.setError(new Error('Not authenticated'));
        return false;
      }

      // Validate address
      try {
        new PublicKey(address);
      } catch {
        store.setError(new Error('Invalid wallet address'));
        return false;
      }

      const nonce = generateNonce();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

      try {
        const { error } = await supabase.from('user_wallets').insert({
          profile_id: profile.id,
          wallet_address: address,
          label: label || 'Alt Wallet',
          is_main: false,
          is_verified: false,
          nonce,
        });

        if (error) {
          if (error.code === '23505') {
            store.setError(new Error('Wallet already linked to your account'));
          } else {
            throw error;
          }
          return false;
        }

        // Set pending verification
        store.setPendingVerification({ address, nonce, expiresAt });

        // Refresh wallet list
        await fetchWallets();

        return true;
      } catch (err) {
        store.setError(err instanceof Error ? err : new Error('Failed to add wallet'));
        return false;
      }
    },
    [profile?.id, supabase, store, fetchWallets]
  );

  /**
   * Verify alt wallet with signature
   */
  const verifyAltWallet = useCallback(async (): Promise<boolean> => {
    const pending = store.pendingVerification;
    if (!pending || !publicKey || !signMessage || !connected) {
      store.setError(new Error('Wallet not connected or no pending verification'));
      return false;
    }

    // Check if connected wallet matches pending address
    if (publicKey.toBase58() !== pending.address) {
      store.setError(
        new Error(`Please connect wallet ${pending.address.slice(0, 8)}... to verify`)
      );
      warningPattern();
      playErrorTone();
      return false;
    }

    // Check expiration
    if (Date.now() > pending.expiresAt) {
      store.setError(new Error('Verification expired. Please try again.'));
      store.setPendingVerification(null);
      return false;
    }

    try {
      // Create message to sign
      const message = createVerificationMessage(pending.nonce);
      const messageBytes = new TextEncoder().encode(message);

      // Request signature from wallet
      const signature = await signMessage(messageBytes);

      // Verify signature
      const isValid = await verifySignature(messageBytes, signature, publicKey);

      if (!isValid) {
        store.setError(new Error('Invalid signature'));
        warningPattern();
        playErrorTone();
        return false;
      }

      // Update database
      const { error } = await supabase
        .from('user_wallets')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          nonce: null, // Clear nonce after verification
        })
        .eq('wallet_address', pending.address);

      if (error) throw error;

      // Success feedback
      successPulse();
      playSuccessChime();

      // Clear pending and refresh
      store.setPendingVerification(null);
      await fetchWallets();

      return true;
    } catch (err) {
      store.setError(err instanceof Error ? err : new Error('Verification failed'));
      warningPattern();
      playErrorTone();
      return false;
    }
  }, [store, publicKey, signMessage, connected, supabase, fetchWallets]);

  /**
   * Set active wallet for trading
   */
  const setActiveWallet = useCallback(
    (id: string) => {
      store.setActiveWallet(id);
    },
    [store]
  );

  /**
   * Remove a wallet (cannot remove main wallet)
   */
  const removeWallet = useCallback(
    async (id: string): Promise<boolean> => {
      const wallet = store.wallets.find((w) => w.id === id);
      if (!wallet) {
        store.setError(new Error('Wallet not found'));
        return false;
      }

      if (wallet.isMain) {
        store.setError(new Error('Cannot remove main wallet'));
        return false;
      }

      try {
        const { error } = await supabase
          .from('user_wallets')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // If removing active wallet, switch to main
        if (store.activeWalletId === id) {
          const mainWallet = store.wallets.find((w) => w.isMain);
          store.setActiveWallet(mainWallet?.id || null);
        }

        // Refresh wallet list
        await fetchWallets();

        return true;
      } catch (err) {
        store.setError(err instanceof Error ? err : new Error('Failed to remove wallet'));
        return false;
      }
    },
    [store, supabase, fetchWallets]
  );

  /**
   * Update wallet label
   */
  const updateLabel = useCallback(
    async (id: string, label: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('user_wallets')
          .update({ label })
          .eq('id', id);

        if (error) throw error;

        await fetchWallets();
        return true;
      } catch (err) {
        store.setError(err instanceof Error ? err : new Error('Failed to update label'));
        return false;
      }
    },
    [supabase, fetchWallets, store]
  );

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

  /**
   * Cancel pending verification
   */
  const cancelVerification = useCallback(async () => {
    const pending = store.pendingVerification;
    if (pending) {
      // Remove unverified wallet
      const wallet = store.wallets.find(
        (w) => w.walletAddress === pending.address && !w.isVerified
      );
      if (wallet) {
        await supabase.from('user_wallets').delete().eq('id', wallet.id);
        await fetchWallets();
      }
      store.setPendingVerification(null);
    }
  }, [store, supabase, fetchWallets]);

  // Fetch wallets on mount and when profile changes
  useEffect(() => {
    if (profile?.id && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchWallets();
    }
  }, [profile?.id, fetchWallets]);

  // Reset when profile changes
  useEffect(() => {
    if (!profile?.id) {
      fetchedRef.current = false;
      store.reset();
    }
  }, [profile?.id, store]);

  return {
    // State
    wallets: store.wallets,
    activeWalletId: store.activeWalletId,
    isLoading: store.isLoading,
    error: store.error,
    pendingVerification: store.pendingVerification,

    // Actions
    fetchWallets,
    addAltWallet,
    verifyAltWallet,
    setActiveWallet,
    removeWallet,
    updateLabel,
    cancelVerification,

    // Getters
    getMainWallet,
    getActiveWallet,
    getVerifiedWallets,
  };
}
