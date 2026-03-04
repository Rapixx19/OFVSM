/**
 * @file StrategistAgent.ts
 * @summary Market evaluator for optimal launch timing using Helius API
 * @dependencies N/A
 */

import type {
  MarketConditions,
  ExecutionParams,
  EvaluationResult,
} from '../types/agent';
import { DEFAULT_EXECUTION_PARAMS } from '../types/agent';

/**
 * Helius priority fee response structure
 */
interface HeliusPriorityFeeResponse {
  jsonrpc: string;
  id: number;
  result: {
    priorityFeeEstimate: number; // in micro-lamports per compute unit
  };
}

/**
 * Helius recent performance sample
 */
interface PerformanceSample {
  slot: number;
  numTransactions: number;
  numSlots: number;
  samplePeriodSecs: number;
}

/**
 * MarketEvaluator - Fetches and evaluates Solana network conditions
 */
export class MarketEvaluator {
  private readonly heliusApiKey: string;
  private readonly rpcUrl: string;

  constructor(heliusApiKey?: string) {
    this.heliusApiKey = heliusApiKey || process.env.NEXT_PUBLIC_HELIUS_API_KEY || '';
    this.rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${this.heliusApiKey}`;
  }

  /**
   * Fetch current market conditions from Helius API
   */
  async getMarketConditions(): Promise<MarketConditions> {
    const [priorityFeeSol, tps] = await Promise.all([
      this.fetchPriorityFees(),
      this.fetchRecentTps(),
    ]);

    // Estimate network congestion based on TPS
    // Max theoretical TPS is ~65,000, but practical is ~4,000
    // Above 3,000 TPS = congested
    const maxPracticalTps = 4000;
    const networkCongestion = Math.min(100, (tps / maxPracticalTps) * 100);

    return {
      priorityFeeSol,
      networkCongestion,
      tps,
      timestamp: Date.now(),
    };
  }

  /**
   * Evaluate market conditions against thresholds
   */
  evaluate(
    conditions: MarketConditions,
    params: ExecutionParams = {}
  ): EvaluationResult {
    const {
      priorityFeeThreshold,
      congestionThreshold,
    } = { ...DEFAULT_EXECUTION_PARAMS, ...params };

    const feeOk = conditions.priorityFeeSol < priorityFeeThreshold;
    const congestionOk = conditions.networkCongestion < congestionThreshold;
    const isGo = feeOk && congestionOk;

    let reason: string;
    if (isGo) {
      reason = `Optimal conditions: fee ${conditions.priorityFeeSol.toFixed(4)} SOL, congestion ${conditions.networkCongestion.toFixed(1)}%`;
    } else if (!feeOk && !congestionOk) {
      reason = `High fees (${conditions.priorityFeeSol.toFixed(4)} SOL) and congestion (${conditions.networkCongestion.toFixed(1)}%)`;
    } else if (!feeOk) {
      reason = `Priority fee ${conditions.priorityFeeSol.toFixed(4)} SOL exceeds threshold ${priorityFeeThreshold} SOL`;
    } else {
      reason = `Network congestion ${conditions.networkCongestion.toFixed(1)}% exceeds threshold ${congestionThreshold}%`;
    }

    return {
      isGo,
      conditions,
      reason,
    };
  }

  /**
   * Fetch priority fee estimate from Helius
   */
  private async fetchPriorityFees(): Promise<number> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getPriorityFeeEstimate',
          params: [
            {
              accountKeys: [],
              options: { priorityLevel: 'High' },
            },
          ],
        }),
      });

      const data: HeliusPriorityFeeResponse = await response.json();

      // Convert micro-lamports per CU to SOL
      // Assume ~200,000 CUs for a typical token launch
      const microLamportsPerCu = data.result?.priorityFeeEstimate || 0;
      const estimatedCus = 200_000;
      const lamports = (microLamportsPerCu * estimatedCus) / 1_000_000;
      return lamports / 1e9; // Convert to SOL
    } catch (error) {
      console.error('Failed to fetch priority fees:', error);
      return 0;
    }
  }

  /**
   * Fetch recent TPS from Helius
   */
  private async fetchRecentTps(): Promise<number> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getRecentPerformanceSamples',
          params: [1],
        }),
      });

      const data = await response.json();
      const samples: PerformanceSample[] = data.result || [];

      if (samples.length === 0) return 0;

      const sample = samples[0]!;
      return sample.numTransactions / sample.samplePeriodSecs;
    } catch (error) {
      console.error('Failed to fetch TPS:', error);
      return 0;
    }
  }
}

/**
 * Singleton instance for client-side use
 */
let evaluatorInstance: MarketEvaluator | null = null;

export function getMarketEvaluator(): MarketEvaluator {
  if (!evaluatorInstance) {
    evaluatorInstance = new MarketEvaluator();
  }
  return evaluatorInstance;
}
