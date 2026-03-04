/**
 * @file LaunchScheduler.ts
 * @summary Main orchestrator for scheduled token launches
 * @dependencies @supabase/supabase-js, @solana/web3.js
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import type {
  ScheduledLaunch,
  ScheduleLaunchParams,
} from '../types/scheduler';
import {
  insertScheduledLaunch,
  getLaunchesByWallet,
  updateLaunchStatus,
  cancelLaunch,
  getPendingDueLaunches,
  getWaitingLaunches,
  updateLaunchEvaluation,
} from './schedulerDb';
import { JITO_BLOCK_ENGINE_URL } from '@/features/launcher/constants/addresses';
import { MarketEvaluator } from '../agents/StrategistAgent';
import { DEFAULT_EXECUTION_PARAMS } from '../types/agent';

/**
 * LaunchScheduler - Manages scheduled token launches
 */
export class LaunchScheduler {
  private supabase: SupabaseClient;
  private connection: Connection;
  private marketEvaluator: MarketEvaluator;

  constructor(supabase: SupabaseClient, connection: Connection, heliusApiKey?: string) {
    this.supabase = supabase;
    this.connection = connection;
    this.marketEvaluator = new MarketEvaluator(heliusApiKey);
  }

  /**
   * Schedule a new launch
   */
  async scheduleLaunch(
    walletAddress: string,
    params: ScheduleLaunchParams
  ): Promise<ScheduledLaunch> {
    // Validate launch time is in the future
    if (params.launchAt <= new Date()) {
      throw new Error('Launch time must be in the future');
    }

    // Validate bundle can be deserialized
    this.deserializeBundle(params.serializedBundle);

    return insertScheduledLaunch(this.supabase, walletAddress, params);
  }

  /**
   * Cancel a pending launch
   */
  async cancelLaunch(id: string, walletAddress: string): Promise<void> {
    return cancelLaunch(this.supabase, id, walletAddress);
  }

  /**
   * Get all launches for a wallet
   */
  async getLaunches(walletAddress: string): Promise<ScheduledLaunch[]> {
    return getLaunchesByWallet(this.supabase, walletAddress);
  }

  /**
   * Get pending launches (for wallet display)
   */
  async getPendingLaunches(walletAddress: string): Promise<ScheduledLaunch[]> {
    const launches = await this.getLaunches(walletAddress);
    return launches.filter((l) => l.status === 'pending' || l.status === 'waiting');
  }

  /**
   * Get waiting launches (market-optimized)
   */
  async getWaitingLaunches(): Promise<ScheduledLaunch[]> {
    return getWaitingLaunches(this.supabase);
  }

  /**
   * Process due launches (called by edge function)
   */
  async processDueLaunches(): Promise<void> {
    const dueLaunches = await getPendingDueLaunches(this.supabase);

    for (const launch of dueLaunches) {
      await this.processLaunch(launch);
    }
  }

  /**
   * Process market-optimized launches waiting for conditions
   */
  async processMarketOptimizedLaunches(): Promise<void> {
    const waitingLaunches = await getWaitingLaunches(this.supabase);

    for (const launch of waitingLaunches) {
      await this.evaluateAndMaybeExecute(launch);
    }
  }

  /**
   * Evaluate market conditions and execute if GO
   */
  private async evaluateAndMaybeExecute(launch: ScheduledLaunch): Promise<void> {
    try {
      // Get current market conditions
      const conditions = await this.marketEvaluator.getMarketConditions();

      // Merge default params with launch-specific params
      const params = { ...DEFAULT_EXECUTION_PARAMS, ...launch.executionParams };

      // Evaluate conditions
      const evaluation = this.marketEvaluator.evaluate(conditions, params);

      // Always update the last evaluation
      await updateLaunchEvaluation(this.supabase, launch.id, evaluation);

      // Check if max wait time exceeded
      const maxWaitMs = (params.maxWaitHours ?? 24) * 60 * 60 * 1000;
      const waitedMs = Date.now() - launch.createdAt.getTime();
      const maxWaitExceeded = waitedMs > maxWaitMs;

      if (evaluation.isGo || maxWaitExceeded) {
        // Execute the launch
        await this.processLaunch(launch);
      }
      // If NO-GO and within wait window, just leave it in 'waiting' status
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await updateLaunchStatus(this.supabase, launch.id, 'failed', {
        errorMessage: `Market evaluation failed: ${message}`,
      });
    }
  }

  /**
   * Process a single launch
   */
  private async processLaunch(launch: ScheduledLaunch): Promise<void> {
    try {
      // Mark as processing
      await updateLaunchStatus(this.supabase, launch.id, 'processing');

      // Deserialize and submit
      const transaction = this.deserializeBundle(launch.serializedBundle);
      const signature = await this.submitToJito(
        transaction,
        launch.jitoTipLamports
      );

      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');

      // Mark as completed
      await updateLaunchStatus(this.supabase, launch.id, 'completed', {
        signature,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await updateLaunchStatus(this.supabase, launch.id, 'failed', {
        errorMessage: message,
      });
    }
  }

  /**
   * Deserialize a base64 encoded bundle
   */
  private deserializeBundle(serializedBundle: string): VersionedTransaction {
    const buffer = Buffer.from(serializedBundle, 'base64');
    return VersionedTransaction.deserialize(buffer);
  }

  /**
   * Submit transaction to Jito Block Engine
   */
  private async submitToJito(
    transaction: VersionedTransaction,
    _tipLamports: number
  ): Promise<string> {
    const serializedTx = Buffer.from(transaction.serialize()).toString('base64');

    const response = await fetch(`${JITO_BLOCK_ENGINE_URL}/api/v1/bundles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sendBundle',
        params: [[serializedTx]],
      }),
    });

    const result = await response.json();

    if (result.error) {
      throw new Error(`Jito error: ${result.error.message}`);
    }

    // Wait for bundle confirmation and return signature
    return this.waitForBundleSignature(result.result);
  }

  /**
   * Wait for bundle to land and return transaction signature
   */
  private async waitForBundleSignature(bundleId: string): Promise<string> {
    for (let i = 0; i < 30; i++) {
      const response = await fetch(
        `${JITO_BLOCK_ENGINE_URL}/api/v1/bundles/${bundleId}`
      );
      const result = await response.json();

      if (result.status === 'Landed') {
        return result.transactions[0].signature;
      }
      if (result.status === 'Failed') {
        throw new Error(result.error || 'Bundle failed');
      }

      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error('Bundle confirmation timeout');
  }
}
