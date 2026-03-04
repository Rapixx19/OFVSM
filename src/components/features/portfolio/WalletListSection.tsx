/**
 * @file WalletListSection.tsx
 * @summary Wallet list section with add button
 */

'use client';

import { WalletList } from '@/components/features/wallets/WalletList';
import { lightTap } from '@/core/utils/haptics';
import type { UserWallet } from '@/features/wallets/types/wallet';

interface WalletListSectionProps {
  wallets: UserWallet[];
  activeWalletId: string | null;
  isLoading: boolean;
  onSetActive: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onAddClick: () => void;
}

/**
 * Wallet list section with add button
 */
export function WalletListSection({ wallets, activeWalletId, isLoading, onSetActive, onRemove, onUpdateLabel, onAddClick }: WalletListSectionProps) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-white">Linked Wallets</h2>
        <button
          onClick={() => { onAddClick(); lightTap(); }}
          className="flex items-center gap-1 rounded-lg bg-cyan-500/20 px-3 py-1.5 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/30"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Wallet
        </button>
      </div>
      <WalletList wallets={wallets} activeWalletId={activeWalletId} onSetActive={onSetActive} onRemove={onRemove} onUpdateLabel={onUpdateLabel} isLoading={isLoading} />
    </section>
  );
}
