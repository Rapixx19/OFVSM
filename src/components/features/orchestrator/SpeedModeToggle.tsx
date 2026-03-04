/**
 * @file SpeedModeToggle.tsx
 * @summary Header toggle for enabling/disabling Speed Mode
 * @dependencies framer-motion, react
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useSpeedMode } from '@/features/orchestrator/hooks/useSpeedMode';
import { SpeedGauge } from './SpeedGauge';
import { DEFAULT_SOL_CAP_LAMPORTS } from '@/features/orchestrator/types/speedMode';

/**
 * Speed Mode Toggle Component
 */
export function SpeedModeToggle() {
  const {
    isEnabled,
    isLoading,
    remainingCapSol,
    expiresIn,
    enableSpeedMode,
    disableSpeedMode,
  } = useSpeedMode();

  const totalCapSol = DEFAULT_SOL_CAP_LAMPORTS / 1e9;

  const handleToggle = async () => {
    if (isEnabled) {
      await disableSpeedMode();
    } else {
      await enableSpeedMode();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <AnimatePresence mode="wait">
        {isEnabled ? (
          <motion.div
            key="gauge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <SpeedGauge
              remainingCapSol={remainingCapSol}
              totalCapSol={totalCapSol}
              expiresIn={expiresIn}
              onClick={handleToggle}
            />
          </motion.div>
        ) : (
          <motion.button
            key="toggle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggle}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-full border
              border-gray-700 bg-gray-900/80 px-3 py-1.5
              text-gray-400 transition-colors hover:border-cyan-400/50
              hover:text-cyan-400 disabled:cursor-not-allowed
              disabled:opacity-50"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="h-4 w-4 rounded-full border-2
                  border-gray-600 border-t-cyan-400"
              />
            ) : (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            <span className="text-xs font-medium">Speed Mode</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
