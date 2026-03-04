/**
 * @file LaunchActions.tsx
 * @summary Back button + Launch button
 */

'use client';

import { motion } from 'framer-motion';

interface LaunchActionsProps {
  canLaunch: boolean;
  isLoading: boolean;
  onLaunch: () => void;
  onPrev: () => void;
}

export function LaunchActions({ canLaunch, isLoading, onLaunch, onPrev }: LaunchActionsProps) {
  return (
    <div className="flex gap-3">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onPrev}
        disabled={isLoading}
        className="flex-1 rounded-lg border border-gray-600 py-4 font-semibold text-gray-300 transition-colors hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Back
      </motion.button>
      <motion.button
        whileHover={{ scale: canLaunch && !isLoading ? 1.02 : 1 }}
        whileTap={{ scale: canLaunch && !isLoading ? 0.98 : 1 }}
        onClick={onLaunch}
        disabled={!canLaunch || isLoading}
        className={`flex-1 rounded-lg py-4 font-semibold transition-all ${
          canLaunch && !isLoading
            ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black hover:from-cyan-400 hover:to-cyan-300'
            : 'cursor-not-allowed bg-gray-700 text-gray-400'
        }`}
      >
        {isLoading ? 'Launching...' : 'Launch Token'}
      </motion.button>
    </div>
  );
}
