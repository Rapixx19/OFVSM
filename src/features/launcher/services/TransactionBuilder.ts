/**
 * @file TransactionBuilder.ts
 * @summary Atomic bundle orchestrator for token launches with Jito integration
 */

import { Connection, PublicKey, Keypair, TransactionInstruction, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, NATIVE_MINT } from '@solana/spl-token';
import type { LaunchParams, BundleResult, FeeBreakdown, BuiltBundle, BundleAddresses } from '../types/ghost';
import { LOCKER_PROGRAM_ID, JITO_BLOCK_ENGINE_URL, calculateTotalRent, DEFAULT_DECIMALS } from '../constants/addresses';
import { createMintInstructions, createMintToInstruction, type TokenMetadataParams } from '../instructions/createMint';
import { createPoolInstruction, getPoolAddresses } from '../instructions/createPool';
import { createAddLiquidityInstruction } from '../instructions/addLiquidity';
import { createRevokeAllAuthoritiesInstructions } from '../instructions/revokeAuthority';
import { createPlatformFeeInstruction, createJitoTipInstruction, calculatePlatformFeeLamports, lamportsToSol } from '../instructions/platformFee';
import { LOCKER_SEED, VAULT_SEED } from '../../locker/types/locker';
import { createLockLpInstruction } from './InstructionPacker';

interface WalletAdapter {
  publicKey: PublicKey | null;
  signTransaction: <T extends VersionedTransaction>(transaction: T) => Promise<T>;
}

const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

export class GhostBundler {
  constructor(private connection: Connection, private wallet: WalletAdapter) {}

  async buildBundle(params: LaunchParams): Promise<BuiltBundle> {
    const creator = this.wallet.publicKey;
    if (!creator) throw new Error('Wallet not connected');

    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;
    const addresses = await this.deriveAddresses(mint, creator);
    const instructions: TransactionInstruction[] = [];

    const metadata: TokenMetadataParams = {
      name: params.name, symbol: params.symbol, uri: params.imageUri,
      additionalMetadata: params.description ? [['description', params.description]] : [],
    };
    instructions.push(...createMintInstructions(mintKeypair, creator, metadata, params.decimals ?? DEFAULT_DECIMALS));

    const creatorTokenAccount = getAssociatedTokenAddressSync(mint, creator, false, TOKEN_2022_PROGRAM_ID);
    instructions.push(createAssociatedTokenAccountInstruction(creator, creatorTokenAccount, creator, mint, TOKEN_2022_PROGRAM_ID));
    instructions.push(createMintToInstruction(mint, creatorTokenAccount, creator, BigInt(params.totalSupply.toString())));

    const wsolAccount = getAssociatedTokenAddressSync(NATIVE_MINT, creator, false);
    const halfSupply = BigInt(params.totalSupply.toString()) / BigInt(2);
    instructions.push(createPoolInstruction({
      creator, tokenMint0: NATIVE_MINT, tokenMint1: mint, tokenProgram0: TOKEN_PROGRAM, tokenProgram1: TOKEN_2022_PROGRAM_ID,
      creatorToken0: wsolAccount, creatorToken1: creatorTokenAccount,
      initAmount0: BigInt(params.liquiditySol.toString()), initAmount1: halfSupply, openTime: BigInt(0),
    }));

    instructions.push(createAssociatedTokenAccountInstruction(creator, addresses.creatorLpAccount, creator, addresses.lpMint, TOKEN_2022_PROGRAM_ID));
    instructions.push(createAddLiquidityInstruction({
      owner: creator, tokenMint0: NATIVE_MINT, tokenMint1: mint, tokenProgram0: TOKEN_PROGRAM, tokenProgram1: TOKEN_2022_PROGRAM_ID,
      ownerToken0: wsolAccount, ownerToken1: creatorTokenAccount, ownerLpToken: addresses.creatorLpAccount,
      lpTokenAmount: BigInt(1), maxAmount0: BigInt(params.liquiditySol.toString()), maxAmount1: halfSupply,
    }));

    instructions.push(...createRevokeAllAuthoritiesInstructions(mint, creator));
    instructions.push(createLockLpInstruction({
      creator, lpMint: addresses.lpMint, creatorLpAccount: addresses.creatorLpAccount,
      locker: addresses.locker, vault: addresses.vault, lockDurationDays: params.lockDurationDays, isPermanent: params.isPermanentLock,
    }));

    const platformFeeLamports = calculatePlatformFeeLamports(BigInt(params.liquiditySol.toString()));
    instructions.push(createPlatformFeeInstruction(creator, platformFeeLamports));
    if (params.useJito && params.jitoTipLamports.gtn(0)) {
      instructions.push(createJitoTipInstruction(creator, BigInt(params.jitoTipLamports.toString())));
    }

    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    const messageV0 = new TransactionMessage({ payerKey: creator, recentBlockhash: blockhash, instructions }).compileToV0Message();
    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([mintKeypair]);

    return { serializedTransaction: transaction.serialize(), addresses, fees: this.calculateFees(params), instructionCount: instructions.length, blockhash, lastValidBlockHeight };
  }

