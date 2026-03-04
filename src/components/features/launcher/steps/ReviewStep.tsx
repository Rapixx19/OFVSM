/**
 * @file ReviewStep.tsx
 * @summary Step 3: Launch review - Fee breakdown, Jito toggle, launch button
 * @dependencies framer-motion, react, @coral-xyz/anchor
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useMemo } from 'react';
import { BN } from '@coral-xyz/anchor';
import type {
  LaunchParams,
  FeeBreakdown,
  LaunchStatus,
  BundleResult,
} from '@/features/launcher/types/ghost';
import {
  DEFAULT_TIP_LAMPORTS,
  MINIMUM_TIP_LAMPORTS,
  MAXIMUM_TIP_LAMPORTS,
} from '@/features/launcher/constants/addresses';

/**
 * Props for ReviewStep
 */
interface ReviewStepProps {
  params: Partial<LaunchParams>;
  fees: FeeBreakdown | null;
  status: LaunchStatus;
  error: Error | null;
  result: BundleResult | null;
  onUpdate: (partial: Partial<LaunchParams>) => void;
  onCalculateFees: () => void;
  onLaunch: () => void;
  onPrev: () => void;
  onReset: () => void;
  canLaunch: boolean;
  isLoading: boolean;
}

/**
 * Status message configuration
 */
const STATUS_MESSAGES: Record<LaunchStatus, string> = {
  idle: '',
  building: 'Building atomic bundle...',
  signing: 'Waiting for signature...',
  sending: 'Submitting to Jito Block Engine...',
  confirming: 'Confirming transaction...',
  success: 'Token launched successfully!',
  error: 'Launch failed',
};

/**
 * Step 3: Launch Review
 * Final review with fee breakdown and launch button
 */
