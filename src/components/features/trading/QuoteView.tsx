/**
 * @file QuoteView.tsx
 * @summary Quote display, price impact, swap button
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { JupiterQuote } from '@/features/trading/services/jupiterService';
import { formatQuoteAmount, formatPriceImpact, isHighPriceImpact } from '@/features/trading/services/jupiterService';
import type { TokenOption } from './SwapForm';

interface QuoteViewProps {
  quote: JupiterQuote | null;
  isLoadingQuote: boolean;
  isSwapping: boolean;
  error: string | null;
  mode: 'buy' | 'sell';
  selectedToken: TokenOption;
  outputDecimals: number;
  walletConnected: boolean;
  onSwap: () => Promise<void>;
}

export function QuoteView({
  quote, isLoadingQuote, isSwapping, error, mode, selectedToken, outputDecimals, walletConnected, onSwap,
}: QuoteViewProps) {
  return (
    <>
      {/* Quote display */}
      <AnimatePresence>
        {(quote || isLoadingQuote) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 rounded-lg border border-gray-700 bg-gray-800/50 p-3">
            {isLoadingQuote ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="h-4 w-4 rounded-full border-2 border-cyan-400 border-t-transparent" />
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
                    {formatPriceImpact(quote)}{isHighPriceImpact(quote) && ' (High)'}
                  </span>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error display */}
      {error && <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

      {/* Swap button */}
      <button
        onClick={onSwap}
        disabled={!quote || isSwapping || !walletConnected}
        className={`relative w-full overflow-hidden rounded-lg py-3 font-medium transition-all ${
          quote && !isSwapping && walletConnected ? 'bg-cyan-500 text-white hover:bg-cyan-400' : 'cursor-not-allowed bg-gray-700 text-gray-400'
        }`}
      >
        <AnimatePresence>
          {isSwapping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-cyan-500">
              <motion.div animate={{ x: ['0%', '100%'] }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </motion.div>
          )}
        </AnimatePresence>
        <span className="relative z-10">
          {!walletConnected ? 'Connect Wallet' : isSwapping ? 'Swapping...' : !quote ? 'Enter Amount' : `Swap ${mode === 'buy' ? 'SOL' : selectedToken.symbol}`}
        </span>
      </button>

      {/* High price impact warning */}
      {quote && isHighPriceImpact(quote) && (
        <p className="mt-2 text-center text-xs text-amber-400">Price impact is high. Consider reducing the amount.</p>
      )}
    </>
  );
}
