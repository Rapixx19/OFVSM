/**
 * @file JitoConfig.tsx
 * @summary Jito toggle + tip slider
 */

'use client';

import { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BN } from '@coral-xyz/anchor';
import { lightTap } from '@/core/utils/haptics';
import { DEFAULT_TIP_LAMPORTS, MINIMUM_TIP_LAMPORTS, MAXIMUM_TIP_LAMPORTS } from '@/features/launcher/constants/addresses';
import type { LaunchParams } from '@/features/launcher/types/ghost';

interface JitoConfigProps {
  params: Partial<LaunchParams>;
  onUpdate: (partial: Partial<LaunchParams>) => void;
}

export function JitoConfig({ params, onUpdate }: JitoConfigProps) {
  const tipValue = useMemo(() => {
    if (!params.jitoTipLamports) return DEFAULT_TIP_LAMPORTS / 1e9;
    return params.jitoTipLamports.toNumber() / 1e9;
  }, [params.jitoTipLamports]);

  const handleJitoToggle = useCallback(() => {
    lightTap();
    onUpdate({ useJito: !params.useJito });
  }, [params.useJito, onUpdate]);

  const handleTipChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onUpdate({ jitoTipLamports: new BN(Math.floor(value * 1e9)) });
  }, [onUpdate]);

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-white">Jito Block Engine</h3>
          <p className="text-sm text-gray-400">Priority transaction processing</p>
        </div>
        <button
          onClick={handleJitoToggle}
          className={`relative h-6 w-11 rounded-full transition-colors ${params.useJito ? 'bg-cyan-500' : 'bg-gray-600'}`}
        >
          <motion.span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
            animate={{ left: params.useJito ? 22 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      <AnimatePresence>
        {params.useJito && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4 overflow-hidden">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Tip Amount</span>
              <span className="font-mono text-cyan-400">{tipValue.toFixed(4)} SOL</span>
            </div>
            <input
              type="range"
              min={MINIMUM_TIP_LAMPORTS / 1e9}
              max={MAXIMUM_TIP_LAMPORTS / 1e9}
              step={0.0001}
              value={tipValue}
              onChange={handleTipChange}
              className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-700 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400"
            />
            <p className="mt-2 text-xs text-gray-500">Higher tips = faster inclusion during high network load</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
