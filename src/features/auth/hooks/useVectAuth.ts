/**
 * @file useVectAuth.ts
 * @summary SIWS (Sign In With Solana) authentication hook
 * @dependencies @solana/wallet-adapter-react, @/store/authStore, @/lib/supabase/client, bs58
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { useAuthStore } from '@/store/authStore';
import { createClient } from '@/lib/supabase/client';
import {
  getOrCreateProfile,
  acceptLegalShield as acceptLegalShieldService,
  CURRENT_LEGAL_SHIELD_VERSION,
} from '@/features/auth/services/profileService';

/**
 * Return type for useVectAuth hook
 */
interface UseVectAuthReturn {
  /** Whether wallet is connected */
  isConnected: boolean;
  /** Whether user is fully authenticated (wallet + Supabase session) */
  isAuthenticated: boolean;
  /** Whether authentication is in progress */
  isLoading: boolean;
  /** Connected wallet address */
  walletAddress: string | null;
  /** Sign in with Solana wallet */
  signIn: () => Promise<void>;
  /** Sign out and disconnect wallet */
  signOut: () => Promise<void>;
  /** Accept the Legal Shield terms */
  acceptShield: () => Promise<void>;
  /** Current error if any */
  error: Error | null;
}

/**
 * Generates a SIWS nonce message for signing
 */
function createSiwsMessage(address: string, timestamp: number): string {
  return `Sign in to VECTERAI Foundation\nTimestamp: ${timestamp}\nWallet: ${address}`;
}

/**
 * Custom hook for VECTERAI authentication using SIWS
 * Handles wallet connection, Supabase authentication, and legal shield status
 */
export function useVectAuth(): UseVectAuthReturn {
  const { publicKey, signMessage, disconnect, connected } = useWallet();
  const {
    isAuthenticated,
    isLoading,
    setProfile,
    setWalletAddress,
    setLoading,
    setAuthenticated,
    setLegalShieldAccepted,
    setError: setStoreError,
    reset,
  } = useAuthStore();

  const [error, setError] = useState<Error | null>(null);

  const walletAddress = publicKey?.toBase58() ?? null;

  // Sync wallet address with store
  useEffect(() => {
    setWalletAddress(walletAddress);
  }, [walletAddress, setWalletAddress]);

  /**
   * Check for existing Supabase session on mount
   */
  useEffect(() => {
    const checkSession = async () => {
      if (!connected || !walletAddress) {
        return;
      }

      setLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Fetch or create profile
          const userProfile = await getOrCreateProfile(walletAddress);
          setProfile(userProfile);
          setAuthenticated(true);
        }
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [connected, walletAddress, setLoading, setProfile, setAuthenticated]);

  /**
   * Sign in with Solana wallet (SIWS)
   */
  const signIn = useCallback(async () => {
    if (!publicKey || !signMessage || !walletAddress) {
      setError(new Error('Wallet not connected'));
      return;
    }

    setLoading(true);
    setError(null);
    setStoreError(null);

    try {
      // Create timestamp for nonce (5-minute validity)
      const timestamp = Date.now();
      const message = createSiwsMessage(walletAddress, timestamp);

      // Sign the message with wallet
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      const signatureBase58 = bs58.encode(signature);

      // Authenticate with Supabase using custom token
      const supabase = createClient();

      // Call Supabase auth with signed message
      // This would typically call an Edge Function that verifies the signature
      // For now, we use a placeholder that will need to be connected to your Edge Function
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: `${walletAddress}@wallet.vecterai.foundation`,
        password: signatureBase58,
      });

      if (authError) {
        // If user doesn't exist, try to sign up
        if (authError.message.includes('Invalid login credentials')) {
          const { error: signUpError } = await supabase.auth.signUp({
            email: `${walletAddress}@wallet.vecterai.foundation`,
            password: signatureBase58,
          });

          if (signUpError) {
            throw new Error(`Authentication failed: ${signUpError.message}`);
          }
        } else {
          throw new Error(`Authentication failed: ${authError.message}`);
        }
      }

      // Fetch or create profile
      const userProfile = await getOrCreateProfile(walletAddress);
      setProfile(userProfile);
      setAuthenticated(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err : new Error('Sign in failed');
      setError(errorMessage);
      setStoreError(errorMessage.message);
      throw errorMessage;
    } finally {
      setLoading(false);
    }
  }, [
    publicKey,
    signMessage,
    walletAddress,
    setLoading,
    setProfile,
    setAuthenticated,
    setStoreError,
  ]);

  /**
   * Sign out and disconnect wallet
   */
  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      await disconnect();
      reset();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err : new Error('Sign out failed');
      setError(errorMessage);
      throw errorMessage;
    } finally {
      setLoading(false);
    }
  }, [disconnect, reset, setLoading]);

  /**
   * Accept the Legal Shield terms
   */
  const acceptShield = useCallback(async () => {
    if (!walletAddress) {
      setError(new Error('Wallet not connected'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Update profile in database
      const updatedProfile = await acceptLegalShieldService(walletAddress);
      setProfile(updatedProfile);
      setLegalShieldAccepted(CURRENT_LEGAL_SHIELD_VERSION);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err : new Error('Failed to accept Legal Shield');
      setError(errorMessage);
      throw errorMessage;
    } finally {
      setLoading(false);
    }
  }, [walletAddress, setLoading, setProfile, setLegalShieldAccepted]);

  return {
    isConnected: connected,
    isAuthenticated,
    isLoading,
    walletAddress,
    signIn,
    signOut,
    acceptShield,
    error,
  };
}
