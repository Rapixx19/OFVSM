/**
 * @file CostBreakdown.tsx
 * @summary Fee table with liquidity, platform fee, rent, tip
 */

'use client';

import type { FeeBreakdown } from '@/features/launcher/types/ghost';

interface CostBreakdownProps {
  fees: FeeBreakdown | null;
  useJito?: boolean;
}

export function CostBreakdown({ fees, useJito }: CostBreakdownProps) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
      <h3 className="mb-4 font-medium text-white">Cost Breakdown</h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Liquidity</span>
          <span className="font-mono text-white">{fees?.liquiditySol.toFixed(4) || '—'} SOL</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Platform Fee (1%)</span>
          <span className="font-mono text-white">{fees?.platformFeeSol.toFixed(4) || '—'} SOL</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Account Rent</span>
          <span className="font-mono text-white">{fees?.rentSol.toFixed(4) || '—'} SOL</span>
        </div>
        {useJito && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Jito Tip</span>
            <span className="font-mono text-white">{fees?.jitoTipSol.toFixed(4) || '—'} SOL</span>
          </div>
        )}
        <div className="border-t border-gray-700 pt-3">
          <div className="flex justify-between">
            <span className="font-medium text-white">Total</span>
            <span className="font-mono text-lg font-semibold text-cyan-400">{fees?.totalSol.toFixed(4) || '—'} SOL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
