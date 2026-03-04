/**
 * @file useGhostLaunch.ts
 * @summary React hook for managing Ghost Engine launch state
 * @dependencies zustand, @solana/web3.js, @coral-xyz/anchor
 */

'use client';

import { create } from 'zustand';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useMemo } from 'react';
import { BN } from '@coral-xyz/anchor';
import { VersionedTransaction } from '@solana/web3.js';

import type {
  LaunchParams,
  BundleResult,
  FeeBreakdown,
  StepId,
  ValidationErrors,
  LaunchStatus,
} from '../types/ghost';
import { validateLaunchParams, isValidForLaunch } from '../types/ghost';
import { GhostBundler } from '../services/GhostBundler';
import {
  DEFAULT_DECIMALS,
  DEFAULT_TOTAL_SUPPLY,
  DEFAULT_TIP_LAMPORTS,
} from '../constants/addresses';
import { warningPattern } from '@/core/utils/haptics';
import { playErrorTone } from '@/core/utils/audio';

/**
 * Default launch parameters
 */
const DEFAULT_PARAMS: Partial<LaunchParams> = {
  decimals: DEFAULT_DECIMALS,
  totalSupply: new BN(DEFAULT_TOTAL_SUPPLY).mul(new BN(10).pow(new BN(DEFAULT_DECIMALS))),
  lockDurationDays: 90,
  isPermanentLock: false,
  useJito: true,
  jitoTipLamports: new BN(DEFAULT_TIP_LAMPORTS),
};

/**
 * Launch state store
 */
interface GhostLaunchStore {
  // Current step
  step: StepId;

  // Launch parameters (partial during form filling)
  params: Partial<LaunchParams>;

  // Computed fees
  fees: FeeBreakdown | null;

  // Launch status
  status: LaunchStatus;

  // Error state
  error: Error | null;

  // Result after successful launch
  result: BundleResult | null;

  // Actions
  setStep: (step: StepId) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateParams: (partial: Partial<LaunchParams>) => void;
  setFees: (fees: FeeBreakdown | null) => void;
  setStatus: (status: LaunchStatus) => void;
  setError: (error: Error | null) => void;
  setResult: (result: BundleResult | null) => void;
  reset: () => void;
}

/**
 * Zustand store for launch state
 */
export const useGhostLaunchStore = create<GhostLaunchStore>((set) => ({
  step: 1,
  params: DEFAULT_PARAMS,
  fees: null,
  status: 'idle',
  error: null,
  result: null,

  setStep: (step) => set({ step }),

  nextStep: () =>
    set((state) => ({
      step: Math.min(3, state.step + 1) as StepId,
    })),

  prevStep: () =>
    set((state) => ({
      step: Math.max(1, state.step - 1) as StepId,
    })),

  updateParams: (partial) =>
    set((state) => ({
      params: { ...state.params, ...partial },
    })),

  setFees: (fees) => set({ fees }),

  setStatus: (status) => set({ status }),

  setError: (error) => set({ error }),

  setResult: (result) => set({ result }),

  reset: () =>
    set({
      step: 1,
      params: DEFAULT_PARAMS,
      fees: null,
      status: 'idle',
      error: null,
      result: null,
    }),
}));

/**
 * Hook return type
 */
export interface UseGhostLaunchReturn {
  // State
  step: StepId;
  params: Partial<LaunchParams>;
  fees: FeeBreakdown | null;
  status: LaunchStatus;
  error: Error | null;
  result: BundleResult | null;

  // Computed
  validationErrors: ValidationErrors;
  isValidForCurrentStep: boolean;
  isValidForLaunch: boolean;
  canGoNext: boolean;
  canGoPrev: boolean;

  // Loading states
  isBuilding: boolean;
  isSigning: boolean;
  isSending: boolean;
  isConfirming: boolean;
  isLoading: boolean;

  // Actions
  setStep: (step: StepId) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateParams: (partial: Partial<LaunchParams>) => void;
  calculateFees: () => void;
  launch: () => Promise<void>;
  reset: () => void;
}

/**
 * Main hook for Ghost Engine launch flow
 */
export function useGhostLaunch(): UseGhostLaunchReturn {
  const { connection } = useConnection();
  const wallet = useWallet();

  const {
    step,
    params,
    fees,
    status,
    error,
    result,
    setStep,
    nextStep,
    prevStep,
    updateParams,
    setFees,
    setStatus,
    setError,
    setResult,
    reset,
  } = useGhostLaunchStore();

  // Validation
  const validationErrors = useMemo(
    () => validateLaunchParams(params),
    [params]
  );

  // Check if valid for current step
  const isValidForCurrentStep = useMemo(() => {
    switch (step) {
      case 1:
        return !validationErrors.name && !validationErrors.symbol;
      case 2:
        return !validationErrors.liquiditySol && !validationErrors.lockDurationDays;
      case 3:
        return isValidForLaunch(params);
      default:
        return false;
    }
  }, [step, validationErrors, params]);

  // Check if ready to launch
  const canLaunch = useMemo(
    () => isValidForLaunch(params) && wallet.connected,
    [params, wallet.connected]
  );

  // Navigation guards
  const canGoNext = step < 3 && isValidForCurrentStep;
  const canGoPrev = step > 1;

  // Loading states
  const isBuilding = status === 'building';
  const isSigning = status === 'signing';
  const isSending = status === 'sending';
  const isConfirming = status === 'confirming';
  const isLoading = isBuilding || isSigning || isSending || isConfirming;

  // Calculate fees
  const calculateFees = useCallback(() => {
    if (!params.liquiditySol) {
      setFees(null);
      return;
    }

    const bundler = new GhostBundler(connection, wallet as any);
    const calculatedFees = bundler.calculateFees(params as LaunchParams);
    setFees(calculatedFees);
  }, [connection, wallet, params, setFees]);

  // Launch function
  const launch = useCallback(async () => {
    if (!canLaunch) {
      warningPattern();
      playErrorTone();
      setError(new Error('Invalid launch parameters'));
      return;
    }

    try {
      setError(null);
      setStatus('building');

      const bundler = new GhostBundler(connection, wallet as any);

      // Build bundle
      const builtBundle = await bundler.buildBundle(params as LaunchParams);

      setStatus('signing');

      // Deserialize transaction for signing
      const transaction = VersionedTransaction.deserialize(
        builtBundle.serializedTransaction
      );

      // Sign with wallet
      const signedTransaction = await wallet.signTransaction!(transaction);

      setStatus('sending');

      // Send via Jito or standard RPC
      let bundleResult: BundleResult;

      if (params.useJito) {
        bundleResult = await bundler.sendBundle(builtBundle, signedTransaction);
      } else {
        bundleResult = await bundler.sendStandard(signedTransaction);
      }

      setStatus('confirming');

      // Wait for confirmation
      await connection.confirmTransaction(bundleResult.signature, 'confirmed');

      setStatus('success');
      setResult(bundleResult);
    } catch (err) {
      warningPattern();
      playErrorTone();
      setStatus('error');
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [
    canLaunch,
    connection,
    wallet,
    params,
    setError,
    setStatus,
    setResult,
  ]);

  return {
    // State
    step,
    params,
    fees,
    status,
    error,
    result,

    // Computed
    validationErrors,
    isValidForCurrentStep,
    isValidForLaunch: canLaunch,
    canGoNext,
    canGoPrev,

    // Loading states
    isBuilding,
    isSigning,
    isSending,
    isConfirming,
    isLoading,

    // Actions
    setStep,
    nextStep,
    prevStep,
    updateParams,
    calculateFees,
    launch,
    reset,
  };
}
