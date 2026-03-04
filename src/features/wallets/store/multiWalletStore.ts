/**
 * @file multiWalletStore.ts
 * @summary Zustand store for multi-wallet state management
 * @dependencies zustand
 */

import { create } from 'zustand';
import type { UserWallet, PendingVerification } from '../types/wallet';

/**
 * Multi-wallet store state
 */
export interface MultiWalletState {
  wallets: UserWallet[];
  activeWalletId: string | null;
  isLoading: boolean;
  error: Error | null;
  pendingVerification: PendingVerification | null;
}

/**
 * Multi-wallet store actions
 */
export interface MultiWalletActions {
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
export function generateNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create verification message for signing
 */
export function createVerificationMessage(nonce: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return `VECTERAI Wallet Verification\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}
