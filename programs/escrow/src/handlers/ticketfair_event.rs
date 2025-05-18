//! Ticketfair event instruction handlers

use anchor_lang::prelude::*;
use crate::state::Event;

#[derive(Accounts)]
pub struct CreateEventAccountConstraints<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
    #[account(
        init,
        payer = organizer,
        space = Event::DISCRIMINATOR.len() + Event::INIT_SPACE,
        seeds = [b"event", organizer.key().as_ref()],
        bump
    )]
    pub event: Account<'info, Event>,
    pub system_program: Program<'info, System>,
}

pub fn create_event(
    context: Context<CreateEventAccountConstraints>,
    metadata_url: String,
    ticket_supply: u32,
    ticket_price: u64,
) -> Result<()> {
    let event = &mut context.accounts.event;
    event.organizer = context.accounts.organizer.key();
    event.metadata_url = metadata_url;
    event.ticket_supply = ticket_supply;
    event.ticket_price = ticket_price;
    event.status = 0;
    event.bump = context.bumps.event;
    Ok(())
} 