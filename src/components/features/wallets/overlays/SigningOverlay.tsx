/**
 * @file SigningOverlay.tsx
 * @summary Signing request overlay
 * @dependencies framer-motion
 */

'use client';

import { motion } from 'framer-motion';

export function SigningOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center py-8"
    >
      <motion.div
        className="mb-6 h-16 w-16 rounded-full bg-cyan-500/20"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <div className="flex h-full items-center justify-center">
          <svg className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </div>
      </motion.div>

      <h3 className="mb-2 text-lg font-medium text-white">Sign to Verify</h3>
      <p className="text-center text-sm text-gray-400">
        Please sign the verification message in your wallet
      </p>
    </motion.div>
  );
}
