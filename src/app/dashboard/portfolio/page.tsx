/**
 * @file page.tsx
 * @summary Portfolio page with multi-wallet management and trading
 * @dependencies @/features/wallets, @/components/features/wallets, @/components/features/trading
 */

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useMultiWallet } from "@/features/wallets/hooks/useMultiWallet";
import { useSolPrice } from "@/features/cockpit/hooks/useSolPrice";
import { TotalValueCard } from "@/components/features/cockpit/TotalValueCard";
import { WalletList } from "@/components/features/wallets/WalletList";
import { AddWalletModal } from "@/components/features/wallets/AddWalletModal";
import { QuickSwap } from "@/components/features/trading/QuickSwap";
import { getSentinelAgent } from "@/features/locker/agents/SentinelAgent";
import type { AggregatedBalance } from "@/features/wallets/types/wallet";
import { lightTap } from "@/core/utils/haptics";

/**
 * Portfolio page component
 */
export default function PortfolioPage() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const { price: solPrice, isLoading: isPriceLoading } = useSolPrice();

  const {
    wallets,
    activeWalletId,
    isLoading: isWalletsLoading,
    error,
    pendingVerification,
    addAltWallet,
    verifyAltWallet,
    setActiveWallet,
    removeWallet,
    updateLabel,
    cancelVerification,
    getVerifiedWallets,
  } = useMultiWallet();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [aggregatedBalance, setAggregatedBalance] =
    useState<AggregatedBalance | null>(null);
  const [isAggregating, setIsAggregating] = useState(false);

  // Aggregate balances across verified wallets
  useEffect(() => {
    async function aggregate() {
      const verifiedWallets = getVerifiedWallets();
      if (verifiedWallets.length === 0) {
        setAggregatedBalance(null);
        return;
      }

      setIsAggregating(true);
      try {
        const sentinel = getSentinelAgent(connection);
        const addresses = verifiedWallets.map((w) => w.walletAddress);
        const balance = await sentinel.aggregateBalances(addresses);
        setAggregatedBalance(balance);
      } catch (err) {
        console.error("Failed to aggregate balances:", err);
      } finally {
        setIsAggregating(false);
      }
    }

    if (connected) {
      aggregate();
    }
  }, [connected, wallets, connection, getVerifiedWallets]);

  const handleAddWallet = async (address: string, label?: string) => {
    return addAltWallet(address, label);
  };

  const handleVerify = async () => {
    return verifyAltWallet();
  };

  const handleCloseModal = () => {
    cancelVerification();
    setIsAddModalOpen(false);
  };

  const isLoading = isWalletsLoading || isPriceLoading || isAggregating;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 pb-24">
      {/* Container with max-width and safe-area padding */}
      <div className="mx-auto max-w-[480px] px-4 safe-area-top">
        {/* Header */}
        <header className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-lg font-semibold text-white">Portfolio</h1>
            <p className="text-xs text-gray-500">Multi-wallet management</p>
          </div>

          {/* Wallet indicator */}
          {connected && wallets.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2 py-1">
              <span className="text-xs text-cyan-400">
                {wallets.length} wallet{wallets.length > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </header>

        {/* Not connected state */}
        {!connected ? (
          <div className="flex flex-col items-center gap-6 py-12">
            <div className="text-center">
              <h2 className="mb-2 text-xl font-semibold text-white">
                Connect Your Wallet
              </h2>
              <p className="text-sm text-gray-400">
                Connect your Solana wallet to manage your portfolio
              </p>
            </div>
            <WalletMultiButton className="!bg-primary-600 hover:!bg-primary-700" />
          </div>
        ) : (
          <>
            {/* Total Balance Card */}
            <div className="mb-6">
              <TotalValueCard
                balanceSol={aggregatedBalance?.totalSol ?? null}
                solPriceUsd={solPrice}
                isLoading={isLoading}
                label={`Total Portfolio (${aggregatedBalance?.walletCount ?? 0} wallets)`}
                isSafe={true}
              />
            </div>

            {/* Wallet List Section */}
            <section className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-medium text-white">Linked Wallets</h2>
                <button
                  onClick={() => {
                    setIsAddModalOpen(true);
                    lightTap();
                  }}
                  className="flex items-center gap-1 rounded-lg bg-cyan-500/20 px-3 py-1.5 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/30"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Wallet
                </button>
              </div>

              <WalletList
                wallets={wallets}
                activeWalletId={activeWalletId}
                onSetActive={setActiveWallet}
                onRemove={removeWallet}
                onUpdateLabel={updateLabel}
                isLoading={isWalletsLoading}
              />
            </section>

            {/* QuickSwap Section */}
            <section className="mb-6">
              <button
                onClick={() => {
                  setShowSwap(!showSwap);
                  lightTap();
                }}
                className="mb-3 flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 text-cyan-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                  <span className="font-medium text-white">Quick Swap</span>
                </div>
                <motion.svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  animate={{ rotate: showSwap ? 180 : 0 }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </motion.svg>
              </button>

              <AnimatePresence>
                {showSwap && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <QuickSwap
                      wallets={wallets}
                      activeWalletId={activeWalletId}
                      onWalletChange={setActiveWallet}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Error display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="rounded-lg bg-red-500/10 p-4 text-sm text-red-400"
                >
                  {error.message}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Add Wallet Modal */}
      <AddWalletModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onAddWallet={handleAddWallet}
        onVerify={handleVerify}
        pendingAddress={pendingVerification?.address}
        connectedAddress={publicKey?.toBase58()}
        error={error?.message}
      />
    </main>
  );
}
