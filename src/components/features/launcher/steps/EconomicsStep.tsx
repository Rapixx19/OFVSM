/**
 * @file EconomicsStep.tsx
 * @summary Step 2: Token economics - Liquidity slider, lock duration
 */

'use client';

import { motion } from 'framer-motion';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { BN } from '@coral-xyz/anchor';
import type { LaunchParams, ValidationErrors } from '@/features/launcher/types/ghost';
import { MIN_LIQUIDITY_SOL, MAX_LIQUIDITY_SOL } from '@/features/launcher/constants/addresses';
import { lightTap } from '@/core/utils/haptics';
import { calculateTrustScore } from '@/features/locker/services/trustScoreCalculator';
import { SentinelScoreboard } from '@/components/features/locker';
import type { TrustScore } from '@/features/locker/types/trustScore';
import { LiquiditySlider } from './LiquiditySlider';
import { LockDurationSelector } from './LockDurationSelector';
import { PoolPreview } from './PoolPreview';

interface EconomicsStepProps {
  params: Partial<LaunchParams>;
  errors: ValidationErrors;
  onUpdate: (partial: Partial<LaunchParams>) => void;
  onNext: () => void;
  onPrev: () => void;
  canNext: boolean;
}

/**
 * Step 2: Token Economics
 */
export function EconomicsStep({ params, errors, onUpdate, onNext, onPrev, canNext }: EconomicsStepProps) {
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);

  const liquidityValue = useMemo(() => {
    if (!params.liquiditySol) return MIN_LIQUIDITY_SOL;
    return params.liquiditySol.toNumber() / 1e9;
  }, [params.liquiditySol]);

  useEffect(() => {
    const score = calculateTrustScore({
      name: params.name || '',
      symbol: params.symbol || '',
      imageUri: params.imageUri || '',
      liquiditySol: liquidityValue,
      lockDurationDays: params.lockDurationDays || 90,
      isPermanentLock: params.isPermanentLock || false,
      revokeMint: true,
      revokeFreeze: true,
    });
    setTrustScore(score);
  }, [params.name, params.symbol, params.imageUri, liquidityValue, params.lockDurationDays, params.isPermanentLock]);

  const handleLiquidityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onUpdate({ liquiditySol: new BN(Math.floor(value * 1e9)) });
  }, [onUpdate]);

  const handleLockDurationChange = useCallback((value: number) => {
    lightTap();
    if (value === -1) {
      onUpdate({ lockDurationDays: 90, isPermanentLock: true });
    } else {
      onUpdate({ lockDurationDays: value, isPermanentLock: false });
    }
  }, [onUpdate]);

  const sliderPercent = useMemo(() => ((liquidityValue - MIN_LIQUIDITY_SOL) / (MAX_LIQUIDITY_SOL - MIN_LIQUIDITY_SOL)) * 100, [liquidityValue]);
  const currentLockOption = useMemo(() => (params.isPermanentLock ? -1 : params.lockDurationDays || 90), [params.lockDurationDays, params.isPermanentLock]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">Token Economics</h2>
        <p className="mt-1 text-sm text-gray-400">Configure liquidity and lock settings</p>
      </div>

      <LiquiditySlider value={liquidityValue} sliderPercent={sliderPercent} error={errors.liquiditySol} onChange={handleLiquidityChange} />
      <PoolPreview symbol={params.symbol} liquidityValue={liquidityValue} />
      <LockDurationSelector currentOption={currentLockOption} error={errors.lockDurationDays} onChange={handleLockDurationChange} />

      {/* Safe Launch Badge */}
      <div className="flex items-center gap-3 rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-4">
        <svg className="h-6 w-6 flex-shrink-0 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <div>
          <p className="font-medium text-cyan-400">Safe Launch Guaranteed</p>
          <p className="text-sm text-gray-400">Mint & freeze authorities are revoked atomically</p>
        </div>
      </div>

      {trustScore && <SentinelScoreboard score={trustScore} />}

      <div className="flex gap-3">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onPrev} className="flex-1 rounded-lg border border-gray-600 py-4 font-semibold text-gray-300 transition-colors hover:border-gray-500 hover:text-white">
          Back
        </motion.button>
        <motion.button
          whileHover={{ scale: canNext ? 1.02 : 1 }}
          whileTap={{ scale: canNext ? 0.98 : 1 }}
          onClick={onNext}
          disabled={!canNext}
          className={`flex-1 rounded-lg py-4 font-semibold transition-all ${canNext ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'cursor-not-allowed bg-gray-700 text-gray-400'}`}
        >
          Review Launch
        </motion.button>
      </div>
    </motion.div>
  );
}
