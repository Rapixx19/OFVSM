/**
 * @file ResultOverlays.tsx
 * @summary Success and Error overlays for verification flow
 * @dependencies framer-motion
 */

'use client';

import { motion } from 'framer-motion';

/**
 * Success overlay
 */
export function SuccessOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center py-8"
    >
      <motion.div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <motion.svg
          className="h-8 w-8 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </motion.svg>
      </motion.div>

      <h3 className="mb-2 text-lg font-medium text-white">Wallet Verified!</h3>
      <p className="text-center text-sm text-gray-400">
        Your wallet has been successfully linked
      </p>
    </motion.div>
  );
}

interface ErrorOverlayProps {
  error?: string | null;
  onRetry: () => void;
}

/**
 * Error overlay
 */
export function ErrorOverlay({ error, onRetry }: ErrorOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="py-8 text-center"
    >
      <div className="mb-4 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
          <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      </div>
      <h3 className="mb-2 text-lg font-medium text-white">Verification Failed</h3>
      <p className="mb-4 text-sm text-gray-400">{error || 'Please try again'}</p>
      <button onClick={onRetry} className="text-cyan-400 hover:text-cyan-300">
        Try Again
      </button>
    </motion.div>
  );
}
