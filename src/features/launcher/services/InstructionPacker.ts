/**
 * @file InstructionPacker.ts
 * @summary LP lock instruction builder for VECTERAI Locker
 * @dependencies @solana/web3.js
 */

import {
  TransactionInstruction,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { LOCKER_PROGRAM_ID } from '../constants/addresses';
import { MINIMUM_LOCK_PERIOD } from '../../locker/types/locker';

/**
 * Parameters for creating lock LP instruction
 */
export interface LockInstructionParams {
  creator: PublicKey;
  lpMint: PublicKey;
  creatorLpAccount: PublicKey;
  locker: PublicKey;
  vault: PublicKey;
  lockDurationDays: number;
  isPermanent: boolean;
}

/**
 * Create lock LP instruction for VECTERAI Locker program
 */
export function createLockLpInstruction(
  params: LockInstructionParams
): TransactionInstruction {
  const {
    creator,
    lpMint,
    creatorLpAccount,
    locker,
    vault,
    lockDurationDays,
    isPermanent,
  } = params;

  // Calculate lock duration in seconds
  const lockDurationSeconds =
    lockDurationDays === -1
      ? MINIMUM_LOCK_PERIOD
      : lockDurationDays * 24 * 60 * 60;

  // Build instruction data
  // Discriminator (8 bytes) + amount (8 bytes) + lockDuration (8 bytes) + isPermanent (1 byte)
  const discriminator = Buffer.from([
    0x1a, 0x2b, 0x3c, 0x4d, 0x5e, 0x6f, 0x70, 0x81,
  ]);
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
