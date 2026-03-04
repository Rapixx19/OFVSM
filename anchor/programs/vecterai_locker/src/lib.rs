//! @file lib.rs
//! @summary VECTERAI Locker Program - LP Token Locking for Safe Standard Compliance
//! @dependencies anchor-lang, anchor-spl, spl-token-2022
//!
//! This program provides secure LP token locking with enforced minimum periods
//! to ensure Safe Standard compliance for token launches on the VECTERAI platform.

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::{self, Token2022, TransferChecked},
    token_interface::{Mint, TokenAccount},
};

pub mod error;
pub mod state;

use error::LockerError;
use state::{Locker, LOCKER_SEED, MINIMUM_LOCK_PERIOD, VAULT_SEED};

declare_id!("Lock1111111111111111111111111111111111111111");

#[program]
pub mod vecterai_locker {
    use super::*;

    /// Lock LP tokens in a PDA-owned vault
    ///
    /// # Arguments
    /// * `ctx` - The context containing all accounts
    /// * `amount` - Amount of LP tokens to lock
    /// * `lock_duration` - Lock duration in seconds (minimum 90 days)
    /// * `is_permanent` - Whether this is a permanent lock
    ///
    /// # Errors
    /// * `LockerError::LockTooShort` - If lock duration is less than 90 days
    pub fn lock_lp(
        ctx: Context<LockLp>,
        amount: u64,
        lock_duration: i64,
        is_permanent: bool,
    ) -> Result<()> {
        // Enforce minimum lock period of 90 days
        require!(
            lock_duration >= MINIMUM_LOCK_PERIOD,
            LockerError::LockTooShort
        );

        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        // Calculate release time
        let release_time = current_time
            .checked_add(lock_duration)
            .ok_or(LockerError::ArithmeticOverflow)?;

        // Initialize the locker account
        let locker = &mut ctx.accounts.locker;
        locker.creator = ctx.accounts.creator.key();
        locker.lp_mint = ctx.accounts.lp_mint.key();
        locker.vault = ctx.accounts.vault.key();
        locker.amount = amount;
        locker.locked_at = current_time;
        locker.release_time = release_time;
        locker.is_permanent = is_permanent;
        locker.is_unlocked = false;
        locker.bump = ctx.bumps.locker;
        locker.vault_bump = ctx.bumps.vault;

        // Transfer LP tokens from creator to vault using Token-2022
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.creator_token_account.to_account_info(),
            mint: ctx.accounts.lp_mint.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.creator.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token_2022::transfer_checked(cpi_ctx, amount, ctx.accounts.lp_mint.decimals)?;

        msg!(
            "Locked {} LP tokens until timestamp {}",
            amount,
            release_time
        );

        Ok(())
    }

    /// Extend the lock duration
    ///
    /// # Arguments
    /// * `ctx` - The context containing all accounts
    /// * `new_release_time` - The new release timestamp (must be after current release time)
    ///
    /// # Errors
    /// * `LockerError::Unauthorized` - If caller is not the creator
    /// * `LockerError::AlreadyUnlocked` - If tokens have been withdrawn
    /// * `LockerError::InvalidExtension` - If new time is not after current release time
    pub fn extend_lock(ctx: Context<ExtendLock>, new_release_time: i64) -> Result<()> {
        let locker = &mut ctx.accounts.locker;

        // Verify caller is the creator
        require!(
            ctx.accounts.creator.key() == locker.creator,
            LockerError::Unauthorized
        );

        // Cannot extend an already unlocked lock
        require!(!locker.is_unlocked, LockerError::AlreadyUnlocked);

        // New release time must be after current release time
        require!(
            new_release_time > locker.release_time,
            LockerError::InvalidExtension
        );

        let old_release_time = locker.release_time;
        locker.release_time = new_release_time;

        msg!(
            "Extended lock from {} to {}",
            old_release_time,
            new_release_time
        );

        Ok(())
    }

