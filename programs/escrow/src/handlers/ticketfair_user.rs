//! Ticketfair user instruction handlers

use anchor_lang::prelude::*;
use crate::state::User;

#[derive(Accounts)]
pub struct CreateUser<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = 8 + 32)] // Adjust space as needed
    pub user: Account<'info, User>,
    pub system_program: Program<'info, System>,
}

pub fn create_user(_ctx: Context<CreateUser>) -> Result<()> {
    // TODO: Implement user account creation logic
    Ok(())
} 