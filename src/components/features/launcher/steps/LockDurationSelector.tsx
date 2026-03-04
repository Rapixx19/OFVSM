/**
 * @file LockDurationSelector.tsx
 * @summary Lock duration selection grid
 */

'use client';

import { motion } from 'framer-motion';
import { LOCK_DURATION_OPTIONS } from '@/features/launcher/constants/addresses';

interface LockDurationSelectorProps {
  currentOption: number;
  error?: string;
  onChange: (value: number) => void;
}

/**
 * Lock duration selector grid
 */
export function LockDurationSelector({ currentOption, error, onChange }: LockDurationSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">LP Lock Duration</label>
      <div className="grid grid-cols-2 gap-3">
        {LOCK_DURATION_OPTIONS.map((option) => (
          <motion.button
            key={option.value}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(option.value)}
            className={`rounded-lg border p-3 text-left transition-all ${
              currentOption === option.value
                ? 'border-cyan-400 bg-cyan-400/10'
                : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
            }`}
          >
            <p className={`font-medium ${currentOption === option.value ? 'text-cyan-400' : 'text-white'}`}>
              {option.label}
            </p>
            {option.value === -1 && <p className="mt-0.5 text-xs text-gray-400">Maximum trust signal</p>}
          </motion.button>
        ))}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
