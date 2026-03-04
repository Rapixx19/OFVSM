/**
 * @file lockerPda.ts
 * @summary PDA derivation and account parsing for VECTERAI Locker
 */

import { BN } from '@coral-xyz/anchor';
import { PublicKey, Connection } from '@solana/web3.js';
import { LOCKER_PROGRAM_ID, LOCKER_SEED, VAULT_SEED, type LockerAccount } from '../types/locker';

/**
 * Derive the Locker PDA address
 */
export function deriveLockerPda(lpMint: PublicKey, creator: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(LOCKER_SEED), lpMint.toBuffer(), creator.toBuffer()],
    new PublicKey(LOCKER_PROGRAM_ID)
  );
}

/**
 * Derive the Vault PDA address
 */
export function deriveVaultPda(locker: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED), locker.toBuffer()],
    new PublicKey(LOCKER_PROGRAM_ID)
  );
}

/**
 * Get a locker account by mint and creator
 */
export async function getLockerAccount(
  connection: Connection,
  lpMint: PublicKey,
  creator: PublicKey
): Promise<LockerAccount | null> {
  const [lockerPda] = deriveLockerPda(lpMint, creator);

  try {
    const accountInfo = await connection.getAccountInfo(lockerPda);
    if (!accountInfo) return null;

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
