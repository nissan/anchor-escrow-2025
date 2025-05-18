//! Ticketfair event instruction handlers

use anchor_lang::prelude::*;
use crate::state::Event;

#[derive(Accounts)]
pub struct CreateEvent<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
    #[account(init, payer = organizer, space = 8 + 128)] // Adjust space as needed
    pub event: Account<'info, Event>,
    pub system_program: Program<'info, System>,
}

pub fn create_event(_ctx: Context<CreateEvent>, _metadata_url: String, _ticket_supply: u32, _ticket_price: u64) -> Result<()> {
    // TODO: Implement event creation logic
    Ok(())
} 