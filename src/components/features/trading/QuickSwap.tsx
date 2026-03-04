/**
 * @file QuickSwap.tsx
 * @summary Compact swap interface with Jupiter V6 integration
 * @dependencies framer-motion, react, @solana/wallet-adapter-react
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import type { UserWallet } from '@/features/wallets/types/wallet';
import {
  buildSwapTransaction,
  executeSwap,
  getBuyQuote,
  getSellQuote,
  formatQuoteAmount,
  formatPriceImpact,
  isHighPriceImpact,
  type JupiterQuote,
  JupiterError,
} from '@/features/trading/services/jupiterService';
import { successPulse, warningPattern, lightTap } from '@/core/utils/haptics';
import { playSuccessChime, playErrorTone } from '@/core/utils/audio';

/**
 * Swap mode (buy or sell)
 */
type SwapMode = 'buy' | 'sell';

/**
 * Token option for selector
 */
interface TokenOption {
  mint: string;
  symbol: string;
  decimals: number;
  name: string;
}

/**
 * Props for QuickSwap component
 */
interface QuickSwapProps {
  wallets: UserWallet[];
  activeWalletId: string | null;
  onWalletChange: (id: string) => void;
  tokens?: TokenOption[];
}

/**
 * Default VECTERAI token (placeholder)
 */
const DEFAULT_TOKEN: TokenOption = {
  mint: 'VECTERAi111111111111111111111111111111111',
  symbol: 'VECTERAI',
  decimals: 9,
  name: 'VECTERAI Token',
};


/**
 * Truncate wallet address
 */
function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * QuickSwap component
 */
