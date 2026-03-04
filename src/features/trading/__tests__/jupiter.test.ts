/**
 * @file jupiter.test.ts
 * @summary Tests for Jupiter V6 trading service
 * @dependencies vitest
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getQuote,
  buildSwapTransaction,
  getBuyQuote,
  getSellQuote,
  formatQuoteAmount,
  formatPriceImpact,
  isHighPriceImpact,
  SOL_MINT,
  JupiterError,
  type JupiterQuote,
} from '../services/jupiterService';

/**
 * Create a mock Jupiter quote
 */
function createMockQuote(overrides: Partial<JupiterQuote> = {}): JupiterQuote {
  return {
    inputMint: SOL_MINT,
    inAmount: '1000000000',
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    outAmount: '100000000',
    otherAmountThreshold: '99500000',
    swapMode: 'ExactIn',
    slippageBps: 50,
    priceImpactPct: '0.001',
    routePlan: [
      {
        swapInfo: {
          ammKey: 'test-amm',
          label: 'Raydium',
          inputMint: SOL_MINT,
          outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          inAmount: '1000000000',
          outAmount: '100000000',
          feeAmount: '100000',
          feeMint: SOL_MINT,
        },
        percent: 100,
      },
    ],
    contextSlot: 12345678,
    timeTaken: 0.15,
    ...overrides,
  };
}

describe('Jupiter Service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('getQuote', () => {
    it('constructs correct URL with parameters', async () => {
      const mockQuote = createMockQuote();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuote,
      });

      await getQuote(SOL_MINT, 'output-mint', 1000000000, 50);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('quote-api.jup.ag/v6/quote')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`inputMint=${SOL_MINT}`)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('outputMint=output-mint')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('amount=1000000000')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('slippageBps=50')
      );
    });

    it('returns quote on success', async () => {
      const mockQuote = createMockQuote();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuote,
      });

      const quote = await getQuote(SOL_MINT, 'output-mint', 1000000000);

      expect(quote).toEqual(mockQuote);
      expect(quote.inputMint).toBe(SOL_MINT);
    });

    it('throws JupiterError on API failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid pair', errorCode: 'INVALID_PAIR' }),
      });

      await expect(getQuote(SOL_MINT, 'invalid', 1000)).rejects.toThrow(
        JupiterError
      );
    });

    it('uses default slippage of 50 bps', async () => {
      const mockQuote = createMockQuote();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuote,
      });

      await getQuote(SOL_MINT, 'output-mint', 1000000000);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('slippageBps=50')
      );
    });
  });

  describe('buildSwapTransaction', () => {
    it('sends correct request body', async () => {
      const mockQuote = createMockQuote();
      const userPublicKey = '11111111111111111111111111111111';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          swapTransaction: 'base64-tx',
          lastValidBlockHeight: 12345,
          prioritizationFeeLamports: 1000,
        }),
      });

      await buildSwapTransaction(mockQuote, userPublicKey);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('swap'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining(userPublicKey),
        })
      );
    });

    it('includes wrapAndUnwrapSol option', async () => {
      const mockQuote = createMockQuote();

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          swapTransaction: 'base64-tx',
          lastValidBlockHeight: 12345,
          prioritizationFeeLamports: 1000,
        }),
      });

      await buildSwapTransaction(mockQuote, 'pubkey', true);

      const mockCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const body = mockCalls[0]?.[1]?.body as string;
      const callBody = JSON.parse(body);
      expect(callBody.wrapAndUnwrapSol).toBe(true);
    });

    it('throws JupiterError on failure', async () => {
      const mockQuote = createMockQuote();

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal error' }),
      });

      await expect(
        buildSwapTransaction(mockQuote, 'pubkey')
      ).rejects.toThrow(JupiterError);
    });
  });

  describe('getBuyQuote', () => {
    it('converts SOL amount to lamports', async () => {
      const mockQuote = createMockQuote();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuote,
      });

      await getBuyQuote('output-mint', 1.5);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('amount=1500000000')
      );
    });

    it('uses SOL as input mint', async () => {
      const mockQuote = createMockQuote();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuote,
      });

      await getBuyQuote('output-mint', 1);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`inputMint=${SOL_MINT}`)
      );
    });
  });

  describe('getSellQuote', () => {
    it('uses SOL as output mint', async () => {
      const mockQuote = createMockQuote();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuote,
      });

      await getSellQuote('input-mint', 1000000);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`outputMint=${SOL_MINT}`)
      );
    });
  });

  describe('formatQuoteAmount', () => {
    it('formats amount with correct decimals', () => {
      const quote = createMockQuote({ outAmount: '100000000' });
      const formatted = formatQuoteAmount(quote, 6);

      // toLocaleString includes minimum 2 decimal places
      expect(formatted).toMatch(/^100(\.00)?$/);
    });

    it('handles small amounts', () => {
      const quote = createMockQuote({ outAmount: '12345' });
      const formatted = formatQuoteAmount(quote, 6);

      expect(formatted).toBe('0.012345');
    });

    it('limits decimal places', () => {
      const quote = createMockQuote({ outAmount: '123456789012' });
      const formatted = formatQuoteAmount(quote, 9);

      // Should be limited to 6 decimal places max
      expect(formatted).toMatch(/^\d+(\.\d{1,6})?$/);
    });
  });

  describe('formatPriceImpact', () => {
    it('formats price impact as percentage', () => {
      const quote = createMockQuote({ priceImpactPct: '0.01' });
      expect(formatPriceImpact(quote)).toBe('1.00%');
    });

    it('handles small impacts', () => {
      const quote = createMockQuote({ priceImpactPct: '0.001' });
      expect(formatPriceImpact(quote)).toBe('0.10%');
    });

    it('handles large impacts', () => {
      const quote = createMockQuote({ priceImpactPct: '0.05' });
      expect(formatPriceImpact(quote)).toBe('5.00%');
    });
  });

  describe('isHighPriceImpact', () => {
    it('returns true for impact > 1%', () => {
      const quote = createMockQuote({ priceImpactPct: '0.02' });
      expect(isHighPriceImpact(quote)).toBe(true);
    });

    it('returns false for impact <= 1%', () => {
      const quote = createMockQuote({ priceImpactPct: '0.01' });
      expect(isHighPriceImpact(quote)).toBe(false);
    });

    it('returns false for small impacts', () => {
      const quote = createMockQuote({ priceImpactPct: '0.001' });
      expect(isHighPriceImpact(quote)).toBe(false);
    });
  });
});

describe('JupiterError', () => {
  it('has correct name', () => {
    const error = new JupiterError('test');
    expect(error.name).toBe('JupiterError');
  });

  it('stores error code', () => {
    const error = new JupiterError('test', 'TEST_CODE');
    expect(error.code).toBe('TEST_CODE');
  });

  it('extends Error', () => {
    const error = new JupiterError('test');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('SOL_MINT constant', () => {
  it('is wrapped SOL mint address', () => {
    expect(SOL_MINT).toBe('So11111111111111111111111111111111111111112');
  });
});
