//! Ticketfair Bid account definition (Dutch Auction)

use anchor_lang::prelude::*;
use crate::constants::*;

#[account]
pub struct Bid {
    pub bidder: Pubkey,
    pub event: Pubkey,
    pub amount: u64,
    pub status: u8, // Use constants: BID_STATUS_PENDING, BID_STATUS_AWARDED, BID_STATUS_REFUNDED
    pub bump: u8,
}

impl Bid {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 1 + 1;

    /// Check if the bid can be refunded
    pub fn can_refund(&self) -> bool {
        // Only allow refund if not already refunded
        self.status != BID_STATUS_REFUNDED
    }

    /// Check if the bid can be awarded a ticket
    pub fn can_award(&self) -> bool {
        // Only pending bids can be awarded
        self.status == BID_STATUS_PENDING
    }
}