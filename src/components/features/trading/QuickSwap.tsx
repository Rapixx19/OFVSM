/**
 * @file QuickSwap.tsx
 * @summary Compact swap interface orchestrator with Jupiter V6 integration
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import type { UserWallet } from '@/features/wallets/types/wallet';
import { buildSwapTransaction, executeSwap, getBuyQuote, getSellQuote, type JupiterQuote, JupiterError } from '@/features/trading/services/jupiterService';
import { successPulse, warningPattern, lightTap } from '@/core/utils/haptics';
import { playSuccessChime, playErrorTone } from '@/core/utils/audio';
import { SwapHeader } from './SwapHeader';
import { SwapForm, type TokenOption } from './SwapForm';
import { QuoteView } from './QuoteView';

type SwapMode = 'buy' | 'sell';

interface QuickSwapProps {
  wallets: UserWallet[];
  activeWalletId: string | null;
  onWalletChange: (id: string) => void;
  tokens?: TokenOption[];
}

const DEFAULT_TOKEN: TokenOption = {
  mint: 'VECTERAi111111111111111111111111111111111',
  symbol: 'VECTERAI',
  decimals: 9,
  name: 'VECTERAI Token',
};

export function QuickSwap({ wallets, activeWalletId, onWalletChange, tokens = [DEFAULT_TOKEN] }: QuickSwapProps) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [mode, setMode] = useState<SwapMode>('buy');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenOption>(tokens[0] || DEFAULT_TOKEN);
  const [quote, setQuote] = useState<JupiterQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifiedWallets = wallets.filter((w) => w.isVerified || w.isMain);
  const activeWallet = wallets.find((w) => w.id === activeWalletId);

  const fetchQuote = useCallback(async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) { setQuote(null); return; }

    setIsLoadingQuote(true);
    setError(null);

    try {
      let newQuote: JupiterQuote;
      if (mode === 'buy') {
        newQuote = await getBuyQuote(selectedToken.mint, numAmount);
      } else {
        const tokenAmount = Math.floor(numAmount * Math.pow(10, selectedToken.decimals));
        newQuote = await getSellQuote(selectedToken.mint, tokenAmount);
      }
      setQuote(newQuote);
    } catch (err) {
      setError(err instanceof JupiterError ? err.message : 'Failed to get quote');
      setQuote(null);
    } finally {
      setIsLoadingQuote(false);
    }
  }, [amount, mode, selectedToken]);

  useEffect(() => {
    const timeout = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timeout);
  }, [fetchQuote]);

  const handleSwap = async () => {
    if (!quote || !wallet.publicKey || !wallet.signTransaction) return;

    lightTap();
    setIsSwapping(true);
    setError(null);

    try {
      const swapResponse = await buildSwapTransaction(quote, wallet.publicKey.toBase58());
      const signature = await executeSwap(swapResponse, wallet, connection);
      successPulse();
      playSuccessChime();
      setAmount('');
      setQuote(null);
      console.log('Swap successful:', signature);
    } catch (err) {
      warningPattern();
      playErrorTone();
      if (err instanceof JupiterError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError('Swap failed');
    } finally {
      setIsSwapping(false);
    }
  };

  const outputDecimals = mode === 'buy' ? selectedToken.decimals : 9;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-gray-900/90 p-4 backdrop-blur-xl">
      <SwapHeader mode={mode} onModeChange={setMode} />
      <SwapForm
        mode={mode}
        amount={amount}
        onAmountChange={setAmount}
        selectedToken={selectedToken}
        onTokenChange={setSelectedToken}
        tokens={tokens}
        activeWallet={activeWallet}
        verifiedWallets={verifiedWallets}
        onWalletChange={onWalletChange}
      />
      <QuoteView
        quote={quote}
        isLoadingQuote={isLoadingQuote}
        isSwapping={isSwapping}
        error={error}
        mode={mode}
        selectedToken={selectedToken}
        outputDecimals={outputDecimals}
        walletConnected={wallet.connected}
        onSwap={handleSwap}
      />
    </motion.div>
  );
}
