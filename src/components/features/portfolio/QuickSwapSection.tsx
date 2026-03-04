/**
 * @file QuickSwapSection.tsx
 * @summary Collapsible quick swap section for portfolio
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuickSwap } from '@/components/features/trading/QuickSwap';
import { lightTap } from '@/core/utils/haptics';
import type { UserWallet } from '@/features/wallets/types/wallet';

interface QuickSwapSectionProps {
  wallets: UserWallet[];
  activeWalletId: string | null;
  onWalletChange: (id: string) => void;
}

/**
 * Collapsible quick swap section
 */
export function QuickSwapSection({ wallets, activeWalletId, onWalletChange }: QuickSwapSectionProps) {
  const [showSwap, setShowSwap] = useState(false);

  return (
    <section className="mb-6">
      <button
        onClick={() => { setShowSwap(!showSwap); lightTap(); }}
        className="mb-3 flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span className="font-medium text-white">Quick Swap</span>
        </div>
        <motion.svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" animate={{ rotate: showSwap ? 180 : 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {showSwap && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <QuickSwap wallets={wallets} activeWalletId={activeWalletId} onWalletChange={onWalletChange} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
