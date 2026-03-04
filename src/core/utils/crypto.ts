/**
 * @file crypto.ts
 * @summary Cryptographic utilities for address formatting
 */

/**
 * Truncate wallet address to 4-4 pattern
 * @example truncateAddress("Ev1LxyzAbCdEfGhIjKlMnOpQrStUvWx") → "Ev1L...vWxY"
 */
export function truncateAddress(address: string): string {
  if (!address || address.length < 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
