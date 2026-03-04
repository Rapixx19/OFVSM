/**
 * @file useLaunchState.ts
 * @summary Zustand store for Ghost Engine launch state management
 */

import { create } from 'zustand';
import { BN } from '@coral-xyz/anchor';
import type { LaunchParams, BundleResult, FeeBreakdown, StepId, LaunchStatus } from '../types/ghost';
import { DEFAULT_DECIMALS, DEFAULT_TOTAL_SUPPLY, DEFAULT_TIP_LAMPORTS } from '../constants/addresses';

/**
 * Default launch parameters
 */
export const DEFAULT_PARAMS: Partial<LaunchParams> = {
  decimals: DEFAULT_DECIMALS,
  totalSupply: new BN(DEFAULT_TOTAL_SUPPLY).mul(new BN(10).pow(new BN(DEFAULT_DECIMALS))),
  lockDurationDays: 90,
  isPermanentLock: false,
  useJito: true,
  jitoTipLamports: new BN(DEFAULT_TIP_LAMPORTS),
};

/**
 * Launch state store interface
 */
export interface GhostLaunchStore {
  step: StepId;
  params: Partial<LaunchParams>;
  fees: FeeBreakdown | null;
  status: LaunchStatus;
  error: Error | null;
  result: BundleResult | null;
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
  nextStep: () => set((state) => ({ step: Math.min(3, state.step + 1) as StepId })),
  prevStep: () => set((state) => ({ step: Math.max(1, state.step - 1) as StepId })),
  updateParams: (partial) => set((state) => ({ params: { ...state.params, ...partial } })),
  setFees: (fees) => set({ fees }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setResult: (result) => set({ result }),
  reset: () => set({ step: 1, params: DEFAULT_PARAMS, fees: null, status: 'idle', error: null, result: null }),
}));
