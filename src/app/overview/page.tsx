/**
 * @file page.tsx
 * @summary Cockpit overview page with real-time balance and price display
 * @dependencies @/features/cockpit/hooks, @/components/features/cockpit, @solana/wallet-adapter-react-ui
 */

'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useSolPrice } from '@/features/cockpit/hooks/useSolPrice';
import { useWalletBalance } from '@/features/cockpit/hooks/useWalletBalance';
import { TotalValueCard } from '@/components/features/cockpit/TotalValueCard';
import { WalletPills, type WalletView } from '@/components/features/cockpit/WalletPills';

/**
 * Cockpit overview page
 * Displays real-time wallet balance and SOL price
 * Respects 480px max-width boundary with safe-area padding
 */
export default function OverviewPage() {
  const { connected } = useWallet();
  const { price: solPrice, isLoading: isPriceLoading, lastUpdated } = useSolPrice();
  const { balance, isLoading: isBalanceLoading, isSubscribed } = useWalletBalance();
  const [walletView, setWalletView] = useState<WalletView>('main');

  const isLoading = isPriceLoading || isBalanceLoading;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Container with max-width and safe-area padding */}
      <div className="mx-auto max-w-[480px] px-4 safe-area-top">
        {/* Header */}
        <header className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-lg font-semibold text-white">Cockpit</h1>
            <p className="text-xs text-gray-500">Real-time overview</p>
          </div>

          {/* Connection status indicator */}
          <div className="flex items-center gap-2">
            {isSubscribed && (
              <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-1">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                <span className="text-xs text-green-400">Live</span>
              </div>
            )}
          </div>
        </header>

        {/* VECTERAI ticker placeholder - safe area at top */}
        <div className="mb-6 flex items-center justify-center rounded-lg border border-dashed border-gray-700 bg-gray-800/30 py-3">
          <span className="font-mono text-xs text-gray-500">VECTERAI Ticker</span>
        </div>

        {/* Wallet connection */}
        {!connected ? (
          <div className="flex flex-col items-center gap-6 py-12">
            <div className="text-center">
              <h2 className="mb-2 text-xl font-semibold text-white">
                Connect Your Wallet
              </h2>
              <p className="text-sm text-gray-400">
                Connect your Solana wallet to view your balance
              </p>
            </div>
            <WalletMultiButton className="!bg-primary-600 hover:!bg-primary-700" />
          </div>
        ) : (
          <>
            {/* Wallet view toggle */}
            <div className="mb-4">
              <WalletPills
                selected={walletView}
                onSelect={setWalletView}
                walletCount={1}
              />
            </div>

            {/* Total value card */}
            <div className="mb-6">
              <TotalValueCard
                balanceSol={balance}
                solPriceUsd={solPrice}
                isLoading={isLoading}
                label={walletView === 'main' ? 'Main Wallet' : 'All Wallets'}
                isSafe={true}
              />
            </div>

            {/* Last updated */}
            {lastUpdated && (
              <div className="text-center text-xs text-gray-500">
                Price updated:{' '}
                {lastUpdated.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
