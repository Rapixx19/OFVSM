/**
 * @file profileService.ts
 * @summary Supabase profile CRUD operations for user authentication
 * @dependencies @/lib/supabase/client, @/types, @/types/database
 */

import { createClient } from '@/lib/supabase/client';
import type { Profile, LegalShieldStatus, UserRole } from '@/types';
import type { ProfileRow } from '@/types/database';

/**
 * Current Legal Shield version for compliance tracking
 * Update this when terms change to require re-acceptance
 */
export const CURRENT_LEGAL_SHIELD_VERSION = '2026.1.0';

/**
 * Converts database row to Profile type
 */
function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    role: row.role as UserRole,
    legalShieldStatus: row.legal_shield_status as LegalShieldStatus,
    legalShieldAcceptedAt: row.legal_shield_accepted_at
      ? new Date(row.legal_shield_accepted_at)
      : undefined,
    legalShieldVersion: row.legal_shield_version ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Fetches a profile by wallet address
 * @param walletAddress - Solana wallet address
 * @returns Profile if found, null otherwise
 */
export async function getProfileByWallet(
  walletAddress: string
): Promise<Profile | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - profile doesn't exist
      return null;
    }
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  if (!data || !('id' in data)) {
    return null;
  }

  return toProfile(data as ProfileRow);
}

/**
 * Creates a new profile for a wallet address
 * @param walletAddress - Solana wallet address
 * @returns Newly created Profile
 */
export async function createProfile(walletAddress: string): Promise<Profile> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      wallet_address: walletAddress,
      role: 'public',
      legal_shield_status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create profile: ${error.message}`);
  }

  if (!data || !('id' in data)) {
    throw new Error('Failed to create profile: No data returned');
  }

  return toProfile(data as ProfileRow);
}

/**
 * Updates a profile to accept the Legal Shield
 * @param walletAddress - Solana wallet address
 * @returns Updated Profile
 */
export async function acceptLegalShield(
  walletAddress: string
): Promise<Profile> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      legal_shield_status: 'accepted',
      legal_shield_accepted_at: new Date().toISOString(),
      legal_shield_version: CURRENT_LEGAL_SHIELD_VERSION,
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_address', walletAddress)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to accept legal shield: ${error.message}`);
  }

  if (!data || !('id' in data)) {
    throw new Error('Failed to accept legal shield: No data returned');
  }

  return toProfile(data as ProfileRow);
}

/**
 * Gets an existing profile or creates a new one
 * @param walletAddress - Solana wallet address
 * @returns Profile (existing or newly created)
 */
export async function getOrCreateProfile(
  walletAddress: string
): Promise<Profile> {
  const existing = await getProfileByWallet(walletAddress);

  if (existing) {
    return existing;
  }

  return createProfile(walletAddress);
}

/**
 * Declines the Legal Shield for a wallet address
 * @param walletAddress - Solana wallet address
 * @returns Updated Profile
 */
export async function declineLegalShield(
  walletAddress: string
): Promise<Profile> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      legal_shield_status: 'declined',
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_address', walletAddress)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to decline legal shield: ${error.message}`);
  }

  if (!data || !('id' in data)) {
    throw new Error('Failed to decline legal shield: No data returned');
  }

  return toProfile(data as ProfileRow);
}