export function QuickSwap({
  wallets,
  activeWalletId,
  onWalletChange,
  tokens = [DEFAULT_TOKEN],
}: QuickSwapProps) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [mode, setMode] = useState<SwapMode>('buy');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenOption>(tokens[0] || DEFAULT_TOKEN);
  const [quote, setQuote] = useState<JupiterQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);

  const verifiedWallets = wallets.filter((w) => w.isVerified || w.isMain);
  const activeWallet = wallets.find((w) => w.id === activeWalletId);

  /**
   * Fetch quote when amount changes
   */
  const fetchQuote = useCallback(async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setQuote(null);
      return;
    }

    setIsLoadingQuote(true);
    setError(null);

    try {
      let newQuote: JupiterQuote;

      if (mode === 'buy') {
        // Buy token with SOL
        newQuote = await getBuyQuote(selectedToken.mint, numAmount);
      } else {
        // Sell token for SOL
        const tokenAmount = Math.floor(numAmount * Math.pow(10, selectedToken.decimals));
        newQuote = await getSellQuote(selectedToken.mint, tokenAmount);
      }

      setQuote(newQuote);
    } catch (err) {
      if (err instanceof JupiterError) {
        setError(err.message);
      } else {
        setError('Failed to get quote');
      }
      setQuote(null);
    } finally {
      setIsLoadingQuote(false);
    }
  }, [amount, mode, selectedToken]);

  // Debounced quote fetching
  useEffect(() => {
    const timeout = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timeout);
  }, [fetchQuote]);

  /**
   * Execute the swap
   */
  const handleSwap = async () => {
    if (!quote || !wallet.publicKey || !wallet.signTransaction) {
      return;
    }

    lightTap();
    setIsSwapping(true);
    setError(null);

    try {
      // Build swap transaction
      const swapResponse = await buildSwapTransaction(
        quote,
        wallet.publicKey.toBase58()
      );

      // Execute swap
      const signature = await executeSwap(swapResponse, wallet, connection);

      // Success feedback
      successPulse();
      playSuccessChime();

      // Reset state
      setAmount('');
      setQuote(null);

      console.log('Swap successful:', signature);
    } catch (err) {
      warningPattern();
      playErrorTone();

      if (err instanceof JupiterError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Swap failed');
      }
    } finally {
      setIsSwapping(false);
    }
  };

  const outputDecimals = mode === 'buy' ? selectedToken.decimals : 9;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-gray-900/90 p-4 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium text-white">Quick Swap</h3>

        {/* Mode toggle */}
        <div className="flex rounded-lg bg-gray-800 p-0.5">
          <button
            onClick={() => { setMode('buy'); lightTap(); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              mode === 'buy'
                ? 'bg-cyan-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => { setMode('sell'); lightTap(); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              mode === 'sell'
                ? 'bg-cyan-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sell
          </button>
        </div>
      </div>

      {/* Token selector */}
      <div className="relative mb-4">
        <button
          onClick={() => setShowTokenSelector(!showTokenSelector)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">
              {selectedToken.symbol.slice(0, 2)}
            </div>
            <span className="font-medium text-white">{selectedToken.symbol}</span>
          </div>
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Token dropdown */}
        <AnimatePresence>
          {showTokenSelector && tokens.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-gray-700 bg-gray-800 py-1"
            >
              {tokens.map((token) => (
                <button
                  key={token.mint}
                  onClick={() => {
                    setSelectedToken(token);
                    setShowTokenSelector(false);
                    lightTap();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-gray-700"
                >
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
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 pr-16 font-mono text-lg text-white outline-none transition-colors focus:border-cyan-500"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            {mode === 'buy' ? 'SOL' : selectedToken.symbol}
          </span>
        </div>
      </div>

      {/* Source wallet selector */}
      <div className="relative mb-4">
        <label className="mb-1 block text-xs text-gray-400">From Wallet</label>
        <button
          onClick={() => setShowWalletSelector(!showWalletSelector)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-3 py-2"
        >
          <span className="font-mono text-sm text-white">
            {activeWallet ? truncateAddress(activeWallet.walletAddress) : 'Select wallet'}
          </span>
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Wallet dropdown */}
        <AnimatePresence>
          {showWalletSelector && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 py-1"
            >
              {verifiedWallets.map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    onWalletChange(w.id);
                    setShowWalletSelector(false);
                    lightTap();
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-700 ${
                    w.id === activeWalletId ? 'bg-cyan-500/10' : ''
                  }`}
                >
                  <span className="font-mono text-sm text-white">
                    {truncateAddress(w.walletAddress)}
                  </span>
                  {w.isMain && (
                    <span className="text-xs text-cyan-400">Main</span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quote display */}
      <AnimatePresence>
        {(quote || isLoadingQuote) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 rounded-lg border border-gray-700 bg-gray-800/50 p-3"
          >
            {isLoadingQuote ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="h-4 w-4 rounded-full border-2 border-cyan-400 border-t-transparent"
                />
                Getting quote...
              </div>
            ) : quote && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-gray-400">You receive</span>
                  <span className="font-mono text-lg font-medium text-white">
                    {formatQuoteAmount(quote, outputDecimals)} {mode === 'buy' ? selectedToken.symbol : 'SOL'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Price Impact</span>
                  <span className={isHighPriceImpact(quote) ? 'text-amber-400' : 'text-gray-400'}>
                    {formatPriceImpact(quote)}
                    {isHighPriceImpact(quote) && ' (High)'}
                  </span>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error display */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Swap button */}
      <button
        onClick={handleSwap}
        disabled={!quote || isSwapping || !wallet.connected}
        className={`
          relative w-full overflow-hidden rounded-lg py-3 font-medium transition-all
          ${quote && !isSwapping && wallet.connected
            ? 'bg-cyan-500 text-white hover:bg-cyan-400'
            : 'cursor-not-allowed bg-gray-700 text-gray-400'
          }
        `}
      >
        {/* Swapping animation */}
        <AnimatePresence>
          {isSwapping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-cyan-500"
            >
              <motion.div
                animate={{ x: ['0%', '100%'] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <span className="relative z-10">
          {!wallet.connected
            ? 'Connect Wallet'
            : isSwapping
            ? 'Swapping...'
            : !quote
            ? 'Enter Amount'
            : `Swap ${mode === 'buy' ? 'SOL' : selectedToken.symbol}`
          }
        </span>
      </button>

      {/* High price impact warning */}
      {quote && isHighPriceImpact(quote) && (
        <p className="mt-2 text-center text-xs text-amber-400">
          Price impact is high. Consider reducing the amount.
        </p>
      )}
    </motion.div>
  );
}
