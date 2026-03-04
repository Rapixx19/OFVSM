/**
 * @file WalletCard.tsx
 * @summary Individual wallet card with status badge and actions
 * @dependencies framer-motion, react
 */

'use client';

import { motion } from 'framer-motion';
import type { UserWallet } from '@/features/wallets/types/wallet';
import { getWalletStatus } from '@/features/wallets/types/wallet';
import { WalletCardHeader } from './WalletCardHeader';
import { WalletCardAddress, truncateAddress } from './WalletCardAddress';
import { WalletCardActions } from './WalletCardActions';

export { truncateAddress };

export interface WalletCardProps {
  wallet: UserWallet;
  isActive: boolean;
  onSetActive: () => void;
  onRemove: () => void;
  onUpdateLabel: (label: string) => void;
}

export function WalletCard({ wallet, isActive, onSetActive, onRemove, onUpdateLabel }: WalletCardProps) {
  const status = getWalletStatus(wallet);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`
        relative rounded-xl border p-4 transition-colors
        ${isActive ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-gray-700 bg-gray-900/50'}
      `}
    >
      <WalletCardHeader
        label={wallet.label}
        status={status}
        isMain={wallet.isMain}
        onEditLabel={onUpdateLabel}
      />

      <WalletCardAddress address={wallet.walletAddress} />

      <WalletCardActions
        isActive={isActive}
        isVerified={wallet.isVerified}
        isMain={wallet.isMain}
        onSetActive={onSetActive}
        onRemove={onRemove}
      />

      {isActive && (
        <motion.div
          layoutId="activeWalletIndicator"
          className="absolute -left-px top-4 h-8 w-1 rounded-r-full bg-cyan-400"
        />
      )}
    </motion.div>
  );
}
