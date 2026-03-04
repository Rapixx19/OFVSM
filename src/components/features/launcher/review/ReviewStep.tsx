/**
 * @file ReviewStep.tsx
 * @summary Step 3: Launch review orchestrator
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import type { LaunchParams, FeeBreakdown, LaunchStatus, BundleResult } from '@/features/launcher/types/ghost';
import { AgentToggle } from '@/components/features/orchestrator';
import type { ExecutionType, MarketConditions } from '@/features/orchestrator/types/agent';
import { lightTap } from '@/core/utils/haptics';
import { calculateTrustScore } from '@/features/locker/services/trustScoreCalculator';
import { SentinelScoreboard } from '@/components/features/locker';
import type { TrustScore } from '@/features/locker/types/trustScore';
import { TokenSummary } from './TokenSummary';
import { CostBreakdown } from './CostBreakdown';
import { JitoConfig } from './JitoConfig';
import { LaunchActions } from './LaunchActions';

interface ReviewStepProps {
  params: Partial<LaunchParams>;
  fees: FeeBreakdown | null;
  status: LaunchStatus;
  error: Error | null;
  result: BundleResult | null;
  onUpdate: (partial: Partial<LaunchParams>) => void;
  onCalculateFees: () => void;
  onLaunch: () => void;
  onPrev: () => void;
  onReset: () => void;
  canLaunch: boolean;
  isLoading: boolean;
  executionType?: ExecutionType;
  onExecutionTypeChange?: (type: ExecutionType) => void;
  lastConditions?: MarketConditions | null;
  isStrategistLoading?: boolean;
}

const STATUS_MESSAGES: Record<LaunchStatus, string> = {
  idle: '', building: 'Building atomic bundle...', signing: 'Waiting for signature...',
  sending: 'Submitting to Jito Block Engine...', confirming: 'Confirming transaction...',
  success: 'Token launched successfully!', error: 'Launch failed',
};

export function ReviewStep({
  params, fees, status, error, result, onUpdate, onCalculateFees, onLaunch, onPrev, onReset,
  canLaunch, isLoading, executionType = 'timestamp', onExecutionTypeChange, lastConditions, isStrategistLoading,
}: ReviewStepProps) {
  const [auditEnabled, setAuditEnabled] = useState(false);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);

  useEffect(() => { onCalculateFees(); }, [params.liquiditySol, params.useJito, params.jitoTipLamports, onCalculateFees]);

  useEffect(() => {
    if (!auditEnabled) { setTrustScore(null); return; }
    const liquidityValue = params.liquiditySol ? params.liquiditySol.toNumber() / 1e9 : 0;
    setTrustScore(calculateTrustScore({
      name: params.name || '', symbol: params.symbol || '', imageUri: params.imageUri || '',
      liquiditySol: liquidityValue, lockDurationDays: params.lockDurationDays || 90,
      isPermanentLock: params.isPermanentLock || false, revokeMint: true, revokeFreeze: true,
    }));
  }, [auditEnabled, params]);

  const handleAuditToggle = useCallback(() => { lightTap(); setAuditEnabled((prev) => !prev); }, []);

  // Success state
  if (status === 'success' && result) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500">
          <svg className="h-10 w-10 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </motion.div>
        <div><h2 className="text-2xl font-bold text-white">Launch Successful!</h2><p className="mt-2 text-gray-400">Your token is now live on Solana</p></div>
        <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
          <div className="space-y-3 text-left">
            <div className="flex justify-between"><span className="text-gray-400">Token</span><span className="font-medium text-white">{params.name} ({params.symbol})</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Mint Address</span><a href={`https://solscan.io/token/${result.mintAddress.toBase58()}`} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-cyan-400 hover:underline">{result.mintAddress.toBase58().slice(0, 8)}...</a></div>
            <div className="flex justify-between"><span className="text-gray-400">Transaction</span><a href={`https://solscan.io/tx/${result.signature}`} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-cyan-400 hover:underline">{result.signature.slice(0, 8)}...</a></div>
            {result.bundleId && <div className="flex justify-between"><span className="text-gray-400">Jito Bundle</span><span className="font-mono text-sm text-gray-300">{result.bundleId.slice(0, 8)}...</span></div>}
          </div>
        </div>
        <div className="flex gap-3">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onReset} className="flex-1 rounded-lg border border-gray-600 py-4 font-semibold text-gray-300 transition-colors hover:border-gray-500 hover:text-white">Launch Another</motion.button>
          <motion.a whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} href={`https://raydium.io/swap/?inputMint=sol&outputMint=${result.mintAddress.toBase58()}`} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center rounded-lg bg-cyan-500 py-4 font-semibold text-black transition-colors hover:bg-cyan-400">Trade on Raydium</motion.a>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="text-center"><h2 className="text-xl font-semibold text-white">Review & Launch</h2><p className="mt-1 text-sm text-gray-400">Verify details before deploying</p></div>

      <TokenSummary params={params} />
      <CostBreakdown fees={fees} useJito={params.useJito} />
      <JitoConfig params={params} onUpdate={onUpdate} />

      {/* Sentinel Audit Toggle */}
      <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
        <div className="flex items-center justify-between">
          <div><h3 className="flex items-center gap-2 font-medium text-white"><span className="text-lg">🛡️</span>Sentinel Audit</h3><p className="text-sm text-gray-400">Pre-launch trust score verification</p></div>
          <button onClick={handleAuditToggle} disabled={isLoading} className={`relative h-6 w-11 rounded-full transition-colors ${auditEnabled ? 'bg-emerald-500' : 'bg-gray-600'} ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}>
            <motion.span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow" animate={{ left: auditEnabled ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
          </button>
        </div>
        <AnimatePresence>{auditEnabled && trustScore && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4 overflow-hidden"><SentinelScoreboard score={trustScore} /></motion.div>}</AnimatePresence>
      </div>

      {onExecutionTypeChange && <AgentToggle executionType={executionType} onExecutionTypeChange={onExecutionTypeChange} lastConditions={lastConditions} isLoading={isStrategistLoading} disabled={isLoading} />}

      <AnimatePresence>{error && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="rounded-lg border border-red-500/50 bg-red-500/10 p-4"><p className="text-sm text-red-400">{error.message}</p></motion.div>}</AnimatePresence>
      <AnimatePresence>{isLoading && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-3 py-2"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="h-5 w-5 rounded-full border-2 border-cyan-400 border-t-transparent" /><span className="text-sm text-gray-400">{STATUS_MESSAGES[status]}</span></motion.div>}</AnimatePresence>

      <LaunchActions canLaunch={canLaunch} isLoading={isLoading} onLaunch={onLaunch} onPrev={onPrev} />
    </motion.div>
  );
}