    /// Unlock and withdraw LP tokens after the release time
    ///
    /// # Arguments
    /// * `ctx` - The context containing all accounts
    ///
    /// # Errors
    /// * `LockerError::Unauthorized` - If caller is not the creator
    /// * `LockerError::PermanentLock` - If the lock is permanent
    /// * `LockerError::LockNotExpired` - If current time is before release time
    /// * `LockerError::AlreadyUnlocked` - If tokens have already been withdrawn
    pub fn unlock_lp(ctx: Context<UnlockLp>) -> Result<()> {
        let locker = &mut ctx.accounts.locker;

        // Verify caller is the creator
        require!(
            ctx.accounts.creator.key() == locker.creator,
            LockerError::Unauthorized
        );

        // Cannot unlock a permanent lock
        require!(!locker.is_permanent, LockerError::PermanentLock);

        // Cannot unlock twice
        require!(!locker.is_unlocked, LockerError::AlreadyUnlocked);

        // Check if lock has expired
        let clock = Clock::get()?;
        require!(
            locker.can_unlock(clock.unix_timestamp),
            LockerError::LockNotExpired
        );

        // Mark as unlocked
        locker.is_unlocked = true;

        // Transfer tokens back to creator using PDA signer seeds
        let lp_mint_key = locker.lp_mint;
        let creator_key = locker.creator;
        let locker_bump = locker.bump;

        let seeds = &[
            LOCKER_SEED,
            lp_mint_key.as_ref(),
            creator_key.as_ref(),
            &[locker_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = TransferChecked {
            from: ctx.accounts.vault.to_account_info(),
            mint: ctx.accounts.lp_mint.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: ctx.accounts.locker.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        token_2022::transfer_checked(
            cpi_ctx,
            locker.amount,
            ctx.accounts.lp_mint.decimals,
        )?;

        msg!("Unlocked {} LP tokens", locker.amount);

        Ok(())
    }
}

/// Accounts for the lock_lp instruction
#[derive(Accounts)]
pub struct LockLp<'info> {
    /// The creator/owner of the lock
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The LP token mint (Token-2022)
    #[account(
        mint::token_program = token_program,
    )]
    pub lp_mint: InterfaceAccount<'info, Mint>,

    /// The creator's LP token account
    #[account(
        mut,
        associated_token::mint = lp_mint,
        associated_token::authority = creator,
        associated_token::token_program = token_program,
    )]
    pub creator_token_account: InterfaceAccount<'info, TokenAccount>,

    /// The locker PDA account (created)
    #[account(
        init,
        payer = creator,
        space = Locker::SPACE,
        seeds = [LOCKER_SEED, lp_mint.key().as_ref(), creator.key().as_ref()],
        bump,
    )]
    pub locker: Account<'info, Locker>,

    /// The vault PDA token account (created)
    #[account(
        init,
        payer = creator,
        seeds = [VAULT_SEED, locker.key().as_ref()],
        bump,
        token::mint = lp_mint,
        token::authority = locker,
        token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    /// Token-2022 program
    pub token_program: Program<'info, Token2022>,

    /// Associated Token program
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Accounts for the extend_lock instruction
#[derive(Accounts)]
pub struct ExtendLock<'info> {
    /// The creator/owner of the lock
    pub creator: Signer<'info>,

    /// The LP token mint
    pub lp_mint: InterfaceAccount<'info, Mint>,

    /// The locker PDA account
    #[account(
        mut,
        seeds = [LOCKER_SEED, lp_mint.key().as_ref(), creator.key().as_ref()],
        bump = locker.bump,
        constraint = locker.creator == creator.key() @ LockerError::Unauthorized,
    )]
    pub locker: Account<'info, Locker>,
}

/// Accounts for the unlock_lp instruction
#[derive(Accounts)]
pub struct UnlockLp<'info> {
    /// The creator/owner of the lock
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The LP token mint (Token-2022)
    #[account(
        mint::token_program = token_program,
    )]
    pub lp_mint: InterfaceAccount<'info, Mint>,

    /// The creator's LP token account
    #[account(
        mut,
        associated_token::mint = lp_mint,
        associated_token::authority = creator,
        associated_token::token_program = token_program,
    )]
    pub creator_token_account: InterfaceAccount<'info, TokenAccount>,

    /// The locker PDA account
    #[account(
        mut,
        seeds = [LOCKER_SEED, lp_mint.key().as_ref(), creator.key().as_ref()],
        bump = locker.bump,
        constraint = locker.creator == creator.key() @ LockerError::Unauthorized,
    )]
    pub locker: Account<'info, Locker>,

    /// The vault PDA token account
    #[account(
        mut,
        seeds = [VAULT_SEED, locker.key().as_ref()],
        bump = locker.vault_bump,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    /// Token-2022 program
    pub token_program: Program<'info, Token2022>,
}
