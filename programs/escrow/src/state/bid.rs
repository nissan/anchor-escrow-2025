//! Ticketfair Bid account definition (Dutch Auction)

use anchor_lang::prelude::*;

#[account]
pub struct Bid {
    pub bidder: Pubkey,
    pub event: Pubkey,
    pub amount: u64,
    pub status: u8, // 0 = Pending, 1 = Awarded, 2 = Refunded
    pub bump: u8,
}

impl Bid {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 1 + 1;
} 