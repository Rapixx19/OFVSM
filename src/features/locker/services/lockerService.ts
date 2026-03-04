/**
 * @file lockerService.ts
 * @summary TypeScript client for VECTERAI Locker program
 * @dependencies @coral-xyz/anchor, @solana/web3.js, @solana/spl-token
 */

import { BN } from '@coral-xyz/anchor';
import {
  PublicKey,
  Connection,
  type TransactionSignature,
  Transaction,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  LOCKER_PROGRAM_ID,
  LOCKER_SEED,
  VAULT_SEED,
  MINIMUM_LOCK_PERIOD,
  type LockerAccount,
  type SafeStandardStatus,
  type LockStatus,
  type LockLpParams,
  type ExtendLockParams,
} from '../types/locker';

/**
 * Derive the Locker PDA address
 *
 * @param lpMint - The LP token mint address
 * @param creator - The creator's wallet address
 * @returns The Locker PDA address and bump
 */
export function deriveLockerPda(
  lpMint: PublicKey,
  creator: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(LOCKER_SEED), lpMint.toBuffer(), creator.toBuffer()],
    new PublicKey(LOCKER_PROGRAM_ID)
  );
}

/**
 * Derive the Vault PDA address
 *
 * @param locker - The Locker PDA address
 * @returns The Vault PDA address and bump
 */
export function deriveVaultPda(locker: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED), locker.toBuffer()],
    new PublicKey(LOCKER_PROGRAM_ID)
  );
}

/**
 * Get a locker account by mint and creator
 *
 * @param connection - Solana connection
 * @param lpMint - The LP token mint address
 * @param creator - The creator's wallet address
 * @returns The locker account data or null if not found
 */
