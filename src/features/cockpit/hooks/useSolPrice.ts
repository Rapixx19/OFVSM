/**
 * @file useSolPrice.ts
 * @summary Hook to poll SOL/USD price from Jupiter Price API v2 every 10 seconds
 * @dependencies react
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Jupiter Price API v2 response structure
 */
interface JupiterPriceResponse {
  data: {
    [mintAddress: string]: {
      id: string;
      type: string;
      price: string;
    };
  };
  timeTaken: number;
}

/**
 * SOL mint address on Solana
 */
const SOL_MINT = 'So11111111111111111111111111111111111111112';

/**
 * Jupiter Price API v2 endpoint
 */
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2';

/**
 * Polling interval in milliseconds (10 seconds)
 */
const POLL_INTERVAL_MS = 10_000;

/**
 * Return type for useSolPrice hook
 */
interface UseSolPriceReturn {
  /** Current SOL price in USD */
  price: number | null;
  /** Whether the price is currently being fetched */
  isLoading: boolean;
  /** Error if price fetch failed */
  error: Error | null;
  /** Timestamp of last successful price update */
  lastUpdated: Date | null;
  /** Manually refresh the price */
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and poll SOL/USD price from Jupiter Price API v2
 * Polls every 10 seconds to maintain real-time price data
 *
 * @returns Current SOL price, loading state, and error state
 */
export function useSolPrice(): UseSolPriceReturn {
  const [price, setPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);
  // Use ref to store interval ID
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch SOL price from Jupiter API
   */
  const fetchPrice = useCallback(async () => {
    try {
      const url = new URL(JUPITER_PRICE_API);
      url.searchParams.set('ids', SOL_MINT);

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`);
      }

      const data: JupiterPriceResponse = await response.json();
      const solData = data.data[SOL_MINT];

      if (!solData) {
        throw new Error('SOL price data not found in response');
      }

      const newPrice = parseFloat(solData.price);

      if (isNaN(newPrice)) {
        throw new Error('Invalid price value received');
      }

      if (isMountedRef.current) {
        setPrice(newPrice);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch SOL price'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchPrice();
  }, [fetchPrice]);

  /**
   * Set up polling on mount
   */
  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch
    fetchPrice();

    // Set up polling interval
    intervalRef.current = setInterval(fetchPrice, POLL_INTERVAL_MS);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrice]);

  return {
    price,
    isLoading,
    error,
    lastUpdated,
    refresh,
  };
}
