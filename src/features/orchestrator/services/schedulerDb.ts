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
import type { EvaluationResult } from '../types/agent';
import { DEFAULT_EXECUTION_PARAMS } from '../types/agent';

const TABLE_NAME = 'scheduled_launches';

/**
 * Insert a new scheduled launch
 */
export async function insertScheduledLaunch(
  supabase: SupabaseClient,
  walletAddress: string,
  params: ScheduleLaunchParams
): Promise<ScheduledLaunch> {
  // Check pending/waiting launch limit
  const { count } = await supabase
    .from(TABLE_NAME)
    .select('*', { count: 'exact', head: true })
    .eq('creator_wallet', walletAddress)
    .in('status', ['pending', 'waiting']);

  if (count && count >= MAX_PENDING_LAUNCHES) {
    throw new Error(`Maximum ${MAX_PENDING_LAUNCHES} pending launches allowed`);
  }

  const executionType = params.executionType || 'timestamp';
  const executionParams = { ...DEFAULT_EXECUTION_PARAMS, ...params.executionParams };

  // Market-optimized launches start as 'waiting'
  const status = executionType === 'market_optimized' ? 'waiting' : 'pending';

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      creator_wallet: walletAddress,
      serialized_bundle: params.serializedBundle,
      bundle_addresses: params.bundleAddresses,
      launch_at: params.launchAt.toISOString(),
      jito_tip_lamports: params.jitoTipLamports,
      execution_type: executionType,
      execution_params: executionParams,
      status,
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
 * Cancel a pending or waiting launch
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
    .in('status', ['pending', 'waiting']);

  if (error) throw error;
}

/**
 * Get waiting launches for market evaluation
 */
export async function getWaitingLaunches(
  supabase: SupabaseClient
): Promise<ScheduledLaunch[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('status', 'waiting')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as ScheduledLaunchRow[]).map(rowToScheduledLaunch);
}

/**
 * Update last evaluation result for a launch
 */
export async function updateLaunchEvaluation(
  supabase: SupabaseClient,
  id: string,
  evaluation: EvaluationResult
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ last_evaluation: evaluation })
    .eq('id', id);

  if (error) throw error;
}
