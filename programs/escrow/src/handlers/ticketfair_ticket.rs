//! Ticketfair ticket instruction handlers

use anchor_lang::prelude::*;
use crate::state::{Ticket, Event};

#[derive(Accounts)]
pub struct BuyTicketAccountConstraints<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub event: Account<'info, Event>,
    #[account(
        init,
        payer = buyer,
        space = Ticket::DISCRIMINATOR.len() + Ticket::INIT_SPACE,
        seeds = [b"ticket", event.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub ticket: Account<'info, Ticket>,
    pub system_program: Program<'info, System>,
}

pub fn buy_ticket(
    context: Context<BuyTicketAccountConstraints>,
    offchain_ref: String,
) -> Result<()> {
    let ticket = &mut context.accounts.ticket;
    ticket.owner = context.accounts.buyer.key();
    ticket.event = context.accounts.event.key();
    ticket.status = 0;
    ticket.offchain_ref = offchain_ref;
    ticket.bump = context.bumps.ticket;
    Ok(())
} 