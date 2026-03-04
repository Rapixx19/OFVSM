/**
 * @file strategist.test.ts
 * @summary Tests for MarketEvaluator and market condition evaluation
 * @dependencies vitest
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketEvaluator } from '../agents/StrategistAgent';
import type { MarketConditions } from '../types/agent';
import { DEFAULT_EXECUTION_PARAMS } from '../types/agent';

/**
 * Create mock market conditions
 */
function createMockConditions(
  overrides: Partial<MarketConditions> = {}
): MarketConditions {
  return {
    priorityFeeSol: 0.002,
    networkCongestion: 50,
    tps: 2000,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('MarketEvaluator', () => {
  let evaluator: MarketEvaluator;

  beforeEach(() => {
    evaluator = new MarketEvaluator('test-api-key');
  });

  describe('evaluate() GO scenarios', () => {
    it('returns GO when fee and congestion are below thresholds', () => {
      const conditions = createMockConditions({
        priorityFeeSol: 0.002, // Below 0.005
        networkCongestion: 50, // Below 80%
      });

      const result = evaluator.evaluate(conditions);

      expect(result.isGo).toBe(true);
      expect(result.reason).toContain('Optimal conditions');
    });

    it('returns GO when conditions are exactly at threshold boundaries', () => {
      const conditions = createMockConditions({
        priorityFeeSol: 0.00499, // Just below 0.005
        networkCongestion: 79.9, // Just below 80%
      });

      const result = evaluator.evaluate(conditions);

      expect(result.isGo).toBe(true);
    });

    it('returns GO with zero fees and congestion', () => {
      const conditions = createMockConditions({
        priorityFeeSol: 0,
        networkCongestion: 0,
      });

      const result = evaluator.evaluate(conditions);

      expect(result.isGo).toBe(true);
    });
  });

  describe('evaluate() NO-GO scenarios', () => {
    it('returns NO-GO when priority fee exceeds threshold', () => {
      const conditions = createMockConditions({
        priorityFeeSol: 0.01, // Above 0.005
        networkCongestion: 50, // Below threshold
      });

      const result = evaluator.evaluate(conditions);

      expect(result.isGo).toBe(false);
      expect(result.reason).toContain('Priority fee');
      expect(result.reason).toContain('exceeds threshold');
    });

    it('returns NO-GO when congestion exceeds threshold', () => {
      const conditions = createMockConditions({
        priorityFeeSol: 0.002, // Below threshold
        networkCongestion: 90, // Above 80%
      });

      const result = evaluator.evaluate(conditions);

      expect(result.isGo).toBe(false);
      expect(result.reason).toContain('congestion');
      expect(result.reason).toContain('exceeds threshold');
    });

    it('returns NO-GO when both fee and congestion exceed thresholds', () => {
      const conditions = createMockConditions({
        priorityFeeSol: 0.02,
        networkCongestion: 95,
      });

      const result = evaluator.evaluate(conditions);

      expect(result.isGo).toBe(false);
      expect(result.reason).toContain('High fees');
      expect(result.reason).toContain('congestion');
    });

    it('returns NO-GO when fee exactly equals threshold', () => {
      const conditions = createMockConditions({
        priorityFeeSol: 0.005, // Equals threshold (not strictly less than)
        networkCongestion: 50,
      });

      const result = evaluator.evaluate(conditions);

      expect(result.isGo).toBe(false);
    });

    it('returns NO-GO when congestion exactly equals threshold', () => {
      const conditions = createMockConditions({
        priorityFeeSol: 0.002,
        networkCongestion: 80, // Equals threshold
      });

      const result = evaluator.evaluate(conditions);

      expect(result.isGo).toBe(false);
    });
  });

  describe('Custom threshold overrides', () => {
    it('uses custom priority fee threshold', () => {
      const conditions = createMockConditions({
        priorityFeeSol: 0.008, // Would fail default, but passes custom
        networkCongestion: 50,
      });

      const result = evaluator.evaluate(conditions, {
        priorityFeeThreshold: 0.01,
      });

      expect(result.isGo).toBe(true);
    });

    it('uses custom congestion threshold', () => {
      const conditions = createMockConditions({
        priorityFeeSol: 0.002,
        networkCongestion: 85, // Would fail default, but passes custom
      });

      const result = evaluator.evaluate(conditions, {
        congestionThreshold: 90,
      });

      expect(result.isGo).toBe(true);
    });

    it('uses both custom thresholds together', () => {
      const conditions = createMockConditions({
        priorityFeeSol: 0.008,
        networkCongestion: 85,
      });

      const result = evaluator.evaluate(conditions, {
        priorityFeeThreshold: 0.01,
        congestionThreshold: 90,
      });

      expect(result.isGo).toBe(true);
    });

    it('stricter custom thresholds cause NO-GO', () => {
      const conditions = createMockConditions({
        priorityFeeSol: 0.002, // Would pass default
        networkCongestion: 50, // Would pass default
      });

      const result = evaluator.evaluate(conditions, {
        priorityFeeThreshold: 0.001, // Stricter
        congestionThreshold: 40, // Stricter
      });

      expect(result.isGo).toBe(false);
    });
  });

  describe('EvaluationResult structure', () => {
    it('includes original conditions in result', () => {
      const conditions = createMockConditions();
      const result = evaluator.evaluate(conditions);

      expect(result.conditions).toEqual(conditions);
    });

    it('includes descriptive reason string', () => {
      const conditions = createMockConditions();
      const result = evaluator.evaluate(conditions);

      expect(typeof result.reason).toBe('string');
      expect(result.reason.length).toBeGreaterThan(0);
    });
  });

  describe('Default parameters', () => {
    it('DEFAULT_EXECUTION_PARAMS has correct defaults', () => {
      expect(DEFAULT_EXECUTION_PARAMS.maxWaitHours).toBe(24);
      expect(DEFAULT_EXECUTION_PARAMS.priorityFeeThreshold).toBe(0.005);
      expect(DEFAULT_EXECUTION_PARAMS.congestionThreshold).toBe(80);
    });
  });
});

describe('MarketEvaluator API Integration', () => {
  let evaluator: MarketEvaluator;

  beforeEach(() => {
    evaluator = new MarketEvaluator('test-api-key');
    vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches market conditions from Helius API', async () => {
    // Mock priority fee response
    const priorityFeeResponse = {
      jsonrpc: '2.0',
      id: 1,
      result: {
        priorityFeeEstimate: 1000, // micro-lamports per CU
      },
    };

    // Mock TPS response
    const tpsResponse = {
      jsonrpc: '2.0',
      id: 1,
      result: [
        {
          slot: 123456,
          numTransactions: 3000,
          numSlots: 1,
          samplePeriodSecs: 1,
        },
      ],
    };

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        json: async () => priorityFeeResponse,
      } as Response)
      .mockResolvedValueOnce({
        json: async () => tpsResponse,
      } as Response);

    const conditions = await evaluator.getMarketConditions();

    expect(conditions.tps).toBe(3000);
    expect(conditions.timestamp).toBeGreaterThan(0);
    expect(typeof conditions.priorityFeeSol).toBe('number');
    expect(typeof conditions.networkCongestion).toBe('number');
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

    const conditions = await evaluator.getMarketConditions();

    // Should return zeroed values on error
    expect(conditions.priorityFeeSol).toBe(0);
    expect(conditions.tps).toBe(0);
  });

  it('calculates congestion percentage correctly', async () => {
    const tpsResponse = {
      jsonrpc: '2.0',
      id: 1,
      result: [
        {
          slot: 123456,
          numTransactions: 4000, // Max practical TPS
          numSlots: 1,
          samplePeriodSecs: 1,
        },
      ],
    };

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        json: async () => ({ result: { priorityFeeEstimate: 0 } }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => tpsResponse,
      } as Response);

    const conditions = await evaluator.getMarketConditions();

    // At 4000 TPS (max practical), congestion should be 100%
    expect(conditions.networkCongestion).toBe(100);
  });
});
