/**
 * @file GhostBundler.ts
 * @summary Atomic bundle orchestrator for token launches with Jito integration
 * @dependencies @solana/web3.js, @solana/spl-token
 */

import {
  Connection,
  PublicKey,
  Keypair,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  NATIVE_MINT,
} from '@solana/spl-token';

import type {
  LaunchParams,
  BundleResult,
  FeeBreakdown,
  BuiltBundle,
  BundleAddresses,
} from '../types/ghost';
import {
  LOCKER_PROGRAM_ID,
  JITO_BLOCK_ENGINE_URL,
  calculateTotalRent,
  DEFAULT_DECIMALS,
} from '../constants/addresses';
import {
  createMintInstructions,
  createMintToInstruction,
  type TokenMetadataParams,
} from '../instructions/createMint';
import {
  createPoolInstruction,
  getPoolAddresses,
} from '../instructions/createPool';
import { createAddLiquidityInstruction } from '../instructions/addLiquidity';
import { createRevokeAllAuthoritiesInstructions } from '../instructions/revokeAuthority';
import {
  createPlatformFeeInstruction,
  createJitoTipInstruction,
  calculatePlatformFeeLamports,
  lamportsToSol,
} from '../instructions/platformFee';
import {
  LOCKER_SEED,
  VAULT_SEED,
  MINIMUM_LOCK_PERIOD,
} from '../../locker/types/locker';

/**
 * Wallet adapter interface
 */
interface WalletAdapter {
  publicKey: PublicKey | null;
  signTransaction: <T extends VersionedTransaction>(transaction: T) => Promise<T>;
  signAllTransactions?: <T extends VersionedTransaction>(
    transactions: T[]
  ) => Promise<T[]>;
}

/**
 * Jito bundle response
 */
interface JitoBundleResponse {
  jsonrpc: string;
  id: number;
  result?: string;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * GhostBundler - Atomic bundle orchestrator for token launches
 *
 * Assembles a single VersionedTransaction containing all operations:
 * 1. createMint (Token-2022) + initMetadata
 * 2. createPool (Raydium CPMM)
 * 3. addLiquidity (Initial deposit)
 * 4. revokeAuthority (Mint & Freeze)
 * 5. lockLp (VECTERAI Locker)
 * 6. systemTransfer (Platform Fee)
 * 7. systemTransfer (Jito Tip - optional)
 */
export class GhostBundler {
  private connection: Connection;
  private wallet: WalletAdapter;

  constructor(connection: Connection, wallet: WalletAdapter) {
    this.connection = connection;
    this.wallet = wallet;
  }

