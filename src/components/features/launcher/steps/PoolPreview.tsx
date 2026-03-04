/**
 * @file PoolPreview.tsx
 * @summary Pool preview card for token economics step
 */

'use client';

interface PoolPreviewProps {
  symbol?: string;
  liquidityValue: number;
}

/**
 * Pool preview card showing token pair info
 */
export function PoolPreview({ symbol, liquidityValue }: PoolPreviewProps) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-400">Pool Preview</h3>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
            <span className="text-sm font-bold text-white">{symbol?.slice(0, 2) || '??'}</span>
          </div>
          <div>
            <p className="font-medium text-white">{symbol || 'TOKEN'}/SOL</p>
            <p className="text-xs text-gray-400">Raydium CPMM</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-white">{liquidityValue.toFixed(1)} SOL</p>
          <p className="text-xs text-gray-400">Initial liquidity</p>
        </div>
      </div>
    </div>
  );
}
