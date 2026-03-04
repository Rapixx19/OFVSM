/**
 * @file WalletList.tsx
 * @summary Scrollable list of linked wallets with status badges
 * @dependencies framer-motion, react
 */

'use client';

import { AnimatePresence } from 'framer-motion';
import type { UserWallet } from '@/features/wallets/types/wallet';
import { WalletCard } from './WalletCard';

/**
 * Props for WalletList component
 */
interface WalletListProps {
  wallets: UserWallet[];
  activeWalletId: string | null;
  onSetActive: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  isLoading?: boolean;
}

/**
 * Loading skeleton for wallet list
 */
function WalletListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-xl border border-gray-700 bg-gray-900/50"
        />
      ))}
    </div>
  );
}

/**
 * Empty state for wallet list
 */
function WalletListEmpty() {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-8 text-center">
      <p className="text-gray-400">No wallets linked yet</p>
      <p className="mt-1 text-sm text-gray-500">Add a wallet to get started</p>
    </div>
  );
}

/**
 * Wallet list component
 */
export function WalletList({
  wallets,
  activeWalletId,
  onSetActive,
  onRemove,
  onUpdateLabel,
  isLoading = false,
}: WalletListProps) {
  if (isLoading) {
    return <WalletListSkeleton />;
  }

  if (wallets.length === 0) {
    return <WalletListEmpty />;
  }

  return (
    <div className="max-h-80 space-y-3 overflow-y-auto">
      <AnimatePresence mode="popLayout">
        {wallets.map((wallet) => (
          <WalletCard
            key={wallet.id}
            wallet={wallet}
            isActive={wallet.id === activeWalletId}
            onSetActive={() => onSetActive(wallet.id)}
            onRemove={() => onRemove(wallet.id)}
            onUpdateLabel={(label) => onUpdateLabel(wallet.id, label)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
