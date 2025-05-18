//! Ticketfair Event account definition

use anchor_lang::prelude::*;

#[account]
pub struct Event {
    pub organizer: Pubkey,
    pub metadata_url: String, // Off-chain metadata reference
    pub ticket_supply: u32,
    pub ticket_price: u64,
    pub status: u8, // 0 = Created, 1 = Active, 2 = Finalized, 3 = Cancelled
    // Add more fields as needed
} 