  async sendBundle(builtBundle: BuiltBundle, signedTransaction: VersionedTransaction): Promise<BundleResult> {
    const serializedTx = Buffer.from(signedTransaction.serialize()).toString('base64');
    const response = await fetch(`${JITO_BLOCK_ENGINE_URL}/api/v1/bundles`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'sendBundle', params: [[serializedTx]] }),
    });
    const result = await response.json();
    if (result.error) throw new Error(`Jito bundle error: ${result.error.message}`);
    const signature = await this.waitForBundleConfirmation(result.result!);
    return { signature, mintAddress: builtBundle.addresses.mint, poolAddress: builtBundle.addresses.pool, lockerAddress: builtBundle.addresses.locker, bundleId: result.result };
  }

  async sendStandard(signedTransaction: VersionedTransaction): Promise<BundleResult & { bundleId: undefined }> {
    const signature = await this.connection.sendRawTransaction(signedTransaction.serialize(), { skipPreflight: false, preflightCommitment: 'confirmed' });
    await this.connection.confirmTransaction(signature, 'confirmed');
    return { signature, mintAddress: PublicKey.default, poolAddress: PublicKey.default, lockerAddress: PublicKey.default, bundleId: undefined };
  }

  calculateFees(params: LaunchParams): FeeBreakdown {
    const liq = BigInt(params.liquiditySol.toString());
    const platform = calculatePlatformFeeLamports(liq);
    const tip = params.useJito ? BigInt(params.jitoTipLamports.toString()) : BigInt(0);
    const rent = BigInt(calculateTotalRent());
    return { platformFeeSol: lamportsToSol(platform), jitoTipSol: lamportsToSol(tip), rentSol: lamportsToSol(rent), liquiditySol: lamportsToSol(liq), totalSol: lamportsToSol(platform + tip + rent + liq) };
  }

  private async deriveAddresses(mint: PublicKey, creator: PublicKey): Promise<BundleAddresses> {
    const poolAddresses = getPoolAddresses(NATIVE_MINT, mint);
    const [locker] = PublicKey.findProgramAddressSync([Buffer.from(LOCKER_SEED), poolAddresses.lpMint.toBuffer(), creator.toBuffer()], LOCKER_PROGRAM_ID);
    const [vault] = PublicKey.findProgramAddressSync([Buffer.from(VAULT_SEED), locker.toBuffer()], LOCKER_PROGRAM_ID);
    return { mint, pool: poolAddresses.pool, lpMint: poolAddresses.lpMint, locker, vault, creatorLpAccount: getAssociatedTokenAddressSync(poolAddresses.lpMint, creator, false, TOKEN_2022_PROGRAM_ID) };
  }

  private async waitForBundleConfirmation(bundleId: string, maxRetries = 30): Promise<string> {
    for (let i = 0; i < maxRetries; i++) {
      const response = await fetch(`${JITO_BLOCK_ENGINE_URL}/api/v1/bundles/${bundleId}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      const result = await response.json();
      if (result.status === 'Landed') return result.transactions[0].signature;
      if (result.status === 'Failed') throw new Error(`Bundle failed: ${result.error || 'Unknown error'}`);
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error('Bundle confirmation timeout');
  }
}

export function createGhostBundler(connection: Connection, wallet: WalletAdapter): GhostBundler {
  return new GhostBundler(connection, wallet);
}

export const EXPECTED_INSTRUCTIONS = [
  'CreateAccount (mint)', 'InitializeMetadataPointer', 'InitializeMint2', 'InitializeMetadata',
  'CreateATA (token)', 'MintTo', 'CreatePool', 'CreateATA (LP)', 'AddLiquidity',
  'SetAuthority (mint)', 'SetAuthority (freeze)', 'LockLp', 'Transfer (fee)', 'Transfer (tip)',
] as const;

export function getExpectedInstructionCount(useJito: boolean): number {
  return useJito ? 14 : 13;
}
