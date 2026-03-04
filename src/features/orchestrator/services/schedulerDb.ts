/**
 * @file schedulerDb.ts
 * @summary Supabase CRUD operations for scheduled launches
 * @dependencies @supabase/supabase-js
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ScheduledLaunch,
  ScheduledLaunchRow,
  ScheduleLaunchParams,
  LaunchStatus,
} from '../types/scheduler';
import {
  rowToScheduledLaunch,
  MAX_PENDING_LAUNCHES,
} from '../types/scheduler';

const TABLE_NAME = 'scheduled_launches';

/**
 * Insert a new scheduled launch
 */
export async function insertScheduledLaunch(
  supabase: SupabaseClient,
  walletAddress: string,
  params: ScheduleLaunchParams
): Promise<ScheduledLaunch> {
  // Check pending launch limit
  const { count } = await supabase
    .from(TABLE_NAME)
    .select('*', { count: 'exact', head: true })
    .eq('creator_wallet', walletAddress)
    .eq('status', 'pending');

  if (count && count >= MAX_PENDING_LAUNCHES) {
    throw new Error(`Maximum ${MAX_PENDING_LAUNCHES} pending launches allowed`);
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      creator_wallet: walletAddress,
      serialized_bundle: params.serializedBundle,
      bundle_addresses: params.bundleAddresses,
      launch_at: params.launchAt.toISOString(),
      jito_tip_lamports: params.jitoTipLamports,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return rowToScheduledLaunch(data as ScheduledLaunchRow);
}

/**
 * Get all launches for a wallet
 */
export async function getLaunchesByWallet(
  supabase: SupabaseClient,
  walletAddress: string
): Promise<ScheduledLaunch[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('creator_wallet', walletAddress)
    .order('launch_at', { ascending: true });

  if (error) throw error;
  return (data as ScheduledLaunchRow[]).map(rowToScheduledLaunch);
}

/**
 * Get pending launches due for execution
 */
export async function getPendingDueLaunches(
  supabase: SupabaseClient
): Promise<ScheduledLaunch[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('status', 'pending')
    .lte('launch_at', new Date().toISOString())
    .order('launch_at', { ascending: true });

  if (error) throw error;
  return (data as ScheduledLaunchRow[]).map(rowToScheduledLaunch);
}

/**
 * Update launch status
 */
export async function updateLaunchStatus(
  supabase: SupabaseClient,
  id: string,
  status: LaunchStatus,
  meta?: { signature?: string; errorMessage?: string }
): Promise<void> {
  const update: Record<string, unknown> = { status };

  if (status === 'completed') {
    update.completed_at = new Date().toISOString();
    if (meta?.signature) update.signature = meta.signature;
  }

  if (status === 'failed' && meta?.errorMessage) {
    update.error_message = meta.errorMessage;
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .update(update)
    .eq('id', id);

  if (error) throw error;
}

/**
 * Cancel a pending launch
 */
export async function cancelLaunch(
  supabase: SupabaseClient,
  id: string,
  walletAddress: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('creator_wallet', walletAddress)
    .eq('status', 'pending');

  if (error) throw error;
}
