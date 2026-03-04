/**
 * @file SwitchingOverlay.tsx
 * @summary Switching network animation overlay
 * @dependencies framer-motion
 */

'use client';

import { motion } from 'framer-motion';
import { truncateAddress } from '@/core/utils/crypto';

interface SwitchingOverlayProps {
  targetAddress: string;
}

export function SwitchingOverlay({ targetAddress }: SwitchingOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center py-8"
    >
      <div className="relative mb-6">
        <motion.div
          className="h-16 w-16 rounded-full border-2 border-cyan-400/30"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-cyan-400"
          animate={{ scale: [1, 1.1, 1], rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        </div>
      </div>

      <h3 className="mb-2 text-lg font-medium text-white">Switching Network</h3>
      <p className="mb-4 text-center text-sm text-gray-400">
        Please switch to your alt wallet in your extension
      </p>
      <div className="rounded-lg bg-gray-800 px-4 py-2">
        <span className="font-mono text-sm text-cyan-400">{truncateAddress(targetAddress)}</span>
      </div>
    </motion.div>
  );
}
