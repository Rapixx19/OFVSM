/**
 * @file lockerService.ts
 * @summary TypeScript client for VECTERAI Locker program
 */

import { PublicKey, Connection, Transaction, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { LOCKER_PROGRAM_ID, MINIMUM_LOCK_PERIOD, type LockerAccount, type SafeStandardStatus, type LockStatus, type LockLpParams, type ExtendLockParams } from '../types/locker';
import { deriveLockerPda, deriveVaultPda, getLockerAccount } from './lockerPda';

export { deriveLockerPda, deriveVaultPda, getLockerAccount } from './lockerPda';
export { triggerSecurityAlert } from './lockerDatabase';

function calculateLockStatus(locker: LockerAccount): SafeStandardStatus {
  const now = Math.floor(Date.now() / 1000);
  const releaseTime = locker.releaseTime.toNumber();
  const daysRemaining = Math.max(0, Math.ceil((releaseTime - now) / 86400));

  let status: LockStatus;
  if (locker.isUnlocked) status = 'unlocked';
  else if (locker.isPermanent) status = 'permanent';
  else if (now >= releaseTime) status = 'unlockable';
  else status = 'locked';

  const lockDuration = releaseTime - locker.lockedAt.toNumber();
  const isCompliant = !locker.isUnlocked && lockDuration >= MINIMUM_LOCK_PERIOD;

  return { isCompliant, status, daysRemaining: locker.isPermanent ? null : daysRemaining, isPermanent: locker.isPermanent, lockedAmount: locker.amount, releaseTime: new Date(releaseTime * 1000) };
}

export async function getLockStatus(connection: Connection, mint: string, creator?: string): Promise<SafeStandardStatus> {
  const mintPubkey = new PublicKey(mint);
  if (creator) {
    const locker = await getLockerAccount(connection, mintPubkey, new PublicKey(creator));
    if (!locker) return { isCompliant: false, status: 'unlocked', daysRemaining: null, isPermanent: false, lockedAmount: null, releaseTime: null };
    return calculateLockStatus(locker);
  }
  return { isCompliant: false, status: 'unlocked', daysRemaining: null, isPermanent: false, lockedAmount: null, releaseTime: null };
}

interface WalletAdapter {
  publicKey: PublicKey | null;
  signTransaction: <T extends Transaction>(transaction: T) => Promise<T>;
}

export class LockerService {
  constructor(private connection: Connection, private wallet: WalletAdapter, private programId = new PublicKey(LOCKER_PROGRAM_ID)) {}

  async lockLp(lpMint: PublicKey, params: LockLpParams): Promise<string> {
    const creator = this.wallet.publicKey;
    if (!creator) throw new Error('Wallet not connected');

    const [lockerPda] = deriveLockerPda(lpMint, creator);
    const [vaultPda] = deriveVaultPda(lockerPda);
    const creatorTokenAccount = getAssociatedTokenAddressSync(lpMint, creator, false, TOKEN_2022_PROGRAM_ID);

    const discriminator = Buffer.from([0x1a, 0x2b, 0x3c, 0x4d, 0x5e, 0x6f, 0x70, 0x81]);
    const data = Buffer.alloc(25);
    discriminator.copy(data, 0);
    params.amount.toArrayLike(Buffer, 'le', 8).copy(data, 8);
    params.lockDuration.toArrayLike(Buffer, 'le', 8).copy(data, 16);
    data.writeUInt8(params.isPermanent ? 1 : 0, 24);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: creator, isSigner: true, isWritable: true }, { pubkey: lpMint, isSigner: false, isWritable: false },
        { pubkey: creatorTokenAccount, isSigner: false, isWritable: true }, { pubkey: lockerPda, isSigner: false, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true }, { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId, data,
    });

    const transaction = new Transaction().add(instruction);
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creator;
    const signedTx = await this.wallet.signTransaction(transaction);
    return this.connection.sendRawTransaction(signedTx.serialize());
  }

  async extendLock(lpMint: PublicKey, params: ExtendLockParams): Promise<string> {
    const creator = this.wallet.publicKey;
    if (!creator) throw new Error('Wallet not connected');

    const [lockerPda] = deriveLockerPda(lpMint, creator);
    const discriminator = Buffer.from([0x2a, 0x3b, 0x4c, 0x5d, 0x6e, 0x7f, 0x80, 0x91]);
    const data = Buffer.alloc(16);
    discriminator.copy(data, 0);
    params.newReleaseTime.toArrayLike(Buffer, 'le', 8).copy(data, 8);

    const instruction = new TransactionInstruction({
      keys: [{ pubkey: creator, isSigner: true, isWritable: false }, { pubkey: lpMint, isSigner: false, isWritable: false }, { pubkey: lockerPda, isSigner: false, isWritable: true }],
      programId: this.programId, data,
    });

    const transaction = new Transaction().add(instruction);
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creator;
    const signedTx = await this.wallet.signTransaction(transaction);
    return this.connection.sendRawTransaction(signedTx.serialize());
  }

  async unlockLp(lpMint: PublicKey): Promise<string> {
    const creator = this.wallet.publicKey;
    if (!creator) throw new Error('Wallet not connected');

    const [lockerPda] = deriveLockerPda(lpMint, creator);
    const [vaultPda] = deriveVaultPda(lockerPda);
    const creatorTokenAccount = getAssociatedTokenAddressSync(lpMint, creator, false, TOKEN_2022_PROGRAM_ID);
    const discriminator = Buffer.from([0x3a, 0x4b, 0x5c, 0x6d, 0x7e, 0x8f, 0x90, 0xa1]);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: creator, isSigner: true, isWritable: true }, { pubkey: lpMint, isSigner: false, isWritable: false },
        { pubkey: creatorTokenAccount, isSigner: false, isWritable: true }, { pubkey: lockerPda, isSigner: false, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true }, { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: this.programId, data: discriminator,
    });

    const transaction = new Transaction().add(instruction);
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creator;
    const signedTx = await this.wallet.signTransaction(transaction);
    return this.connection.sendRawTransaction(signedTx.serialize());
  }

  async getLocker(lpMint: PublicKey, creator: PublicKey): Promise<LockerAccount | null> {
    return getLockerAccount(this.connection, lpMint, creator);
  }

  async checkCompliance(mint: string, creator?: string): Promise<SafeStandardStatus> {
    return getLockStatus(this.connection, mint, creator);
  }
}
