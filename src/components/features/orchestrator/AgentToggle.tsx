/**
 * @file AgentToggle.tsx
 * @summary "Let Strategist Decide" toggle for market-aware launch timing
 * @dependencies framer-motion, react
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ExecutionType, ExecutionParams, MarketConditions } from '@/features/orchestrator/types/agent';
import { DEFAULT_EXECUTION_PARAMS } from '@/features/orchestrator/types/agent';

/**
 * Props for AgentToggle
 */
interface AgentToggleProps {
  executionType: ExecutionType;
  onExecutionTypeChange: (type: ExecutionType) => void;
  executionParams?: ExecutionParams;
  lastConditions?: MarketConditions | null;
  isLoading?: boolean;
  disabled?: boolean;
}

/**
 * Format SOL amount for display
 */
function formatSol(value: number): string {
  return value.toFixed(4);
}

/**
 * Format percentage for display
 */
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Agent Toggle Component
 */
export function AgentToggle({
  executionType,
  onExecutionTypeChange,
  executionParams,
  lastConditions,
  isLoading,
  disabled,
}: AgentToggleProps) {
  const isEnabled = executionType === 'market_optimized';
  const params = { ...DEFAULT_EXECUTION_PARAMS, ...executionParams };

  const handleToggle = () => {
    if (disabled) return;
    onExecutionTypeChange(isEnabled ? 'timestamp' : 'market_optimized');
  };

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
      {/* Toggle Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Brain/Strategy Icon */}
          <div
            className={`
              flex h-8 w-8 items-center justify-center rounded-lg
              ${isEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-500'}
              transition-colors
            `}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-white">Let Strategist Decide</h3>
            <p className="text-sm text-gray-400">
              Auto-launch when network conditions are optimal
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={handleToggle}
          disabled={disabled}
          className={`
            relative h-6 w-11 rounded-full transition-colors
            ${isEnabled ? 'bg-cyan-500' : 'bg-gray-600'}
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          `}
        >
          <motion.span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
            animate={{ left: isEnabled ? 22 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      {/* Expandable Info Panel */}
      <AnimatePresence>
        {isEnabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 overflow-hidden"
          >
            {/* Threshold Info */}
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-cyan-400">
                Go Conditions
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Priority Fee</span>
                  <span className="font-mono text-white">
                    &lt; {formatSol(params.priorityFeeThreshold ?? 0.005)} SOL
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Network Congestion</span>
                  <span className="font-mono text-white">
                    &lt; {params.congestionThreshold ?? 80}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Wait</span>
                  <span className="font-mono text-white">
                    {params.maxWaitHours ?? 24} hours
                  </span>
                </div>
              </div>
            </div>

            {/* Current Conditions (if available) */}
            {lastConditions && (
              <div className="mt-3 rounded-lg border border-gray-700 bg-gray-800/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Current Network
                  </p>
                  {isLoading && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="h-3 w-3 rounded-full border border-cyan-400 border-t-transparent"
                    />
                  )}
                </div>
                <div className="mt-2 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Priority Fee</span>
                    <span
                      className={`font-mono ${
                        lastConditions.priorityFeeSol < (params.priorityFeeThreshold ?? 0.005)
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {formatSol(lastConditions.priorityFeeSol)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Congestion</span>
                    <span
                      className={`font-mono ${
                        lastConditions.networkCongestion < (params.congestionThreshold ?? 80)
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {formatPercent(lastConditions.networkCongestion)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">TPS</span>
                    <span className="font-mono text-white">
                      {Math.round(lastConditions.tps).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Info Text */}
            <p className="mt-3 text-xs text-gray-500">
              The Strategist monitors Solana network conditions and launches when
              fees and congestion are low. If conditions don&apos;t improve within
              the max wait time, the launch proceeds anyway.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
