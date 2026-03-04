/**
 * @file agent.ts
 * @summary Type definitions for the Strategist Agent (market-aware launching)
 * @dependencies N/A
 */

/**
 * Execution type for scheduled launches
 */
export type ExecutionType = 'immediate' | 'timestamp' | 'market_optimized';

/**
 * Current market conditions from Helius API
 */
export interface MarketConditions {
  priorityFeeSol: number;       // Current priority fee in SOL
  networkCongestion: number;    // 0-100% network utilization
  tps: number;                  // Current transactions per second
  timestamp: number;            // When conditions were sampled
}

/**
 * Parameters for market-optimized execution
 */
export interface ExecutionParams {
  maxWaitHours?: number;           // Max hours to wait for optimal conditions (default: 24)
  priorityFeeThreshold?: number;   // Max priority fee in SOL (default: 0.005)
  congestionThreshold?: number;    // Max network congestion % (default: 80)
}

/**
 * Result of market condition evaluation
 */
export interface EvaluationResult {
  isGo: boolean;
  conditions: MarketConditions;
  reason: string;
}

/**
 * Default execution parameters
 */
export const DEFAULT_EXECUTION_PARAMS: Required<ExecutionParams> = {
  maxWaitHours: 24,
  priorityFeeThreshold: 0.005,
  congestionThreshold: 80,
};
