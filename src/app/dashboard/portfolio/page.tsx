/**
 * @file page.tsx
 * @summary Portfolio page with multi-wallet management and trading
 */

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useMultiWallet } from "@/features/wallets/hooks/useMultiWallet";
import { useSolPrice } from "@/features/cockpit/hooks/useSolPrice";
import { TotalValueCard } from "@/components/features/cockpit/TotalValueCard";
import { AddWalletModal } from "@/components/features/wallets/AddWalletModal";
import { getSentinelAgent } from "@/features/locker/agents/SentinelAgent";
import {
  PortfolioHeader,
  WalletListSection,
  QuickSwapSection,
} from "@/components/features/portfolio";
import type { AggregatedBalance } from "@/features/wallets/types/wallet";

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
  const [aggregatedBalance, setAggregatedBalance] =
    useState<AggregatedBalance | null>(null);
  const [isAggregating, setIsAggregating] = useState(false);

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
    if (connected) aggregate();
  }, [connected, wallets, connection, getVerifiedWallets]);

  const handleCloseModal = async () => {
    await cancelVerification();
    setIsAddModalOpen(false);
  };
  const isLoading = isWalletsLoading || isPriceLoading || isAggregating;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 pb-24">
      <div className="mx-auto max-w-[480px] px-4 safe-area-top">
        <PortfolioHeader connected={connected} walletCount={wallets.length} />

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
            <div className="mb-6">
              <TotalValueCard
                balanceSol={aggregatedBalance?.totalSol ?? null}
                solPriceUsd={solPrice}
                isLoading={isLoading}
                label={`Total Portfolio (${aggregatedBalance?.walletCount ?? 0} wallets)`}
                isSafe={true}
              />
            </div>

            <WalletListSection
              wallets={wallets}
              activeWalletId={activeWalletId}
              isLoading={isWalletsLoading}
              onSetActive={setActiveWallet}
              onRemove={removeWallet}
              onUpdateLabel={updateLabel}
              onAddClick={() => setIsAddModalOpen(true)}
            />

            <QuickSwapSection
              wallets={wallets}
              activeWalletId={activeWalletId}
              onWalletChange={setActiveWallet}
            />

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

      <AddWalletModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onAddWallet={(addr, label) => addAltWallet(addr, label)}
        onVerify={verifyAltWallet}
        pendingAddress={pendingVerification?.address}
        connectedAddress={publicKey?.toBase58()}
        error={error?.message}
      />
    </main>
  );
}
