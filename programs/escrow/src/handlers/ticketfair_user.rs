//! Ticketfair user instruction handlers

use anchor_lang::prelude::*;
use crate::state::User;

#[derive(Accounts)]
pub struct CreateUserAccountConstraints<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = User::DISCRIMINATOR.len() + User::INIT_SPACE,
        seeds = [b"user", authority.key().as_ref()],
        bump
    )]
    pub user: Account<'info, User>,
    pub system_program: Program<'info, System>,
}

pub fn create_user(
    context: Context<CreateUserAccountConstraints>,
) -> Result<()> {
    let user = &mut context.accounts.user;
    user.authority = context.accounts.authority.key();
    user.tickets_purchased = 0;
    user.events_created = 0;
    user.bump = context.bumps.user;
    Ok(())
} 