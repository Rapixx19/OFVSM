/**
 * @file jupiterService.ts
 * @summary Jupiter V6 API integration for token swaps
 * @dependencies @solana/web3.js, @solana/wallet-adapter-base
 */

import {
  Connection,
  VersionedTransaction,
  AddressLookupTableAccount,
  PublicKey,
} from '@solana/web3.js';

/**
 * Wallet interface for swap execution
 */
export interface SwapWallet {
  publicKey: PublicKey | null;
  signTransaction?: <T extends VersionedTransaction>(transaction: T) => Promise<T>;
}

/**
 * Jupiter API endpoints
 */
const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';

/**
 * SOL mint address (wrapped SOL)
 */
export const SOL_MINT = 'So11111111111111111111111111111111111111112';

/**
 * Route plan item from Jupiter
 */
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

/**
 * Jupiter quote response
 */
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

/**
 * Swap transaction response
 */
export interface SwapResponse {
  swapTransaction: string; // Base64 encoded
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

/**
 * Jupiter service error
 */
export class JupiterError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'JupiterError';
  }
}

/**
 * Get a swap quote from Jupiter
 *
 * @param inputMint - Input token mint address
 * @param outputMint - Output token mint address
 * @param amount - Amount in smallest units (lamports for SOL)
 * @param slippageBps - Slippage tolerance in basis points (default 50 = 0.5%)
 * @returns Jupiter quote response
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
    throw new JupiterError(
      error.error || `Failed to get quote: ${response.status}`,
      error.errorCode
    );
  }

  return response.json();
}

/**
 * Build a swap transaction from a quote
 *
 * @param quoteResponse - Quote from getQuote()
 * @param userPublicKey - User's wallet public key
 * @param wrapUnwrapSol - Whether to wrap/unwrap SOL automatically
 * @returns Swap response with base64 transaction
 */
export async function buildSwapTransaction(
  quoteResponse: JupiterQuote,
  userPublicKey: string,
  wrapUnwrapSol: boolean = true
): Promise<SwapResponse> {
  const response = await fetch(`${JUPITER_QUOTE_API}/swap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
    throw new JupiterError(
      error.error || `Failed to build swap: ${response.status}`,
      error.errorCode
    );
  }

  return response.json();
}

/**
 * Deserialize and execute a swap transaction
 *
 * @param swapResponse - Response from buildSwapTransaction()
 * @param wallet - Wallet with signTransaction capability
 * @param connection - Solana connection
 * @returns Transaction signature
 */
export async function executeSwap(
  swapResponse: SwapResponse,
  wallet: SwapWallet,
  connection: Connection
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new JupiterError('Wallet not connected or cannot sign transactions');
  }

  // Deserialize the transaction
  const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
  const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

  // Get address lookup tables if needed
  const addressLookupTableAccounts: AddressLookupTableAccount[] = [];

  if (transaction.message.addressTableLookups.length > 0) {
    const lookupTableAddresses = transaction.message.addressTableLookups.map(
      (lookup) => lookup.accountKey
    );

    const lookupTableAccounts = await Promise.all(
      lookupTableAddresses.map(async (address) => {
        const accountInfo = await connection.getAccountInfo(address);
        if (!accountInfo) return null;
        return new AddressLookupTableAccount({
          key: address,
          state: AddressLookupTableAccount.deserialize(accountInfo.data),
        });
      })
    );

    addressLookupTableAccounts.push(
      ...lookupTableAccounts.filter(
        (account): account is AddressLookupTableAccount => account !== null
      )
    );
  }

  // Sign the transaction
  const signedTransaction = await wallet.signTransaction(transaction);

  // Get the latest blockhash for confirmation
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');

  // Send transaction
  const rawTransaction = signedTransaction.serialize();
  const signature = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 3,
  });

  // Confirm transaction
  await connection.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature,
    },
    'confirmed'
  );

  return signature;
}

/**
 * Get quote for buying tokens with SOL
 *
 * @param outputMint - Token mint to buy
 * @param solAmount - SOL amount (not lamports)
 * @param slippageBps - Slippage tolerance
 * @returns Jupiter quote
 */
export async function getBuyQuote(
  outputMint: string,
  solAmount: number,
  slippageBps: number = 50
): Promise<JupiterQuote> {
  const lamports = Math.floor(solAmount * 1e9);
  return getQuote(SOL_MINT, outputMint, lamports, slippageBps);
}

/**
 * Get quote for selling tokens for SOL
 *
 * @param inputMint - Token mint to sell
 * @param tokenAmount - Token amount in smallest units
 * @param slippageBps - Slippage tolerance
 * @returns Jupiter quote
 */
export async function getSellQuote(
  inputMint: string,
  tokenAmount: number,
  slippageBps: number = 50
): Promise<JupiterQuote> {
  return getQuote(inputMint, SOL_MINT, tokenAmount, slippageBps);
}

/**
 * Format output amount from quote
 *
 * @param quote - Jupiter quote
 * @param decimals - Token decimals
 * @returns Formatted amount string
 */
export function formatQuoteAmount(quote: JupiterQuote, decimals: number): string {
  const amount = Number(quote.outAmount) / Math.pow(10, decimals);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.min(decimals, 6),
  });
}

/**
 * Format price impact percentage
 *
 * @param quote - Jupiter quote
 * @returns Formatted price impact string
 */
export function formatPriceImpact(quote: JupiterQuote): string {
  const impact = parseFloat(quote.priceImpactPct) * 100;
  return `${impact.toFixed(2)}%`;
}

/**
 * Check if price impact is high (> 1%)
 *
 * @param quote - Jupiter quote
 * @returns True if price impact is high
 */
export function isHighPriceImpact(quote: JupiterQuote): boolean {
  return parseFloat(quote.priceImpactPct) > 0.01;
}
