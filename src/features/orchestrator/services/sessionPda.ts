/**
 * @file sessionPda.ts
 * @summary On-chain session PDA management for Speed Mode
 * @dependencies @solana/web3.js
 */

import {
  PublicKey,
  Keypair,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { SESSION_SEED, DEFAULT_SOL_CAP_LAMPORTS } from '../types/speedMode';

/**
 * Session program ID (placeholder - replace with deployed program)
 */
export const SESSION_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_SESSION_PROGRAM_ID ||
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
);

/**
 * Derive session PDA address
 */
export function deriveSessionPda(
  authority: PublicKey,
  sessionKey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SESSION_SEED),
      authority.toBuffer(),
      sessionKey.toBuffer(),
    ],
    SESSION_PROGRAM_ID
  );
}

/**
 * Generate a new ephemeral keypair for session
 */
export function generateSessionKeypair(): Keypair {
  return Keypair.generate();
}

/**
 * Create instruction to initialize a session PDA
 */
export function createInitSessionInstruction(
  authority: PublicKey,
  sessionKey: PublicKey,
  solCapLamports: number = DEFAULT_SOL_CAP_LAMPORTS,
  durationSeconds: number = 24 * 60 * 60
): TransactionInstruction {
  const [sessionPda] = deriveSessionPda(authority, sessionKey);

  // Instruction data: discriminator + sol_cap + duration
  const data = Buffer.alloc(24);
  // Init session discriminator
  Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]).copy(data, 0);
  data.writeBigUInt64LE(BigInt(solCapLamports), 8);
  data.writeBigInt64LE(BigInt(durationSeconds), 16);

  return new TransactionInstruction({
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: sessionKey, isSigner: false, isWritable: false },
      { pubkey: sessionPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: SESSION_PROGRAM_ID,
    data,
  });
}

/**
 * Create instruction to revoke a session
 */
export function createRevokeSessionInstruction(
  authority: PublicKey,
  sessionKey: PublicKey
): TransactionInstruction {
  const [sessionPda] = deriveSessionPda(authority, sessionKey);

  // Revoke discriminator
  const data = Buffer.from([0x02, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);

  return new TransactionInstruction({
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: sessionPda, isSigner: false, isWritable: true },
    ],
    programId: SESSION_PROGRAM_ID,
    data,
  });
}

/**
 * Encrypt secret key with wallet signature
 */
export async function encryptSecretKey(
  secretKey: Uint8Array,
  encryptionKey: CryptoKey
): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  // Create a copy to ensure we have a proper ArrayBuffer
  const secretKeyBuffer = new Uint8Array(secretKey).buffer;
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    secretKeyBuffer
  );

  // Prepend IV to encrypted data
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);

  return result.buffer;
}

/**
 * Decrypt secret key
 */
export async function decryptSecretKey(
  encryptedData: ArrayBuffer,
  encryptionKey: CryptoKey
): Promise<Uint8Array> {
  const data = new Uint8Array(encryptedData);
  const iv = data.slice(0, 12);
  const encrypted = data.slice(12);
  // Create a copy to ensure we have a proper ArrayBuffer
  const encryptedBuffer = new Uint8Array(encrypted).buffer;

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    encryptedBuffer
  );

  return new Uint8Array(decrypted);
}

/**
 * Derive encryption key from wallet signature
 */
export async function deriveEncryptionKey(
  signature: Uint8Array
): Promise<CryptoKey> {
  // Create a copy to ensure we have a proper ArrayBuffer
  const sigBuffer = new Uint8Array(signature.slice(0, 32)).buffer;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    sigBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const salt = new TextEncoder().encode('vecterai-speed-mode');
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt).buffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
