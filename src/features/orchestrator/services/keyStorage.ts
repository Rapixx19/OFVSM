/**
 * @file keyStorage.ts
 * @summary IndexedDB storage for ephemeral session keys
 * @dependencies idb
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { SessionKey } from '../types/speedMode';
import {
  IDB_DATABASE_NAME,
  IDB_STORE_NAME,
  IDB_VERSION,
} from '../types/speedMode';

type SpeedModeDB = IDBPDatabase<{
  [IDB_STORE_NAME]: {
    key: string;
    value: SessionKey;
  };
}>;

let dbPromise: Promise<SpeedModeDB> | null = null;

/**
 * Get or create IndexedDB instance
 */
function getDb(): Promise<SpeedModeDB> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available on server'));
  }

  if (!dbPromise) {
    dbPromise = openDB<{ [IDB_STORE_NAME]: { key: string; value: SessionKey } }>(
      IDB_DATABASE_NAME,
      IDB_VERSION,
      {
        upgrade(db) {
          if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
            db.createObjectStore(IDB_STORE_NAME);
          }
        },
      }
    ) as Promise<SpeedModeDB>;
  }

  return dbPromise;
}

/**
 * Store session key in IndexedDB
 */
export async function storeSessionKey(sessionKey: SessionKey): Promise<void> {
  const db = await getDb();
  await db.put(IDB_STORE_NAME, sessionKey, 'current');
}

/**
 * Retrieve current session key from IndexedDB
 */
export async function getSessionKey(): Promise<SessionKey | null> {
  const db = await getDb();
  const key = await db.get(IDB_STORE_NAME, 'current');
  return key ?? null;
}

/**
 * Delete session key from IndexedDB
 */
export async function deleteSessionKey(): Promise<void> {
  const db = await getDb();
  await db.delete(IDB_STORE_NAME, 'current');
}

/**
 * Update used lamports for session key
 */
export async function updateUsedLamports(
  additionalLamports: number
): Promise<SessionKey | null> {
  const db = await getDb();
  const key = await db.get(IDB_STORE_NAME, 'current');

  if (!key) return null;

  const updated: SessionKey = {
    ...key,
    usedLamports: key.usedLamports + additionalLamports,
  };

  await db.put(IDB_STORE_NAME, updated, 'current');
  return updated;
}

/**
 * Check if valid session exists
 */
export async function hasValidSession(): Promise<boolean> {
  const key = await getSessionKey();
  if (!key) return false;

  const now = Date.now();
  return key.expiresAt > now && key.usedLamports < key.solCapLamports;
}
