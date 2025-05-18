//! Ticketfair Ticket account definition

use anchor_lang::prelude::*;

#[account]
pub struct Ticket {
    pub owner: Pubkey,
    pub event: Pubkey,
    pub status: u8, // 0 = Owned, 1 = Claimed, 2 = Refunded
    pub offchain_ref: String, // Walrus blob or metadata URL
    // Add more fields as needed
} 