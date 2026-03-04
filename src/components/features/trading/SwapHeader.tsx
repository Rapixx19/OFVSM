/**
 * @file SwapHeader.tsx
 * @summary Header with title and buy/sell mode toggle
 */

'use client';

import { lightTap } from '@/core/utils/haptics';

type SwapMode = 'buy' | 'sell';

interface SwapHeaderProps {
  mode: SwapMode;
  onModeChange: (mode: SwapMode) => void;
}

export function SwapHeader({ mode, onModeChange }: SwapHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="font-medium text-white">Quick Swap</h3>
      <div className="flex rounded-lg bg-gray-800 p-0.5">
        <button
          onClick={() => { onModeChange('buy'); lightTap(); }}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            mode === 'buy' ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => { onModeChange('sell'); lightTap(); }}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            mode === 'sell' ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Sell
        </button>
      </div>
    </div>
  );
}
