/**
 * @file PortfolioHeader.tsx
 * @summary Portfolio page header with wallet count indicator
 */

'use client';

interface PortfolioHeaderProps {
  connected: boolean;
  walletCount: number;
}

/**
 * Portfolio page header
 */
export function PortfolioHeader({ connected, walletCount }: PortfolioHeaderProps) {
  return (
    <header className="flex items-center justify-between py-4">
      <div>
        <h1 className="text-lg font-semibold text-white">Portfolio</h1>
        <p className="text-xs text-gray-500">Multi-wallet management</p>
      </div>
      {connected && walletCount > 0 && (
        <div className="flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2 py-1">
          <span className="text-xs text-cyan-400">{walletCount} wallet{walletCount > 1 ? 's' : ''}</span>
        </div>
      )}
    </header>
  );
}
