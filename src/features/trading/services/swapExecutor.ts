/**
 * @file swapExecutor.ts
 * @summary Jupiter V6 swap transaction execution
 */

import { Connection, VersionedTransaction, AddressLookupTableAccount, PublicKey } from '@solana/web3.js';
import type { SwapResponse } from './quoteEngine';
import { JupiterError } from './quoteEngine';

/** Wallet interface for swap execution */
export interface SwapWallet {
  publicKey: PublicKey | null;
  signTransaction?: <T extends VersionedTransaction>(transaction: T) => Promise<T>;
}

/**
 * Deserialize and execute a swap transaction
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
    const lookupTableAddresses = transaction.message.addressTableLookups.map((lookup) => lookup.accountKey);
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
      ...lookupTableAccounts.filter((account): account is AddressLookupTableAccount => account !== null)
    );
  }

  // Sign the transaction
  const signedTransaction = await wallet.signTransaction(transaction);

  // Get the latest blockhash for confirmation
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  // Send transaction
  const rawTransaction = signedTransaction.serialize();
  const signature = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 3,
  });

  // Confirm transaction
  await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, 'confirmed');

  return signature;
}
