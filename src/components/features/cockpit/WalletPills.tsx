/**
 * @file WalletPills.tsx
 * @summary Horizontal scrollable wallet view toggle pills
 * @dependencies framer-motion, react
 */

'use client';

import { motion } from 'framer-motion';

/**
 * Wallet view options
 */
export type WalletView = 'main' | 'all';

/**
 * Props for WalletPills component
 */
interface WalletPillsProps {
  /** Currently selected view */
  selected: WalletView;
  /** Callback when view changes */
  onSelect: (view: WalletView) => void;
  /** Number of additional wallets (shown on "All" pill) */
  walletCount?: number;
}

/**
 * Pill configuration
 */
const pills: { id: WalletView; label: string }[] = [
  { id: 'main', label: 'Main' },
  { id: 'all', label: 'All' },
];

/**
 * Horizontal scrollable wallet view toggle
 * Allows switching between "Main" wallet and "All" wallets view
 */
export function WalletPills({
  selected,
  onSelect,
  walletCount = 0,
}: WalletPillsProps) {
  return (
    <div className="relative">
      {/* Scrollable container */}
      <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
        {pills.map((pill) => {
          const isSelected = selected === pill.id;

          return (
            <button
              key={pill.id}
              onClick={() => onSelect(pill.id)}
              className={`
                relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2
                text-sm font-medium transition-colors
                ${
                  isSelected
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }
              `}
            >
              {/* Animated background indicator */}
              {isSelected && (
                <motion.div
                  layoutId="wallet-pill-bg"
                  className="absolute inset-0 rounded-full bg-white/10"
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}

              {/* Label */}
              <span className="relative z-10">{pill.label}</span>

              {/* Wallet count badge for "All" */}
              {pill.id === 'all' && walletCount > 1 && (
                <span
                  className={`
                    relative z-10 flex h-5 min-w-5 items-center justify-center
                    rounded-full px-1.5 text-xs font-medium
                    ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }
                  `}
                >
                  {walletCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Fade edges for scroll indication */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-gray-900 to-transparent" />
    </div>
  );
}