export async function getLockerAccount(
  connection: Connection,
  lpMint: PublicKey,
  creator: PublicKey
): Promise<LockerAccount | null> {
  const [lockerPda] = deriveLockerPda(lpMint, creator);

  try {
    const accountInfo = await connection.getAccountInfo(lockerPda);

    if (!accountInfo) {
      return null;
    }

    // Skip the 8-byte discriminator and parse account data
    const data = accountInfo.data.slice(8);

    return {
      creator: new PublicKey(data.slice(0, 32)),
      lpMint: new PublicKey(data.slice(32, 64)),
      vault: new PublicKey(data.slice(64, 96)),
      amount: new BN(data.slice(96, 104), 'le'),
      lockedAt: new BN(data.slice(104, 112), 'le'),
      releaseTime: new BN(data.slice(112, 120), 'le'),
      isPermanent: data[120] === 1,
      isUnlocked: data[121] === 1,
      bump: data[122] ?? 0,
      vaultBump: data[123] ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Get lock status for a token mint
 *
 * @param connection - Solana connection
 * @param mint - The token mint address (LP token)
 * @param creator - Optional creator address to filter by
 * @returns Safe Standard compliance status
 */
export async function getLockStatus(
  connection: Connection,
  mint: string,
  creator?: string
): Promise<SafeStandardStatus> {
  const mintPubkey = new PublicKey(mint);

  // If creator is specified, look up their specific lock
  if (creator) {
    const creatorPubkey = new PublicKey(creator);
    const locker = await getLockerAccount(connection, mintPubkey, creatorPubkey);

    if (!locker) {
      return {
        isCompliant: false,
        status: 'unlocked',
        daysRemaining: null,
        isPermanent: false,
        lockedAmount: null,
        releaseTime: null,
      };
    }

    return calculateLockStatus(locker);
  }

  // Without a creator, we can't look up the lock
  // In a real implementation, you might scan all accounts or use an index
  return {
    isCompliant: false,
    status: 'unlocked',
    daysRemaining: null,
    isPermanent: false,
    lockedAmount: null,
    releaseTime: null,
  };
}

/**
 * Calculate lock status from locker account
 */
function calculateLockStatus(locker: LockerAccount): SafeStandardStatus {
  const now = Math.floor(Date.now() / 1000);
  const releaseTime = locker.releaseTime.toNumber();
  const secondsRemaining = releaseTime - now;
  const daysRemaining = Math.max(0, Math.ceil(secondsRemaining / 86400));

  let status: LockStatus;

  if (locker.isUnlocked) {
    status = 'unlocked';
  } else if (locker.isPermanent) {
    status = 'permanent';
  } else if (now >= releaseTime) {
    status = 'unlockable';
  } else {
    status = 'locked';
  }

  // Safe Standard compliant if locked with minimum period
  const lockDuration = releaseTime - locker.lockedAt.toNumber();
  const isCompliant =
    !locker.isUnlocked &&
    lockDuration >= MINIMUM_LOCK_PERIOD;

  return {
    isCompliant,
    status,
    daysRemaining: locker.isPermanent ? null : daysRemaining,
    isPermanent: locker.isPermanent,
    lockedAmount: locker.amount,
    releaseTime: new Date(releaseTime * 1000),
  };
}

/**
 * Wallet interface for signing transactions
 */
interface WalletAdapter {
  publicKey: PublicKey | null;
  signTransaction: <T extends Transaction>(transaction: T) => Promise<T>;
}

/**
 * VECTERAI Locker Service class
 * Provides high-level interface for interacting with the locker program
 */
export class LockerService {
  private connection: Connection;
  private wallet: WalletAdapter;
  private programId: PublicKey;

  constructor(connection: Connection, wallet: WalletAdapter) {
    this.connection = connection;
    this.wallet = wallet;
    this.programId = new PublicKey(LOCKER_PROGRAM_ID);
  }

  /**
   * Lock LP tokens
   */
  async lockLp(
    lpMint: PublicKey,
    params: LockLpParams
  ): Promise<TransactionSignature> {
    const creator = this.wallet.publicKey;
    if (!creator) {
      throw new Error('Wallet not connected');
    }

    const [lockerPda] = deriveLockerPda(lpMint, creator);
    const [vaultPda] = deriveVaultPda(lockerPda);

    // Get creator's token account
    const creatorTokenAccount = getAssociatedTokenAddressSync(
      lpMint,
      creator,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    // Build instruction data
    // Discriminator (8 bytes) + amount (8 bytes) + lockDuration (8 bytes) + isPermanent (1 byte)
    const discriminator = Buffer.from([0x1a, 0x2b, 0x3c, 0x4d, 0x5e, 0x6f, 0x70, 0x81]); // lock_lp
    const data = Buffer.alloc(25);
    discriminator.copy(data, 0);
    params.amount.toArrayLike(Buffer, 'le', 8).copy(data, 8);
    params.lockDuration.toArrayLike(Buffer, 'le', 8).copy(data, 16);
    data.writeUInt8(params.isPermanent ? 1 : 0, 24);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: creator, isSigner: true, isWritable: true },
        { pubkey: lpMint, isSigner: false, isWritable: false },
        { pubkey: creatorTokenAccount, isSigner: false, isWritable: true },
        { pubkey: lockerPda, isSigner: false, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });

    const transaction = new Transaction().add(instruction);
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creator;

    const signedTx = await this.wallet.signTransaction(transaction);
    return this.connection.sendRawTransaction(signedTx.serialize());
  }

  /**
   * Extend lock duration
   */
  async extendLock(
    lpMint: PublicKey,
    params: ExtendLockParams
  ): Promise<TransactionSignature> {
    const creator = this.wallet.publicKey;
    if (!creator) {
      throw new Error('Wallet not connected');
    }

    const [lockerPda] = deriveLockerPda(lpMint, creator);

    // Build instruction data
    const discriminator = Buffer.from([0x2a, 0x3b, 0x4c, 0x5d, 0x6e, 0x7f, 0x80, 0x91]); // extend_lock
    const data = Buffer.alloc(16);
    discriminator.copy(data, 0);
    params.newReleaseTime.toArrayLike(Buffer, 'le', 8).copy(data, 8);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: creator, isSigner: true, isWritable: false },
        { pubkey: lpMint, isSigner: false, isWritable: false },
        { pubkey: lockerPda, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data,
    });

    const transaction = new Transaction().add(instruction);
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creator;

    const signedTx = await this.wallet.signTransaction(transaction);
    return this.connection.sendRawTransaction(signedTx.serialize());
  }

  /**
   * Unlock LP tokens
   */
  async unlockLp(lpMint: PublicKey): Promise<TransactionSignature> {
    const creator = this.wallet.publicKey;
    if (!creator) {
      throw new Error('Wallet not connected');
    }

    const [lockerPda] = deriveLockerPda(lpMint, creator);
    const [vaultPda] = deriveVaultPda(lockerPda);

    const creatorTokenAccount = getAssociatedTokenAddressSync(
      lpMint,
      creator,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    // Build instruction data
    const discriminator = Buffer.from([0x3a, 0x4b, 0x5c, 0x6d, 0x7e, 0x8f, 0x90, 0xa1]); // unlock_lp

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: creator, isSigner: true, isWritable: true },
        { pubkey: lpMint, isSigner: false, isWritable: false },
        { pubkey: creatorTokenAccount, isSigner: false, isWritable: true },
        { pubkey: lockerPda, isSigner: false, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: discriminator,
    });

    const transaction = new Transaction().add(instruction);
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creator;

    const signedTx = await this.wallet.signTransaction(transaction);
    return this.connection.sendRawTransaction(signedTx.serialize());
  }

  /**
   * Get locker account
   */
  async getLocker(
    lpMint: PublicKey,
    creator: PublicKey
  ): Promise<LockerAccount | null> {
    return getLockerAccount(this.connection, lpMint, creator);
  }

  /**
   * Check Safe Standard compliance
   */
  async checkCompliance(
    mint: string,
    creator?: string
  ): Promise<SafeStandardStatus> {
    return getLockStatus(this.connection, mint, creator);
  }
}
