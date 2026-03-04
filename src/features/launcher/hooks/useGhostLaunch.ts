/**
 * @file useGhostLaunch.ts
 * @summary React hook for managing Ghost Engine launch orchestration
 */

'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useMemo } from 'react';
import { VersionedTransaction } from '@solana/web3.js';
import type { LaunchParams, BundleResult, FeeBreakdown, StepId, ValidationErrors, LaunchStatus } from '../types/ghost';
import { validateLaunchParams, isValidForLaunch } from '../types/ghost';
import { GhostBundler } from '../services/GhostBundler';
import { warningPattern } from '@/core/utils/haptics';
import { playErrorTone } from '@/core/utils/audio';
import { useGhostLaunchStore } from './useLaunchState';

export { useGhostLaunchStore } from './useLaunchState';

export interface UseGhostLaunchReturn {
  step: StepId;
  params: Partial<LaunchParams>;
  fees: FeeBreakdown | null;
  status: LaunchStatus;
  error: Error | null;
  result: BundleResult | null;
  validationErrors: ValidationErrors;
  isValidForCurrentStep: boolean;
  isValidForLaunch: boolean;
  canGoNext: boolean;
  canGoPrev: boolean;
  isBuilding: boolean;
  isSigning: boolean;
  isSending: boolean;
  isConfirming: boolean;
  isLoading: boolean;
  setStep: (step: StepId) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateParams: (partial: Partial<LaunchParams>) => void;
  calculateFees: () => void;
  launch: () => Promise<void>;
  reset: () => void;
}

export function useGhostLaunch(): UseGhostLaunchReturn {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { step, params, fees, status, error, result, setStep, nextStep, prevStep, updateParams, setFees, setStatus, setError, setResult, reset } = useGhostLaunchStore();

  const validationErrors = useMemo(() => validateLaunchParams(params), [params]);

  const isValidForCurrentStep = useMemo(() => {
    switch (step) {
      case 1: return !validationErrors.name && !validationErrors.symbol;
      case 2: return !validationErrors.liquiditySol && !validationErrors.lockDurationDays;
      case 3: return isValidForLaunch(params);
      default: return false;
    }
  }, [step, validationErrors, params]);

  const canLaunch = useMemo(() => isValidForLaunch(params) && wallet.connected, [params, wallet.connected]);
  const canGoNext = step < 3 && isValidForCurrentStep;
  const canGoPrev = step > 1;

  const isBuilding = status === 'building';
  const isSigning = status === 'signing';
  const isSending = status === 'sending';
  const isConfirming = status === 'confirming';
  const isLoading = isBuilding || isSigning || isSending || isConfirming;

  const calculateFees = useCallback(() => {
    if (!params.liquiditySol) { setFees(null); return; }
    const bundler = new GhostBundler(connection, wallet as any);
    setFees(bundler.calculateFees(params as LaunchParams));
  }, [connection, wallet, params, setFees]);

  const launch = useCallback(async () => {
    if (!canLaunch) { warningPattern(); playErrorTone(); setError(new Error('Invalid launch parameters')); return; }

    try {
      setError(null);
      setStatus('building');
      const bundler = new GhostBundler(connection, wallet as any);
      const builtBundle = await bundler.buildBundle(params as LaunchParams);

      setStatus('signing');
      const transaction = VersionedTransaction.deserialize(builtBundle.serializedTransaction);
      const signedTransaction = await wallet.signTransaction!(transaction);

      setStatus('sending');
      let bundleResult: BundleResult;
      if (params.useJito) {
        bundleResult = await bundler.sendBundle(builtBundle, signedTransaction);
      } else {
        bundleResult = await bundler.sendStandard(signedTransaction);
      }

      setStatus('confirming');
      await connection.confirmTransaction(bundleResult.signature, 'confirmed');
      setStatus('success');
      setResult(bundleResult);
    } catch (err) {
      warningPattern();
      playErrorTone();
      setStatus('error');
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [canLaunch, connection, wallet, params, setError, setStatus, setResult]);

  return {
    step, params, fees, status, error, result, validationErrors, isValidForCurrentStep,
    isValidForLaunch: canLaunch, canGoNext, canGoPrev, isBuilding, isSigning, isSending, isConfirming, isLoading,
    setStep, nextStep, prevStep, updateParams, calculateFees, launch, reset,
  };
}
