/**
 * @file lockerDatabase.ts
 * @summary Supabase persistence for locker security events
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SecurityEventType } from '../types/sentinel';

/**
 * Trigger a security alert and log to safety_events table
 */
export async function triggerSecurityAlert(
  supabase: SupabaseClient,
  type: SecurityEventType,
  tokenMint: string,
  creatorWallet: string,
  details?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from('safety_events').insert({
    type,
    token_mint: tokenMint,
    creator_wallet: creatorWallet,
    details: details ?? {},
  });

  if (error) {
    console.error('Failed to insert safety event:', error);
    throw error;
  }
}
