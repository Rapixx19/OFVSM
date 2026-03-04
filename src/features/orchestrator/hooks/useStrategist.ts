/**
 * @file useStrategist.ts
 * @summary React hook for Strategist Agent market condition management
 * @dependencies zustand, react
 */

'use client';

import { create } from 'zustand';
import { useCallback, useEffect, useRef } from 'react';

import type {
  ExecutionType,
  ExecutionParams,
  MarketConditions,
  EvaluationResult,
} from '../types/agent';
import { DEFAULT_EXECUTION_PARAMS } from '../types/agent';
import { getMarketEvaluator } from '../agents/StrategistAgent';

/**
 * Auto-refresh interval in milliseconds (60 seconds)
 */
const REFRESH_INTERVAL_MS = 60_000;

/**
 * Zustand store for strategist state
 */
interface StrategistStore {
  executionType: ExecutionType;
  executionParams: ExecutionParams;
  lastConditions: MarketConditions | null;
  lastEvaluation: EvaluationResult | null;
  isLoading: boolean;
  error: Error | null;
  setExecutionType: (type: ExecutionType) => void;
  setExecutionParams: (params: ExecutionParams) => void;
  setConditions: (conditions: MarketConditions, evaluation: EvaluationResult) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  reset: () => void;
}

const useStrategistStore = create<StrategistStore>((set) => ({
  executionType: 'timestamp',
  executionParams: DEFAULT_EXECUTION_PARAMS,
  lastConditions: null,
  lastEvaluation: null,
  isLoading: false,
  error: null,

  setExecutionType: (executionType) => set({ executionType }),

  setExecutionParams: (params) =>
    set({
      executionParams: { ...DEFAULT_EXECUTION_PARAMS, ...params },
    }),

  setConditions: (lastConditions, lastEvaluation) =>
    set({ lastConditions, lastEvaluation, error: null }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  reset: () =>
    set({
      executionType: 'timestamp',
      executionParams: DEFAULT_EXECUTION_PARAMS,
      lastConditions: null,
      lastEvaluation: null,
      isLoading: false,
      error: null,
    }),
}));

/**
 * Hook return type
 */
export interface UseStrategistReturn {
  executionType: ExecutionType;
  executionParams: ExecutionParams;
  lastConditions: MarketConditions | null;
  lastEvaluation: EvaluationResult | null;
  isLoading: boolean;
  error: Error | null;
  isGo: boolean;
  setExecutionType: (type: ExecutionType) => void;
  setExecutionParams: (params: ExecutionParams) => void;
  refreshConditions: () => Promise<void>;
  reset: () => void;
}

/**
 * Hook for managing Strategist Agent state
 */
export function useStrategist(): UseStrategistReturn {
  const store = useStrategistStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Fetch and evaluate market conditions
   */
  const refreshConditions = useCallback(async () => {
    store.setLoading(true);
    store.setError(null);

    try {
      const evaluator = getMarketEvaluator();
      const conditions = await evaluator.getMarketConditions();
      const evaluation = evaluator.evaluate(conditions, store.executionParams);
      store.setConditions(conditions, evaluation);
    } catch (err) {
      store.setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  /**
   * Auto-refresh conditions when market_optimized is enabled
   */
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only auto-refresh when market_optimized mode is enabled
    if (store.executionType !== 'market_optimized') {
      return;
    }

    // Fetch immediately
    refreshConditions();

    // Set up interval for auto-refresh
    intervalRef.current = setInterval(refreshConditions, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [store.executionType, refreshConditions]);

  /**
   * Determine if conditions are GO
   */
  const isGo = store.lastEvaluation?.isGo ?? false;

  return {
    executionType: store.executionType,
    executionParams: store.executionParams,
    lastConditions: store.lastConditions,
    lastEvaluation: store.lastEvaluation,
    isLoading: store.isLoading,
    error: store.error,
    isGo,
    setExecutionType: store.setExecutionType,
    setExecutionParams: store.setExecutionParams,
    refreshConditions,
    reset: store.reset,
  };
}
