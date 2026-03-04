/**
 * @file TokenSummary.tsx
 * @summary Token image, name, symbol display for review
 */

'use client';

import type { LaunchParams } from '@/features/launcher/types/ghost';

interface TokenSummaryProps {
  params: Partial<LaunchParams>;
}

export function TokenSummary({ params }: TokenSummaryProps) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
      <div className="flex items-center gap-4">
        {params.imageUri ? (
          <img src={params.imageUri} alt={params.name} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
            <span className="text-lg font-bold text-white">{params.symbol?.slice(0, 2)}</span>
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-white">{params.name}</h3>
          <p className="font-mono text-cyan-400">${params.symbol}</p>
        </div>
      </div>
    </div>
  );
}