export function ReviewStep({
  params,
  fees,
  status,
  error,
  result,
  onUpdate,
  onCalculateFees,
  onLaunch,
  onPrev,
  onReset,
  canLaunch,
  isLoading,
}: ReviewStepProps) {
  // Calculate fees on mount and when params change
  useEffect(() => {
    onCalculateFees();
  }, [params.liquiditySol, params.useJito, params.jitoTipLamports, onCalculateFees]);

  // Convert tip to number for slider
  const tipValue = useMemo(() => {
    if (!params.jitoTipLamports) return DEFAULT_TIP_LAMPORTS / 1e9;
    return params.jitoTipLamports.toNumber() / 1e9;
  }, [params.jitoTipLamports]);

  const handleJitoToggle = useCallback(() => {
    onUpdate({ useJito: !params.useJito });
  }, [params.useJito, onUpdate]);

  const handleTipChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      onUpdate({ jitoTipLamports: new BN(Math.floor(value * 1e9)) });
    },
    [onUpdate]
  );

  // Success state
  if (status === 'success' && result) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6 text-center"
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500"
        >
          <svg
            className="h-10 w-10 text-black"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </motion.div>

        <div>
          <h2 className="text-2xl font-bold text-white">Launch Successful!</h2>
          <p className="mt-2 text-gray-400">
            Your token is now live on Solana
          </p>
        </div>

        {/* Token info */}
        <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
          <div className="space-y-3 text-left">
            <div className="flex justify-between">
              <span className="text-gray-400">Token</span>
              <span className="font-medium text-white">
                {params.name} ({params.symbol})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Mint Address</span>
              <a
                href={`https://solscan.io/token/${result.mintAddress.toBase58()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-cyan-400 hover:underline"
              >
                {result.mintAddress.toBase58().slice(0, 8)}...
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Transaction</span>
              <a
                href={`https://solscan.io/tx/${result.signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-cyan-400 hover:underline"
              >
                {result.signature.slice(0, 8)}...
              </a>
            </div>
            {result.bundleId && (
              <div className="flex justify-between">
                <span className="text-gray-400">Jito Bundle</span>
                <span className="font-mono text-sm text-gray-300">
                  {result.bundleId.slice(0, 8)}...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onReset}
            className="
              flex-1 rounded-lg border border-gray-600 py-4 font-semibold
              text-gray-300 transition-colors hover:border-gray-500 hover:text-white
            "
          >
            Launch Another
          </motion.button>
          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            href={`https://raydium.io/swap/?inputMint=sol&outputMint=${result.mintAddress.toBase58()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="
              flex flex-1 items-center justify-center rounded-lg bg-cyan-500 py-4
              font-semibold text-black transition-colors hover:bg-cyan-400
            "
          >
            Trade on Raydium
          </motion.a>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white">Review & Launch</h2>
        <p className="mt-1 text-sm text-gray-400">
          Verify details before deploying
        </p>
      </div>

      {/* Token Summary */}
      <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
        <div className="flex items-center gap-4">
          {params.imageUri ? (
            <img
              src={params.imageUri}
              alt={params.name}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <span className="text-lg font-bold text-white">
                {params.symbol?.slice(0, 2)}
              </span>
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-white">{params.name}</h3>
            <p className="font-mono text-cyan-400">${params.symbol}</p>
          </div>
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
        <h3 className="mb-4 font-medium text-white">Cost Breakdown</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Liquidity</span>
            <span className="font-mono text-white">
              {fees?.liquiditySol.toFixed(4) || '—'} SOL
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Platform Fee (1%)</span>
            <span className="font-mono text-white">
              {fees?.platformFeeSol.toFixed(4) || '—'} SOL
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Account Rent</span>
            <span className="font-mono text-white">
              {fees?.rentSol.toFixed(4) || '—'} SOL
            </span>
          </div>
          {params.useJito && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Jito Tip</span>
              <span className="font-mono text-white">
                {fees?.jitoTipSol.toFixed(4) || '—'} SOL
              </span>
            </div>
          )}
          <div className="border-t border-gray-700 pt-3">
            <div className="flex justify-between">
              <span className="font-medium text-white">Total</span>
              <span className="font-mono text-lg font-semibold text-cyan-400">
                {fees?.totalSol.toFixed(4) || '—'} SOL
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Jito Toggle */}
      <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-white">Jito Block Engine</h3>
            <p className="text-sm text-gray-400">
              Priority transaction processing
            </p>
          </div>
          <button
            onClick={handleJitoToggle}
            className={`
              relative h-6 w-11 rounded-full transition-colors
              ${params.useJito ? 'bg-cyan-500' : 'bg-gray-600'}
            `}
          >
            <motion.span
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
              animate={{ left: params.useJito ? 22 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        {/* Tip slider */}
        <AnimatePresence>
          {params.useJito && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Tip Amount</span>
                <span className="font-mono text-cyan-400">
                  {tipValue.toFixed(4)} SOL
                </span>
              </div>
              <input
                type="range"
                min={MINIMUM_TIP_LAMPORTS / 1e9}
                max={MAXIMUM_TIP_LAMPORTS / 1e9}
                step={0.0001}
                value={tipValue}
                onChange={handleTipChange}
                className="
                  mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-700
                  [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-cyan-400
                "
              />
              <p className="mt-2 text-xs text-gray-500">
                Higher tips = faster inclusion during high network load
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-red-500/50 bg-red-500/10 p-4"
          >
            <p className="text-sm text-red-400">{error.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launch status */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-3 py-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="h-5 w-5 rounded-full border-2 border-cyan-400 border-t-transparent"
            />
            <span className="text-sm text-gray-400">
              {STATUS_MESSAGES[status]}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPrev}
          disabled={isLoading}
          className="
            flex-1 rounded-lg border border-gray-600 py-4 font-semibold
            text-gray-300 transition-colors hover:border-gray-500 hover:text-white
            disabled:cursor-not-allowed disabled:opacity-50
          "
        >
          Back
        </motion.button>
        <motion.button
          whileHover={{ scale: canLaunch && !isLoading ? 1.02 : 1 }}
          whileTap={{ scale: canLaunch && !isLoading ? 0.98 : 1 }}
          onClick={onLaunch}
          disabled={!canLaunch || isLoading}
          className={`
            flex-1 rounded-lg py-4 font-semibold transition-all
            ${
              canLaunch && !isLoading
                ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black hover:from-cyan-400 hover:to-cyan-300'
                : 'cursor-not-allowed bg-gray-700 text-gray-400'
            }
          `}
        >
          {isLoading ? 'Launching...' : 'Launch Token'}
        </motion.button>
      </div>
    </motion.div>
  );
}
