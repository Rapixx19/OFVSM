/**
 * @file LiquiditySlider.tsx
 * @summary Liquidity amount slider with visual feedback
 */

'use client';

import { motion } from 'framer-motion';
import { MIN_LIQUIDITY_SOL, MAX_LIQUIDITY_SOL } from '@/features/launcher/constants/addresses';

interface LiquiditySliderProps {
  value: number;
  sliderPercent: number;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Liquidity slider component
 */
export function LiquiditySlider({ value, sliderPercent, error, onChange }: LiquiditySliderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">Initial Liquidity</label>
        <span className="font-mono text-lg font-semibold text-cyan-400">{value.toFixed(1)} SOL</span>
      </div>

      {/* Custom slider */}
      <div className="relative">
        <div className="absolute inset-0 h-2 rounded-full bg-gray-700" />
        <motion.div
          className="absolute left-0 top-0 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
          style={{ width: `${sliderPercent}%` }}
          initial={false}
          animate={{ width: `${sliderPercent}%` }}
        />
        <input
          type="range"
          min={MIN_LIQUIDITY_SOL}
          max={MAX_LIQUIDITY_SOL}
          step={0.1}
          value={value}
          onChange={onChange}
          className="relative z-10 h-2 w-full cursor-pointer appearance-none bg-transparent
            [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:shadow-cyan-400/30"
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>{MIN_LIQUIDITY_SOL} SOL</span>
        <span>{MAX_LIQUIDITY_SOL} SOL</span>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
