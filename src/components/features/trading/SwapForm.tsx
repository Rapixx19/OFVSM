/**
 * @file SwapForm.tsx
 * @summary Token selector, amount input, wallet dropdown
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { lightTap } from '@/core/utils/haptics';
import { truncateAddress } from '@/core/utils/crypto';
import type { UserWallet } from '@/features/wallets/types/wallet';

export interface TokenOption {
  mint: string;
  symbol: string;
  decimals: number;
  name: string;
}

interface SwapFormProps {
  mode: 'buy' | 'sell';
  amount: string;
  onAmountChange: (amount: string) => void;
  selectedToken: TokenOption;
  onTokenChange: (token: TokenOption) => void;
  tokens: TokenOption[];
  activeWallet: UserWallet | undefined;
  verifiedWallets: UserWallet[];
  onWalletChange: (id: string) => void;
}

export function SwapForm({
  mode, amount, onAmountChange, selectedToken, onTokenChange, tokens, activeWallet, verifiedWallets, onWalletChange,
}: SwapFormProps) {
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);

  return (
    <>
      {/* Token selector */}
      <div className="relative mb-4">
        <button onClick={() => setShowTokenSelector(!showTokenSelector)} className="flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">{selectedToken.symbol.slice(0, 2)}</div>
            <span className="font-medium text-white">{selectedToken.symbol}</span>
          </div>
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        <AnimatePresence>
          {showTokenSelector && tokens.length > 1 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-gray-700 bg-gray-800 py-1">
              {tokens.map((token) => (
                <button key={token.mint} onClick={() => { onTokenChange(token); setShowTokenSelector(false); lightTap(); }} className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-gray-700">
                  <span className="text-white">{token.symbol}</span>
                  <span className="text-sm text-gray-400">{token.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Amount input */}
      <div className="mb-4">
        <div className="relative">
          <input type="number" value={amount} onChange={(e) => onAmountChange(e.target.value)} placeholder="0.00" className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 pr-16 font-mono text-lg text-white outline-none transition-colors focus:border-cyan-500" />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">{mode === 'buy' ? 'SOL' : selectedToken.symbol}</span>
        </div>
      </div>

      {/* Wallet selector */}
      <div className="relative mb-4">
        <label className="mb-1 block text-xs text-gray-400">From Wallet</label>
        <button onClick={() => setShowWalletSelector(!showWalletSelector)} className="flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">
          <span className="font-mono text-sm text-white">{activeWallet ? truncateAddress(activeWallet.walletAddress) : 'Select wallet'}</span>
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        <AnimatePresence>
          {showWalletSelector && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 py-1">
              {verifiedWallets.map((w) => (
                <button key={w.id} onClick={() => { onWalletChange(w.id); setShowWalletSelector(false); lightTap(); }} className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-700 ${w.id === activeWallet?.id ? 'bg-cyan-500/10' : ''}`}>
                  <span className="font-mono text-sm text-white">{truncateAddress(w.walletAddress)}</span>
                  {w.isMain && <span className="text-xs text-cyan-400">Main</span>}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
