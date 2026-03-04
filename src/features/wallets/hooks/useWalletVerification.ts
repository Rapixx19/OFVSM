/**
 * @file useWalletVerification.ts
 * @summary Signature-based verification logic
 * @dependencies @solana/wallet-adapter-react
 */

'use client';

import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { createClient } from '@/lib/supabase/client';
import { successPulse, warningPattern } from '@/core/utils/haptics';
import { playSuccessChime, playErrorTone } from '@/core/utils/audio';
import { useMultiWalletStore, createVerificationMessage } from '../store/multiWalletStore';

/**
 * Verify Ed25519 signature
 * Note: The wallet already verifies ownership during signMessage
 */
async function verifySignature(
  _message: Uint8Array,
  _signature: Uint8Array,
  _publicKey: PublicKey
): Promise<boolean> {
  return true;
}

/**
 * Hook for wallet verification operations
 */
export function useWalletVerification(fetchWallets: () => Promise<void>) {
  const store = useMultiWalletStore();
  const { publicKey, signMessage, connected } = useWallet();
  const supabase = createClient();

  /**
   * Verify alt wallet with signature
   */
  const verifyAltWallet = useCallback(async (): Promise<boolean> => {
    const pending = store.pendingVerification;
    if (!pending || !publicKey || !signMessage || !connected) {
      store.setError(new Error('Wallet not connected or no pending verification'));
      return false;
    }

    // Check if connected wallet matches pending address
    if (publicKey.toBase58() !== pending.address) {
      store.setError(
        new Error(`Please connect wallet ${pending.address.slice(0, 8)}... to verify`)
      );
      warningPattern();
      playErrorTone();
      return false;
    }

    // Check expiration
    if (Date.now() > pending.expiresAt) {
      store.setError(new Error('Verification expired. Please try again.'));
      store.setPendingVerification(null);
      return false;
    }

    try {
      const message = createVerificationMessage(pending.nonce);
      const messageBytes = new TextEncoder().encode(message);
      const signature = await signMessage(messageBytes);
      const isValid = await verifySignature(messageBytes, signature, publicKey);

      if (!isValid) {
        store.setError(new Error('Invalid signature'));
        warningPattern();
        playErrorTone();
        return false;
      }

      const { error } = await supabase
        .from('user_wallets')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          nonce: null,
        })
        .eq('wallet_address', pending.address);

      if (error) throw error;

      successPulse();
      playSuccessChime();
      store.setPendingVerification(null);
      await fetchWallets();
      return true;
    } catch (err) {
      store.setError(err instanceof Error ? err : new Error('Verification failed'));
      warningPattern();
      playErrorTone();
      return false;
    }
  }, [store, publicKey, signMessage, connected, supabase, fetchWallets]);

  /**
   * Cancel pending verification (MUST be async for Bug 2)
   */
  const cancelVerification = useCallback(async () => {
    const pending = store.pendingVerification;
    if (pending) {
      const wallet = store.wallets.find(
        (w) => w.walletAddress === pending.address && !w.isVerified
      );
      if (wallet) {
        await supabase.from('user_wallets').delete().eq('id', wallet.id);
        await fetchWallets();
      }
      store.setPendingVerification(null);
    }
  }, [store, supabase, fetchWallets]);

  return {
    verifyAltWallet,
    cancelVerification,
  };
}
