/**
 * @file authStore.ts
 * @summary Zustand store for authentication state management
 * @dependencies zustand, @/types
 */

import { create } from 'zustand';
import type { Profile } from '@/types';

/**
 * Authentication state interface
 */
interface AuthState {
  /** Whether the user is authenticated (wallet connected + Supabase session) */
  isAuthenticated: boolean;
  /** Whether authentication is in progress */
  isLoading: boolean;
  /** User's profile from Supabase */
  profile: Profile | null;
  /** Connected wallet address */
  walletAddress: string | null;
  /** Whether legal shield acceptance is required */
  legalShieldRequired: boolean;
  /** Error message if authentication fails */
  error: string | null;
}

/**
 * Authentication actions interface
 */
interface AuthActions {
  /** Set the user's profile */
  setProfile: (profile: Profile | null) => void;
  /** Set the connected wallet address */
  setWalletAddress: (address: string | null) => void;
  /** Set authentication loading state */
  setLoading: (loading: boolean) => void;
  /** Set authentication status */
  setAuthenticated: (authenticated: boolean) => void;
  /** Update legal shield acceptance in state */
  setLegalShieldAccepted: (version: string) => void;
  /** Set legal shield required flag */
  setLegalShieldRequired: (required: boolean) => void;
  /** Set error message */
  setError: (error: string | null) => void;
  /** Reset auth state to initial values */
  reset: () => void;
}

/**
 * Initial authentication state
 */
const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  profile: null,
  walletAddress: null,
  legalShieldRequired: false,
  error: null,
};

/**
 * Zustand store for authentication state
 */
export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  ...initialState,

  setProfile: (profile) =>
    set({
      profile,
      legalShieldRequired: profile
        ? profile.legalShieldStatus !== 'accepted'
        : false,
    }),

  setWalletAddress: (walletAddress) =>
    set({ walletAddress }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setAuthenticated: (isAuthenticated) =>
    set({ isAuthenticated }),

  setLegalShieldAccepted: (version) =>
    set((state) => ({
      profile: state.profile
        ? {
            ...state.profile,
            legalShieldStatus: 'accepted' as const,
            legalShieldAcceptedAt: new Date(),
            legalShieldVersion: version,
          }
        : null,
      legalShieldRequired: false,
    })),

  setLegalShieldRequired: (legalShieldRequired) =>
    set({ legalShieldRequired }),

  setError: (error) =>
    set({ error }),

  reset: () =>
    set(initialState),
}));
