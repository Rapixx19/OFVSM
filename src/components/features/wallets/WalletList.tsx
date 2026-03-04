/**
 * @file WalletList.tsx
 * @summary Scrollable list of linked wallets with status badges
 * @dependencies framer-motion, react
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserWallet } from '@/features/wallets/types/wallet';
import { getWalletStatus } from '@/features/wallets/types/wallet';
import { lightTap } from '@/core/utils/haptics';

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
 * Status badge colors
 */
const statusColors = {
  main: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  verified: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  unverified: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
};

/**
 * Truncate wallet address for display
 */
function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Format wallet status label
 */
function formatStatus(status: 'main' | 'verified' | 'unverified'): string {
  if (status === 'main') return 'Main';
  if (status === 'verified') return 'Verified';
  return 'Pending';
}

/**
 * Individual wallet card
 */
function WalletCard({
  wallet,
  isActive,
  onSetActive,
  onRemove,
  onUpdateLabel,
}: {
  wallet: UserWallet;
  isActive: boolean;
  onSetActive: () => void;
  onRemove: () => void;
  onUpdateLabel: (label: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(wallet.label);
  const [copied, setCopied] = useState(false);
  const status = getWalletStatus(wallet);
  const colors = statusColors[status];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(wallet.walletAddress);
    setCopied(true);
    lightTap();
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveLabel = () => {
    if (editLabel.trim() && editLabel !== wallet.label) {
      onUpdateLabel(editLabel.trim());
    }
    setIsEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`
        relative rounded-xl border p-4 transition-colors
        ${isActive
          ? 'border-cyan-500/50 bg-cyan-500/5'
          : 'border-gray-700 bg-gray-900/50'
        }
      `}
    >
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        {/* Label */}
        {isEditing ? (
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleSaveLabel}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveLabel();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            autoFocus
            className="w-32 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-white outline-none focus:border-cyan-500"
          />
        ) : (
          <button
            onClick={() => {
              if (!wallet.isMain) setIsEditing(true);
            }}
            className={`text-sm font-medium ${wallet.isMain ? 'cursor-default' : 'cursor-pointer hover:text-cyan-400'} text-white`}
          >
            {wallet.label}
          </button>
        )}

        {/* Status Badge */}
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
          {formatStatus(status)}
        </span>
      </div>

      {/* Address row */}
      <div className="mb-3 flex items-center gap-2">
        <span className="font-mono text-sm text-gray-400">
          {truncateAddress(wallet.walletAddress)}
        </span>
        <button
          onClick={handleCopy}
          className="text-gray-500 transition-colors hover:text-white"
          title="Copy address"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.svg
                key="check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="h-4 w-4 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </motion.svg>
            ) : (
              <motion.svg
                key="copy"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between">
        {/* Set Active button */}
        {wallet.isVerified || wallet.isMain ? (
          <button
            onClick={() => {
              onSetActive();
              lightTap();
            }}
            disabled={isActive}
            className={`
              rounded-lg px-3 py-1.5 text-sm font-medium transition-all
              ${isActive
                ? 'cursor-default bg-cyan-500/20 text-cyan-400'
                : 'bg-gray-800 text-gray-300 hover:bg-cyan-500/20 hover:text-cyan-400'
              }
            `}
          >
            {isActive ? 'Active' : 'Set Active'}
          </button>
        ) : (
          <span className="text-sm text-gray-500">Awaiting verification</span>
        )}

        {/* Remove button (not for main wallet) */}
        {!wallet.isMain && (
          <button
            onClick={() => {
              onRemove();
              lightTap();
            }}
            className="text-sm text-gray-500 transition-colors hover:text-red-400"
          >
            Remove
          </button>
        )}
      </div>

      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="activeWalletIndicator"
          className="absolute -left-px top-4 h-8 w-1 rounded-r-full bg-cyan-400"
        />
      )}
    </motion.div>
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

  if (wallets.length === 0) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-8 text-center">
        <p className="text-gray-400">No wallets linked yet</p>
        <p className="mt-1 text-sm text-gray-500">Add a wallet to get started</p>
      </div>
    );
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
