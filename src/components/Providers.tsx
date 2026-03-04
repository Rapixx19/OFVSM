/**
 * @file Providers.tsx
 * @summary Root providers for wallet adapter and context
 * @dependencies @solana/wallet-adapter-react, @solana/wallet-adapter-react-ui, @solana/wallet-adapter-wallets, @solana/web3.js
 */

'use client';

import { useMemo, type ReactNode } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * Providers props
 */
interface ProvidersProps {
  children: ReactNode;
}

/**
 * Root providers component wrapping wallet adapter context
 * Provides Solana connection and wallet functionality to the app
 */
export function Providers({ children }: ProvidersProps) {
  // Get RPC URL from environment or fall back to devnet
  const endpoint = useMemo(() => {
    const envUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (envUrl) {
      return envUrl;
    }
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
    return clusterApiUrl(network as 'devnet' | 'testnet' | 'mainnet-beta');
  }, []);

  // Initialize wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
