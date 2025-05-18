//! Ticketfair User account definition

use anchor_lang::prelude::*;

#[account]
pub struct User {
    pub authority: Pubkey,
    pub tickets_purchased: u32,
    pub events_created: u32,
    // Add more fields as needed
} 