/**
 * @file useSpeedMode.ts
 * @summary React hook for Speed Mode session key management
 * @dependencies @solana/wallet-adapter-react, zustand
 */

'use client';

import { create } from 'zustand';
import { useCallback, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Keypair, Transaction } from '@solana/web3.js';

import type { SessionKey, SpeedModeState } from '../types/speedMode';
import {
  DEFAULT_SOL_CAP_LAMPORTS,
  SESSION_DURATION_MS,
  isSessionExpired,
  getRemainingCapSol,
  getExpiresInSeconds,
} from '../types/speedMode';
import {
  storeSessionKey,
  getSessionKey,
  deleteSessionKey,
} from '../services/keyStorage';
import {
  generateSessionKeypair,
  createInitSessionInstruction,
  encryptSecretKey,
  deriveEncryptionKey,
} from '../services/sessionPda';

/**
 * Zustand store for speed mode state
 */
interface SpeedModeStore extends SpeedModeState {
  setSessionKey: (key: SessionKey | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  updateRemaining: () => void;
}

const useSpeedModeStore = create<SpeedModeStore>((set, get) => ({
  isEnabled: false,
  isLoading: false,
  sessionKey: null,
  remainingCapSol: 0,
  expiresIn: 0,
  error: null,

  setSessionKey: (key) =>
    set({
      sessionKey: key,
      isEnabled: key !== null && !isSessionExpired(key),
      remainingCapSol: key ? getRemainingCapSol(key) : 0,
      expiresIn: key ? getExpiresInSeconds(key) : 0,
    }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  updateRemaining: () => {
    const { sessionKey } = get();
    if (sessionKey) {
      set({
        remainingCapSol: getRemainingCapSol(sessionKey),
        expiresIn: getExpiresInSeconds(sessionKey),
        isEnabled: !isSessionExpired(sessionKey),
      });
    }
  },
}));

/**
 * Speed Mode hook return type
 */
export interface UseSpeedModeReturn {
  isEnabled: boolean;
  isLoading: boolean;
  sessionKey: SessionKey | null;
  remainingCapSol: number;
  expiresIn: number;
  error: Error | null;
  enableSpeedMode: (solCap?: number) => Promise<void>;
  disableSpeedMode: () => Promise<void>;
  getSessionSigner: () => Keypair | null;
}

/**
 * Hook for managing Speed Mode session keys
 */
export function useSpeedMode(): UseSpeedModeReturn {
  const { publicKey, signMessage, signTransaction } = useWallet();
  const { connection } = useConnection();
  const store = useSpeedModeStore();

  // Load existing session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await getSessionKey();
        if (session && !isSessionExpired(session)) {
          store.setSessionKey(session);
        } else if (session) {
          await deleteSessionKey();
        }
      } catch {
        // Ignore load errors
      }
    };

    loadSession();
  }, []);

  // Update remaining time/cap every second
  useEffect(() => {
    if (!store.isEnabled) return;

    const interval = setInterval(() => {
      store.updateRemaining();
    }, 1000);

    return () => clearInterval(interval);
  }, [store.isEnabled]);

  /**
   * Enable Speed Mode by creating a new session
   */
  const enableSpeedMode = useCallback(
    async (solCap: number = DEFAULT_SOL_CAP_LAMPORTS) => {
      if (!publicKey || !signMessage || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      store.setLoading(true);
      store.setError(null);

      try {
        // Generate ephemeral keypair
        const sessionKeypair = generateSessionKeypair();

        // Sign message to derive encryption key
        const message = new TextEncoder().encode(
          `Enable VECTERAI Speed Mode\nTimestamp: ${Date.now()}`
        );
        const signature = await signMessage(message);
        const encryptionKey = await deriveEncryptionKey(signature);

        // Encrypt secret key
        const encryptedSecretKey = await encryptSecretKey(
          sessionKeypair.secretKey,
          encryptionKey
        );

        // Create and send init session transaction
        const instruction = createInitSessionInstruction(
          publicKey,
          sessionKeypair.publicKey,
          solCap
        );

        const transaction = new Transaction().add(instruction);
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        const signed = await signTransaction(transaction);
        await connection.sendRawTransaction(signed.serialize());

        // Store session key
        const now = Date.now();
        const sessionKey: SessionKey = {
          publicKey: sessionKeypair.publicKey.toBase58(),
          encryptedSecretKey,
          createdAt: now,
          expiresAt: now + SESSION_DURATION_MS,
          solCapLamports: solCap,
          usedLamports: 0,
        };

        await storeSessionKey(sessionKey);
        store.setSessionKey(sessionKey);
      } catch (err) {
        store.setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        store.setLoading(false);
      }
    },
    [publicKey, signMessage, signTransaction, connection, store]
  );

  /**
   * Disable Speed Mode
   */
  const disableSpeedMode = useCallback(async () => {
    store.setLoading(true);

    try {
      await deleteSessionKey();
      store.setSessionKey(null);
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  /**
   * Get session signer keypair (for signing transactions)
   */
  const getSessionSigner = useCallback((): Keypair | null => {
    // Note: In production, this would decrypt the secret key
    // For now, return null as decryption requires the wallet signature
    return null;
  }, []);

  return {
    isEnabled: store.isEnabled,
    isLoading: store.isLoading,
    sessionKey: store.sessionKey,
    remainingCapSol: store.remainingCapSol,
    expiresIn: store.expiresIn,
    error: store.error,
    enableSpeedMode,
    disableSpeedMode,
    getSessionSigner,
  };
}
