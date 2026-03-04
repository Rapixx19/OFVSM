/**
 * @file scheduler.ts
 * @summary Type definitions for scheduled token launches
 * @dependencies @solana/web3.js
 */

import type { BundleAddresses } from '@/features/launcher/types/ghost';

/**
 * Launch status states
 */
export type LaunchStatus =
  | 'pending'     // Waiting for scheduled time
  | 'processing'  // Being submitted to Jito
  | 'completed'   // Successfully landed on-chain
  | 'failed'      // Submission failed
  | 'cancelled';  // User cancelled

/**
 * Scheduled launch record
 */
export interface ScheduledLaunch {
  id: string;
  creatorWallet: string;
  serializedBundle: string;        // Base64 encoded VersionedTransaction
  bundleAddresses: BundleAddresses;
  launchAt: Date;
  status: LaunchStatus;
  jitoTipLamports: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  signature?: string;
  errorMessage?: string;
}

/**
 * Database row format (snake_case)
 */
export interface ScheduledLaunchRow {
  id: string;
  creator_wallet: string;
  serialized_bundle: string;
  bundle_addresses: BundleAddresses;
  launch_at: string;
  status: LaunchStatus;
  jito_tip_lamports: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  signature: string | null;
  error_message: string | null;
}

/**
 * Parameters for scheduling a launch
 */
export interface ScheduleLaunchParams {
  serializedBundle: string;
  bundleAddresses: BundleAddresses;
  launchAt: Date;
  jitoTipLamports: number;
}

/**
 * Convert database row to domain model
 */
export function rowToScheduledLaunch(row: ScheduledLaunchRow): ScheduledLaunch {
  return {
    id: row.id,
    creatorWallet: row.creator_wallet,
    serializedBundle: row.serialized_bundle,
    bundleAddresses: row.bundle_addresses,
    launchAt: new Date(row.launch_at),
    status: row.status,
    jitoTipLamports: row.jito_tip_lamports,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    signature: row.signature ?? undefined,
    errorMessage: row.error_message ?? undefined,
  };
}

/**
 * Maximum pending launches per wallet
 */
export const MAX_PENDING_LAUNCHES = 5;

/**
 * Launch expiry time (7 days)
 */
export const LAUNCH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
