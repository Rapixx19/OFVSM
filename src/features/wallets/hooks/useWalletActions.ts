/**
 * @file useWalletActions.ts
 * @summary CRUD operations for wallet management
 */

'use client';

import { useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { toUserWallet } from '../types/wallet';
import type { UserWalletRow } from '@/types/database';
import { useMultiWalletStore, generateNonce } from '../store/multiWalletStore';
import { warningPattern } from '@/core/utils/haptics';
import { playErrorTone } from '@/core/utils/audio';

export function useWalletActions() {
  const store = useMultiWalletStore();
  const { profile } = useAuthStore();
  const supabase = createClient();

  const fetchWallets = useCallback(async () => {
    if (!profile?.id) return;
    store.setLoading(true);
    store.setError(null);
    try {
      const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const wallets = ((data || []) as UserWalletRow[]).map(toUserWallet);
      store.setWallets(wallets);
      if (!store.activeWalletId && wallets.length > 0) {
        const mainWallet = wallets.find((w) => w.isMain);
        store.setActiveWallet(mainWallet?.id ?? wallets[0]?.id ?? null);
      }
    } catch (err) {
      store.setError(err instanceof Error ? err : new Error('Failed to fetch wallets'));
      warningPattern();
      playErrorTone();
    } finally {
      store.setLoading(false);
    }
  }, [profile?.id, supabase, store]);

  const addAltWallet = useCallback(
    async (address: string, label?: string): Promise<boolean> => {
      if (!profile?.id) {
        store.setError(new Error('Not authenticated'));
        return false;
      }
      try {
        new PublicKey(address);
      } catch {
        store.setError(new Error('Invalid wallet address'));
        return false;
      }
      const nonce = generateNonce();
      const expiresAt = Date.now() + 5 * 60 * 1000;
      try {
        const { error } = await supabase.from('user_wallets').insert({
          profile_id: profile.id,
          wallet_address: address,
          label: label || 'Alt Wallet',
          is_main: false,
          is_verified: false,
          nonce,
        });
        if (error) {
          if (error.code === '23505') {
            store.setError(new Error('Wallet already linked to your account'));
          } else {
            throw error;
          }
          return false;
        }
        store.setPendingVerification({ address, nonce, expiresAt });
        await fetchWallets();
        return true;
      } catch (err) {
        store.setError(err instanceof Error ? err : new Error('Failed to add wallet'));
        warningPattern();
        playErrorTone();
        return false;
      }
    },
    [profile?.id, supabase, store, fetchWallets]
  );

  const removeWallet = useCallback(
    async (id: string): Promise<boolean> => {
      const wallet = store.wallets.find((w) => w.id === id);
      if (!wallet) {
        store.setError(new Error('Wallet not found'));
        return false;
      }
      if (wallet.isMain) {
        store.setError(new Error('Cannot remove main wallet'));
        return false;
      }
      try {
        const { error } = await supabase.from('user_wallets').delete().eq('id', id);
        if (error) throw error;
        if (store.activeWalletId === id) {
          const mainWallet = store.wallets.find((w) => w.isMain);
          store.setActiveWallet(mainWallet?.id || null);
        }
        await fetchWallets();
        return true;
      } catch (err) {
        store.setError(err instanceof Error ? err : new Error('Failed to remove wallet'));
        warningPattern();
        playErrorTone();
        return false;
      }
    },
    [store, supabase, fetchWallets]
  );

  const updateLabel = useCallback(
    async (id: string, label: string): Promise<boolean> => {
      try {
        const { error } = await supabase.from('user_wallets').update({ label }).eq('id', id);
        if (error) throw error;
        await fetchWallets();
        return true;
      } catch (err) {
        store.setError(err instanceof Error ? err : new Error('Failed to update label'));
        warningPattern();
        playErrorTone();
        return false;
      }
    },
    [supabase, fetchWallets, store]
  );

  const setActiveWallet = useCallback(
    (id: string) => {
      store.setActiveWallet(id);
    },
    [store]
  );

  return { fetchWallets, addAltWallet, removeWallet, updateLabel, setActiveWallet };
}
