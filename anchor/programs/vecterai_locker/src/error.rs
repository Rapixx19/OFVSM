//! @file error.rs
//! @summary Custom error types for VECTERAI Locker program
//! @dependencies anchor-lang

use anchor_lang::prelude::*;

/// Custom errors for the VECTERAI Locker program
#[error_code]
pub enum LockerError {
    /// Lock period is shorter than the minimum 90 days
    #[msg("Lock period must be at least 90 days (7776000 seconds)")]
    LockTooShort,

    /// Attempting to unlock before the release time has passed
    #[msg("Lock has not yet expired")]
    LockNotExpired,

    /// Caller is not authorized to perform this action
    #[msg("Unauthorized: Only the creator can perform this action")]
    Unauthorized,

    /// Attempting to unlock a permanent lock
    #[msg("Cannot unlock a permanent lock")]
    PermanentLock,

    /// Lock has already been unlocked
    #[msg("Lock has already been unlocked")]
    AlreadyUnlocked,

    /// Extension time must be greater than current release time
    #[msg("New release time must be after current release time")]
    InvalidExtension,

    /// Invalid LP token mint
    #[msg("Invalid LP token mint")]
    InvalidMint,

    /// Arithmetic overflow error
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
