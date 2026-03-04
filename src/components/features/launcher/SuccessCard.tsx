/**
 * @file SuccessCard.tsx
 * @summary High-fidelity success card displayed after Ghost Launch
 * @dependencies react, framer-motion, @/core/utils
 */

'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { successPulse } from '@/core/utils/haptics';
import { playSuccessChime } from '@/core/utils/audio';
import { ShareButton } from './ShareButton';
import { DownloadButton } from './DownloadButton';

interface SuccessCardProps {
  ticker: string;
  mintAddress: string;
  signature: string;
  timestamp: Date;
  lockDays: number;
  onClose: () => void;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Truncate address for display
 */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Success Card Component
 */
export function SuccessCard({
  ticker,
  mintAddress,
  signature,
  timestamp,
  lockDays,
  onClose,
}: SuccessCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Play haptic and audio feedback on mount
  useEffect(() => {
    successPulse();
    playSuccessChime();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center
        bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md"
      >
        {/* Capturable Card Area */}
        <div
          ref={cardRef}
          className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-900
            to-cyan-950 p-6 shadow-2xl shadow-cyan-500/10"
        >
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full
              bg-green-500/20 px-3 py-1 text-sm font-medium text-green-400">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              Launch Successful
            </div>
            <h2 className="text-3xl font-bold text-white">${ticker}</h2>
          </div>

          {/* Safe Standard Badge */}
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-xl
              border border-cyan-500/30 bg-cyan-500/10 px-4 py-2">
              <span className="text-xl">🛡️</span>
              <span className="font-medium text-cyan-400">Safe-Standard</span>
            </div>
          </div>

          {/* Details */}
          <div className="mb-6 space-y-3 rounded-xl bg-black/30 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Mint Address</span>
              <span className="font-mono text-gray-300">
                {truncateAddress(mintAddress)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">LP Lock Period</span>
              <span className="font-medium text-cyan-400">{lockDays} Days</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Proof of Launch</span>
              <span className="font-mono text-gray-400">
                {formatTimestamp(timestamp)}
              </span>
            </div>
          </div>

          {/* VECTERAI Branding */}
          <div className="text-center text-xs text-gray-600">
            Launched on VECTERAI Foundation
          </div>
        </div>

        {/* Action Buttons (outside capturable area) */}
        <div className="mt-4 flex gap-3">
          <ShareButton ticker={ticker} signature={signature} lockDays={lockDays} />
          <DownloadButton cardRef={cardRef} ticker={ticker} />
        </div>
      </motion.div>
    </motion.div>
  );
}
