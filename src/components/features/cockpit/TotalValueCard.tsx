/**
 * @file TotalValueCard.tsx
 * @summary Animated total value display card with USD conversion
 * @dependencies framer-motion, react
 */

'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';

/**
 * Props for TotalValueCard component
 */
interface TotalValueCardProps {
  /** Balance in SOL */
  balanceSol: number | null;
  /** Current SOL price in USD */
  solPriceUsd: number | null;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Label for the card (e.g., "Main Wallet", "Total Balance") */
  label?: string;
  /** Whether to show the cyan glow effect (for "Safe" balance) */
  isSafe?: boolean;
}

/**
 * Format number as USD currency
 */
function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format number as SOL with proper decimals
 */
function formatSol(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}

/**
 * Animated number component using spring physics
 */
function AnimatedValue({
  value,
  formatter,
  className,
}: {
  value: number;
  formatter: (v: number) => string;
  className?: string;
}) {
  const spring = useSpring(value, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.01,
  });

  const display = useTransform(spring, (current) => formatter(current));
  const prevValueRef = useRef(value);

  // Update spring when value changes
  useEffect(() => {
    if (value !== prevValueRef.current) {
      spring.set(value);
      prevValueRef.current = value;
    }
  }, [value, spring]);

  return (
    <motion.span className={className}>
      {display}
    </motion.span>
  );
}

/**
 * Total value card with animated USD display
 * Uses JetBrains Mono for numeric values and cyan glow for "Safe" balances
 */
export function TotalValueCard({
  balanceSol,
  solPriceUsd,
  isLoading = false,
  label = 'Total Value',
  isSafe = false,
}: TotalValueCardProps) {
  const usdValue =
    balanceSol !== null && solPriceUsd !== null
      ? balanceSol * solPriceUsd
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        relative overflow-hidden rounded-2xl border border-white/10
        bg-gradient-to-br from-gray-900/90 to-gray-800/90
        p-6 backdrop-blur-xl
        ${isSafe ? 'shadow-[0_0_30px_theme(colors.cyan.400/20)]' : ''}
      `}
    >
      {/* Label */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-400">{label}</span>
        {isSafe && (
          <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-xs font-medium text-cyan-400">
            Safe
          </span>
        )}
      </div>

      {/* USD Value */}
      <div className="mb-3">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-10 w-48 animate-pulse rounded-lg bg-gray-700/50"
            />
          ) : usdValue !== null ? (
            <motion.div
              key="value"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className={`
                font-mono text-4xl font-bold tracking-tight text-white
                ${isSafe ? 'glow-cyan' : ''}
              `}
            >
              <AnimatedValue value={usdValue} formatter={formatUsd} />
            </motion.div>
          ) : (
            <motion.span
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-mono text-4xl font-bold text-gray-500"
            >
              --
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* SOL Balance */}
      <div className="flex items-baseline gap-2">
        <AnimatePresence mode="wait">
          {balanceSol !== null ? (
            <motion.span
              key="sol-value"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2 }}
              className="font-mono text-lg text-gray-300"
            >
              <AnimatedValue value={balanceSol} formatter={formatSol} />
            </motion.span>
          ) : (
            <motion.span
              key="sol-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-mono text-lg text-gray-500"
            >
              0.0000
            </motion.span>
          )}
        </AnimatePresence>
        <span className="text-sm text-gray-500">SOL</span>
      </div>

      {/* Price indicator */}
      {solPriceUsd !== null && (
        <div className="mt-4 flex items-center gap-1 text-xs text-gray-500">
          <span>1 SOL = {formatUsd(solPriceUsd)}</span>
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="ml-1 h-1.5 w-1.5 rounded-full bg-green-400"
          />
        </div>
      )}

      {/* Decorative gradient */}
      <div
        className={`
          absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-3xl
          ${isSafe ? 'bg-cyan-400' : 'bg-primary-500'}
        `}
      />
    </motion.div>
  );
}
