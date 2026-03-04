//! @file state.rs
//! @summary Account structures for VECTERAI Locker program
//! @dependencies anchor-lang

use anchor_lang::prelude::*;

/// Minimum lock period in seconds (90 days)
pub const MINIMUM_LOCK_PERIOD: i64 = 7_776_000; // 90 * 24 * 60 * 60

/// Seed prefix for Locker PDA
pub const LOCKER_SEED: &[u8] = b"locker";

/// Seed prefix for Vault PDA
pub const VAULT_SEED: &[u8] = b"vault";

/// Locker account that tracks LP token locks
#[account]
#[derive(Default)]
pub struct Locker {
    /// The wallet address of the lock creator
    pub creator: Pubkey,

    /// The LP token mint address
    pub lp_mint: Pubkey,

    /// The vault PDA that holds the locked tokens
    pub vault: Pubkey,

    /// Amount of LP tokens locked
    pub amount: u64,

    /// Unix timestamp when the lock was created
    pub locked_at: i64,

    /// Unix timestamp when tokens can be withdrawn
    pub release_time: i64,

    /// Whether this is a permanent lock (cannot be unlocked)
    pub is_permanent: bool,

    /// Whether the tokens have been unlocked/withdrawn
    pub is_unlocked: bool,

    /// Bump seed for the Locker PDA
    pub bump: u8,

    /// Bump seed for the Vault PDA
    pub vault_bump: u8,

    /// Reserved space for future upgrades
    pub _reserved: [u8; 64],
}

impl Locker {
    /// Space required for the Locker account
    /// 8 (discriminator) + 32 + 32 + 32 + 8 + 8 + 8 + 1 + 1 + 1 + 1 + 64 = 196 bytes
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 1 + 1 + 1 + 1 + 64;

    /// Check if the lock has expired
    pub fn is_expired(&self, current_time: i64) -> bool {
        current_time >= self.release_time
    }

    /// Check if the lock can be unlocked
    pub fn can_unlock(&self, current_time: i64) -> bool {
        !self.is_permanent && !self.is_unlocked && self.is_expired(current_time)
    }
}
