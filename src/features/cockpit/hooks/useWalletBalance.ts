/**
 * @file useWalletBalance.ts
 * @summary Hook to stream live wallet balance using Solana onAccountChange listener
 * @dependencies @solana/wallet-adapter-react, @solana/web3.js, react
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, type AccountInfo } from '@solana/web3.js';

/**
 * Return type for useWalletBalance hook
 */
interface UseWalletBalanceReturn {
  /** Current balance in SOL */
  balance: number | null;
  /** Current balance in lamports */
  balanceLamports: bigint | null;
  /** Whether the initial balance is being fetched */
  isLoading: boolean;
  /** Error if balance fetch failed */
  error: Error | null;
  /** Whether the WebSocket subscription is active */
  isSubscribed: boolean;
  /** Manually refresh the balance */
  refresh: () => Promise<void>;
}

/**
 * Hook to stream live wallet balance using Solana's onAccountChange WebSocket
 * Uses WebSocket subscription for instant updates instead of polling
 *
 * @returns Current balance in SOL, loading state, and subscription status
 */
export function useWalletBalance(): UseWalletBalanceReturn {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLamports, setBalanceLamports] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Track subscription ID for cleanup
  const subscriptionRef = useRef<number | null>(null);
  // Track if component is mounted
  const isMountedRef = useRef(true);

  /**
   * Update balance state from lamports value
   */
  const updateBalance = useCallback((lamports: bigint) => {
    if (!isMountedRef.current) return;

    setBalanceLamports(lamports);
    setBalance(Number(lamports) / LAMPORTS_PER_SOL);
    setError(null);
  }, []);

  /**
   * Fetch initial balance
   */
  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      setBalanceLamports(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const lamports = await connection.getBalance(publicKey);
      updateBalance(BigInt(lamports));
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch balance'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [connection, publicKey, updateBalance]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchBalance();
  }, [fetchBalance]);

  /**
   * Set up WebSocket subscription for account changes
   */
  useEffect(() => {
    isMountedRef.current = true;

    // Clean up any existing subscription
    if (subscriptionRef.current !== null) {
      connection.removeAccountChangeListener(subscriptionRef.current);
      subscriptionRef.current = null;
      setIsSubscribed(false);
    }

    // If no wallet connected, reset state
    if (!publicKey) {
      setBalance(null);
      setBalanceLamports(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Fetch initial balance
    fetchBalance();

    // Subscribe to account changes via WebSocket
    try {
      subscriptionRef.current = connection.onAccountChange(
        publicKey,
        (accountInfo: AccountInfo<Buffer>) => {
          if (isMountedRef.current) {
            updateBalance(BigInt(accountInfo.lamports));
          }
        },
        'confirmed'
      );
      setIsSubscribed(true);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to subscribe to account changes'));
        setIsSubscribed(false);
      }
    }

    // Cleanup subscription on unmount or wallet change
    return () => {
      isMountedRef.current = false;
      if (subscriptionRef.current !== null) {
        connection.removeAccountChangeListener(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [connection, publicKey, fetchBalance, updateBalance]);

  return {
    balance,
    balanceLamports,
    isLoading,
    error,
    isSubscribed,
    refresh,
  };
}
