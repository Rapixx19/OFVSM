/**
 * @file quoteEngine.ts
 * @summary Jupiter V6 quote fetching and formatting utilities
 */

const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';

/** SOL mint address (wrapped SOL) */
export const SOL_MINT = 'So11111111111111111111111111111111111111112';

/** Route plan item from Jupiter */
export interface RoutePlan {
  swapInfo: {
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    feeAmount: string;
    feeMint: string;
  };
  percent: number;
}

/** Jupiter quote response */
export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: RoutePlan[];
  contextSlot: number;
  timeTaken: number;
}

/** Swap transaction response */
export interface SwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

/** Jupiter service error */
export class JupiterError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'JupiterError';
  }
}

/**
 * Get a swap quote from Jupiter
 */
export async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 50
): Promise<JupiterQuote> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    slippageBps: slippageBps.toString(),
  });

  const response = await fetch(`${JUPITER_QUOTE_API}/quote?${params}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new JupiterError(error.error || `Failed to get quote: ${response.status}`, error.errorCode);
  }
  return response.json();
}

/**
 * Build a swap transaction from a quote
 */
export async function buildSwapTransaction(
  quoteResponse: JupiterQuote,
  userPublicKey: string,
  wrapUnwrapSol: boolean = true
): Promise<SwapResponse> {
  const response = await fetch(`${JUPITER_QUOTE_API}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: wrapUnwrapSol,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new JupiterError(error.error || `Failed to build swap: ${response.status}`, error.errorCode);
  }
  return response.json();
}

/** Get quote for buying tokens with SOL */
export async function getBuyQuote(outputMint: string, solAmount: number, slippageBps: number = 50): Promise<JupiterQuote> {
  const lamports = Math.floor(solAmount * 1e9);
  return getQuote(SOL_MINT, outputMint, lamports, slippageBps);
}

/** Get quote for selling tokens for SOL */
export async function getSellQuote(inputMint: string, tokenAmount: number, slippageBps: number = 50): Promise<JupiterQuote> {
  return getQuote(inputMint, SOL_MINT, tokenAmount, slippageBps);
}

/** Format output amount from quote */
export function formatQuoteAmount(quote: JupiterQuote, decimals: number): string {
  const amount = Number(quote.outAmount) / Math.pow(10, decimals);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.min(decimals, 6),
  });
}

/** Format price impact percentage */
export function formatPriceImpact(quote: JupiterQuote): string {
  const impact = parseFloat(quote.priceImpactPct) * 100;
  return `${impact.toFixed(2)}%`;
}

/** Check if price impact is high (> 1%) */
export function isHighPriceImpact(quote: JupiterQuote): boolean {
  return parseFloat(quote.priceImpactPct) > 0.01;
}
