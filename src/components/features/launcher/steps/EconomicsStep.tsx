/**
 * @file EconomicsStep.tsx
 * @summary Step 2: Token economics - Liquidity slider, lock duration
 * @dependencies framer-motion, react, @coral-xyz/anchor
 */

'use client';

import { motion } from 'framer-motion';
import { useCallback, useMemo } from 'react';
import { BN } from '@coral-xyz/anchor';
import type { LaunchParams, ValidationErrors } from '@/features/launcher/types/ghost';
import {
  MIN_LIQUIDITY_SOL,
  MAX_LIQUIDITY_SOL,
  LOCK_DURATION_OPTIONS,
} from '@/features/launcher/constants/addresses';

/**
 * Props for EconomicsStep
 */
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
 * Configures liquidity amount and lock duration
 */
export function EconomicsStep({
  params,
  errors,
  onUpdate,
  onNext,
  onPrev,
  canNext,
}: EconomicsStepProps) {
  // Convert liquiditySol BN to number for slider
  const liquidityValue = useMemo(() => {
    if (!params.liquiditySol) return MIN_LIQUIDITY_SOL;
    return params.liquiditySol.toNumber() / 1e9;
  }, [params.liquiditySol]);

  const handleLiquidityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      onUpdate({ liquiditySol: new BN(Math.floor(value * 1e9)) });
    },
    [onUpdate]
  );

  const handleLockDurationChange = useCallback(
    (value: number) => {
      if (value === -1) {
        onUpdate({ lockDurationDays: 90, isPermanentLock: true });
      } else {
        onUpdate({ lockDurationDays: value, isPermanentLock: false });
      }
    },
    [onUpdate]
  );

  // Calculate visual percentage for slider fill
  const sliderPercent = useMemo(() => {
    return (
      ((liquidityValue - MIN_LIQUIDITY_SOL) /
        (MAX_LIQUIDITY_SOL - MIN_LIQUIDITY_SOL)) *
      100
    );
  }, [liquidityValue]);

  // Current lock duration option
  const currentLockOption = useMemo(() => {
    if (params.isPermanentLock) return -1;
    return params.lockDurationDays || 90;
  }, [params.lockDurationDays, params.isPermanentLock]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">Token Economics</h2>
        <p className="mt-1 text-sm text-gray-400">
          Configure liquidity and lock settings
        </p>
      </div>

      {/* Liquidity Slider */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">
            Initial Liquidity
          </label>
          <span className="font-mono text-lg font-semibold text-cyan-400">
            {liquidityValue.toFixed(1)} SOL
          </span>
        </div>

        {/* Custom slider */}
        <div className="relative">
          {/* Track background */}
          <div className="absolute inset-0 h-2 rounded-full bg-gray-700" />

          {/* Track fill */}
          <motion.div
            className="absolute left-0 top-0 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
            style={{ width: `${sliderPercent}%` }}
            initial={false}
            animate={{ width: `${sliderPercent}%` }}
          />

          {/* Input */}
          <input
            type="range"
            min={MIN_LIQUIDITY_SOL}
            max={MAX_LIQUIDITY_SOL}
            step={0.1}
            value={liquidityValue}
            onChange={handleLiquidityChange}
            className="
              relative z-10 h-2 w-full cursor-pointer appearance-none bg-transparent
              [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:shadow-cyan-400/30
            "
          />
        </div>

        {/* Range labels */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>{MIN_LIQUIDITY_SOL} SOL</span>
          <span>{MAX_LIQUIDITY_SOL} SOL</span>
        </div>

        {errors.liquiditySol && (
          <p className="text-sm text-red-400">{errors.liquiditySol}</p>
        )}
      </div>

      {/* Pool Preview */}
      <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-400">Pool Preview</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <span className="text-sm font-bold text-white">
                {params.symbol?.slice(0, 2) || '??'}
              </span>
            </div>
            <div>
              <p className="font-medium text-white">
                {params.symbol || 'TOKEN'}/SOL
              </p>
              <p className="text-xs text-gray-400">Raydium CPMM</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-white">{liquidityValue.toFixed(1)} SOL</p>
            <p className="text-xs text-gray-400">Initial liquidity</p>
          </div>
        </div>
      </div>

      {/* Lock Duration */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          LP Lock Duration
        </label>
        <div className="grid grid-cols-2 gap-3">
          {LOCK_DURATION_OPTIONS.map((option) => (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleLockDurationChange(option.value)}
              className={`
                rounded-lg border p-3 text-left transition-all
                ${
                  currentLockOption === option.value
                    ? 'border-cyan-400 bg-cyan-400/10'
                    : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                }
              `}
            >
              <p
                className={`font-medium ${
                  currentLockOption === option.value
                    ? 'text-cyan-400'
                    : 'text-white'
                }`}
              >
                {option.label}
              </p>
              {option.value === -1 && (
                <p className="mt-0.5 text-xs text-gray-400">
                  Maximum trust signal
                </p>
              )}
            </motion.button>
          ))}
        </div>
        {errors.lockDurationDays && (
          <p className="text-sm text-red-400">{errors.lockDurationDays}</p>
        )}
      </div>

      {/* Safe Launch Badge */}
      <div className="flex items-center gap-3 rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-4">
        <svg
          className="h-6 w-6 flex-shrink-0 text-cyan-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <div>
          <p className="font-medium text-cyan-400">Safe Launch Guaranteed</p>
          <p className="text-sm text-gray-400">
            Mint & freeze authorities are revoked atomically
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPrev}
          className="
            flex-1 rounded-lg border border-gray-600 py-4 font-semibold
            text-gray-300 transition-colors hover:border-gray-500 hover:text-white
          "
        >
          Back
        </motion.button>
        <motion.button
          whileHover={{ scale: canNext ? 1.02 : 1 }}
          whileTap={{ scale: canNext ? 0.98 : 1 }}
          onClick={onNext}
          disabled={!canNext}
          className={`
            flex-1 rounded-lg py-4 font-semibold transition-all
            ${
              canNext
                ? 'bg-cyan-500 text-black hover:bg-cyan-400'
                : 'cursor-not-allowed bg-gray-700 text-gray-400'
            }
          `}
        >
          Review Launch
        </motion.button>
      </div>
    </motion.div>
  );
}