  /**
   * Build the atomic launch bundle
   */
  async buildBundle(params: LaunchParams): Promise<BuiltBundle> {
    const creator = this.wallet.publicKey;
    if (!creator) {
      throw new Error('Wallet not connected');
    }

    // Generate mint keypair
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;

    // Calculate all addresses
    const addresses = await this.deriveAddresses(mint, creator);

    // Build all instructions in order
    const instructions: TransactionInstruction[] = [];

    // 1. Create mint with metadata (Token-2022)
    const metadata: TokenMetadataParams = {
      name: params.name,
      symbol: params.symbol,
      uri: params.imageUri,
      additionalMetadata: params.description
        ? [['description', params.description]]
        : [],
    };
    const mintInstructions = createMintInstructions(
      mintKeypair,
      creator,
      metadata,
      params.decimals ?? DEFAULT_DECIMALS
    );
    instructions.push(...mintInstructions);

    // 2. Create creator token account
    instructions.push(
      createAssociatedTokenAccountInstruction(
        creator,
        getAssociatedTokenAddressSync(mint, creator, false, TOKEN_2022_PROGRAM_ID),
        creator,
        mint,
        TOKEN_2022_PROGRAM_ID
      )
    );

    // 3. Mint initial supply to creator
    const creatorTokenAccount = getAssociatedTokenAddressSync(
      mint,
      creator,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    instructions.push(
      createMintToInstruction(
        mint,
        creatorTokenAccount,
        creator,
        BigInt(params.totalSupply.toString())
      )
    );

    // 4. Create WSOL account for creator (for pool creation)
    const wsolAccount = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      creator,
      false
    );
    // Note: WSOL ATA creation and sync would be done here

    // 5. Create Raydium CPMM pool
    const poolInstruction = createPoolInstruction({
      creator,
      tokenMint0: NATIVE_MINT,
      tokenMint1: mint,
      tokenProgram0: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      tokenProgram1: TOKEN_2022_PROGRAM_ID,
      creatorToken0: wsolAccount,
      creatorToken1: creatorTokenAccount,
      initAmount0: BigInt(params.liquiditySol.toString()),
      initAmount1: BigInt(params.totalSupply.toString()) / BigInt(2), // 50% to pool
      openTime: BigInt(0), // Immediate
    });
    instructions.push(poolInstruction);

    // 6. Create creator LP token account
    instructions.push(
      createAssociatedTokenAccountInstruction(
        creator,
        addresses.creatorLpAccount,
        creator,
        addresses.lpMint,
        TOKEN_2022_PROGRAM_ID
      )
    );

    // 7. Add initial liquidity
    const addLiquidityInstruction = createAddLiquidityInstruction({
      owner: creator,
      tokenMint0: NATIVE_MINT,
      tokenMint1: mint,
      tokenProgram0: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      tokenProgram1: TOKEN_2022_PROGRAM_ID,
      ownerToken0: wsolAccount,
      ownerToken1: creatorTokenAccount,
      ownerLpToken: addresses.creatorLpAccount,
      lpTokenAmount: BigInt(1), // Minimum LP tokens
      maxAmount0: BigInt(params.liquiditySol.toString()),
      maxAmount1: BigInt(params.totalSupply.toString()) / BigInt(2),
    });
    instructions.push(addLiquidityInstruction);

    // 8. Revoke mint and freeze authorities
    const revokeInstructions = createRevokeAllAuthoritiesInstructions(
      mint,
      creator
    );
    instructions.push(...revokeInstructions);

    // 9. Lock LP tokens (VECTERAI Locker)
    const lockLpInstruction = await this.createLockLpInstruction(
      creator,
      addresses.lpMint,
      addresses.creatorLpAccount,
      addresses.locker,
      addresses.vault,
      params.lockDurationDays,
      params.isPermanentLock
    );
    instructions.push(lockLpInstruction);

    // 10. Platform fee transfer
    const platformFeeLamports = calculatePlatformFeeLamports(
      BigInt(params.liquiditySol.toString())
    );
    instructions.push(createPlatformFeeInstruction(creator, platformFeeLamports));

    // 11. Jito tip (optional)
    if (params.useJito && params.jitoTipLamports.gtn(0)) {
      instructions.push(
        createJitoTipInstruction(
          creator,
          BigInt(params.jitoTipLamports.toString())
        )
      );
    }

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash('confirmed');

    // Build versioned transaction
    const messageV0 = new TransactionMessage({
      payerKey: creator,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);

    // Partial sign with mint keypair
    transaction.sign([mintKeypair]);

    // Calculate fees
    const fees = this.calculateFees(params);

    return {
      serializedTransaction: transaction.serialize(),
      addresses,
      fees,
      instructionCount: instructions.length,
      blockhash,
      lastValidBlockHeight,
    };
  }

  /**
   * Send bundle via Jito Block Engine
   */
  async sendBundle(
    builtBundle: BuiltBundle,
    signedTransaction: VersionedTransaction
  ): Promise<BundleResult> {
    const serializedTx = Buffer.from(signedTransaction.serialize()).toString(
      'base64'
    );

    // Submit to Jito Block Engine
    const response = await fetch(`${JITO_BLOCK_ENGINE_URL}/api/v1/bundles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sendBundle',
        params: [[serializedTx]],
      }),
    });

    const result: JitoBundleResponse = await response.json();

    if (result.error) {
      throw new Error(`Jito bundle error: ${result.error.message}`);
    }

    const bundleId = result.result;

    // Wait for bundle confirmation
    const signature = await this.waitForBundleConfirmation(bundleId!);

    return {
      signature,
      mintAddress: builtBundle.addresses.mint,
      poolAddress: builtBundle.addresses.pool,
      lockerAddress: builtBundle.addresses.locker,
      bundleId,
    };
  }

  /**
   * Send transaction via standard RPC (fallback)
   */
  async sendStandard(
    signedTransaction: VersionedTransaction
  ): Promise<BundleResult & { bundleId: undefined }> {
    const signature = await this.connection.sendRawTransaction(
      signedTransaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      }
    );

    // Wait for confirmation
    await this.connection.confirmTransaction(signature, 'confirmed');

    // Extract addresses from transaction (simplified)
    return {
      signature,
      mintAddress: PublicKey.default, // Would extract from tx
      poolAddress: PublicKey.default,
      lockerAddress: PublicKey.default,
      bundleId: undefined,
    };
  }

  /**
   * Calculate fee breakdown
   */
  calculateFees(params: LaunchParams): FeeBreakdown {
    const liquidityLamports = BigInt(params.liquiditySol.toString());
    const platformFeeLamports = calculatePlatformFeeLamports(liquidityLamports);
    const jitoTipLamports = params.useJito
      ? BigInt(params.jitoTipLamports.toString())
      : BigInt(0);
    const rentLamports = BigInt(calculateTotalRent());

    return {
      platformFeeSol: lamportsToSol(platformFeeLamports),
      jitoTipSol: lamportsToSol(jitoTipLamports),
      rentSol: lamportsToSol(rentLamports),
      liquiditySol: lamportsToSol(liquidityLamports),
      totalSol: lamportsToSol(
        platformFeeLamports + jitoTipLamports + rentLamports + liquidityLamports
      ),
    };
  }

  /**
   * Derive all addresses for a launch
   */
  private async deriveAddresses(
    mint: PublicKey,
    creator: PublicKey
  ): Promise<BundleAddresses> {
    // Get pool addresses
    const poolAddresses = getPoolAddresses(NATIVE_MINT, mint);

    // Derive locker PDA
    const [locker] = PublicKey.findProgramAddressSync(
      [Buffer.from(LOCKER_SEED), poolAddresses.lpMint.toBuffer(), creator.toBuffer()],
      LOCKER_PROGRAM_ID
    );

    // Derive vault PDA
    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from(VAULT_SEED), locker.toBuffer()],
      LOCKER_PROGRAM_ID
    );

    // Creator LP token account
    const creatorLpAccount = getAssociatedTokenAddressSync(
      poolAddresses.lpMint,
      creator,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    return {
      mint,
      pool: poolAddresses.pool,
      lpMint: poolAddresses.lpMint,
      locker,
      vault,
      creatorLpAccount,
    };
  }

  /**
   * Create lock LP instruction
   */
  private async createLockLpInstruction(
    creator: PublicKey,
    lpMint: PublicKey,
    creatorLpAccount: PublicKey,
    locker: PublicKey,
    vault: PublicKey,
    lockDurationDays: number,
    isPermanent: boolean
  ): Promise<TransactionInstruction> {
    // Calculate lock duration in seconds
    const lockDurationSeconds =
      lockDurationDays === -1
        ? MINIMUM_LOCK_PERIOD // Permanent locks use minimum period
        : lockDurationDays * 24 * 60 * 60;

    // Build instruction data
    // Discriminator (8 bytes) + amount (8 bytes) + lockDuration (8 bytes) + isPermanent (1 byte)
    const discriminator = Buffer.from([
      0x1a, 0x2b, 0x3c, 0x4d, 0x5e, 0x6f, 0x70, 0x81,
    ]); // lock_lp
    const data = Buffer.alloc(25);
    discriminator.copy(data, 0);
    // Amount will be the full LP balance - set to max u64
    data.writeBigUInt64LE(BigInt('18446744073709551615'), 8);
    data.writeBigInt64LE(BigInt(lockDurationSeconds), 16);
    data.writeUInt8(isPermanent ? 1 : 0, 24);

    return new TransactionInstruction({
      keys: [
        { pubkey: creator, isSigner: true, isWritable: true },
        { pubkey: lpMint, isSigner: false, isWritable: false },
        { pubkey: creatorLpAccount, isSigner: false, isWritable: true },
        { pubkey: locker, isSigner: false, isWritable: true },
        { pubkey: vault, isSigner: false, isWritable: true },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: LOCKER_PROGRAM_ID,
      data,
    });
  }

  /**
   * Wait for Jito bundle confirmation
   */
  private async waitForBundleConfirmation(
    bundleId: string,
    maxRetries: number = 30
  ): Promise<string> {
    for (let i = 0; i < maxRetries; i++) {
      const response = await fetch(
        `${JITO_BLOCK_ENGINE_URL}/api/v1/bundles/${bundleId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.status === 'Landed') {
        return result.transactions[0].signature;
      }

      if (result.status === 'Failed') {
        throw new Error(`Bundle failed: ${result.error || 'Unknown error'}`);
      }

      // Wait 500ms before retry
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error('Bundle confirmation timeout');
  }
}

/**
 * Create a GhostBundler instance
 */
export function createGhostBundler(
  connection: Connection,
  wallet: WalletAdapter
): GhostBundler {
  return new GhostBundler(connection, wallet);
}

/**
 * Instruction names for verification
 */
export const EXPECTED_INSTRUCTIONS = [
  'CreateAccount (mint)',
  'InitializeMetadataPointer',
  'InitializeMint2',
  'InitializeMetadata',
  'CreateATA (token)',
  'MintTo',
  'CreatePool',
  'CreateATA (LP)',
  'AddLiquidity',
  'SetAuthority (mint)',
  'SetAuthority (freeze)',
  'LockLp',
  'Transfer (fee)',
  'Transfer (tip)', // Optional
] as const;

/**
 * Get expected instruction count
 */
export function getExpectedInstructionCount(useJito: boolean): number {
  return useJito ? 14 : 13;
}
