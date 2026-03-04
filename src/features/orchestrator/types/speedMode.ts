/**
 * @file speedMode.ts
 * @summary Type definitions for Speed Mode session keys
 * @dependencies @solana/web3.js, @coral-xyz/anchor
 */

import type { PublicKey } from '@solana/web3.js';
import type { BN } from '@coral-xyz/anchor';

/**
 * Session key stored in IndexedDB
 */
export interface SessionKey {
  publicKey: string;
  encryptedSecretKey: ArrayBuffer;  // Encrypted with wallet signature
  createdAt: number;                // Unix timestamp
  expiresAt: number;                // Unix timestamp (24h from creation)
  solCapLamports: number;           // Default 0.05 SOL = 50_000_000
  usedLamports: number;             // Tracked spending
}

/**
 * On-chain Session PDA account structure
 */
export interface SessionPdaAccount {
  authority: PublicKey;      // Main wallet that created session
  sessionKey: PublicKey;     // Ephemeral signing key
  solCap: BN;                // Maximum SOL this session can spend
  spent: BN;                 // Amount spent so far
  expiresAt: BN;             // Unix timestamp
  bump: number;              // PDA bump seed
}

/**
 * Speed Mode state for UI
 */
export interface SpeedModeState {
  isEnabled: boolean;
  isLoading: boolean;
  sessionKey: SessionKey | null;
  remainingCapSol: number;   // SOL remaining in session
  expiresIn: number;         // Seconds until expiry
  error: Error | null;
}

/**
 * Default session parameters
 */
export const DEFAULT_SOL_CAP_LAMPORTS = 50_000_000;  // 0.05 SOL
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;  // 24 hours
export const SESSION_SEED = 'session';

/**
 * IndexedDB configuration
 */
export const IDB_DATABASE_NAME = 'vecterai-speed-mode';
export const IDB_STORE_NAME = 'session-keys';
export const IDB_VERSION = 1;

/**
 * Check if session is expired
 */
export function isSessionExpired(session: SessionKey): boolean {
  return Date.now() >= session.expiresAt;
}

/**
 * Check if session has remaining capacity
 */
export function hasRemainingCap(session: SessionKey): boolean {
  return session.usedLamports < session.solCapLamports;
}

/**
 * Calculate remaining SOL in session
 */
export function getRemainingCapSol(session: SessionKey): number {
  const remaining = session.solCapLamports - session.usedLamports;
  return Math.max(0, remaining) / 1e9;
}

/**
 * Calculate seconds until session expires
 */
export function getExpiresInSeconds(session: SessionKey): number {
  const remaining = session.expiresAt - Date.now();
  return Math.max(0, Math.floor(remaining / 1000));
}
