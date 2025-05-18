//! Ticketfair Ticket account definition

use anchor_lang::prelude::*;

#[account]
pub struct Ticket {
    pub owner: Pubkey,
    pub event: Pubkey,
    pub status: u8, // 0 = Owned, 1 = Claimed, 2 = Refunded
    pub offchain_ref: String, // Walrus blob or metadata URL
    pub bump: u8,
    /// The cNFT asset ID for this ticket (Bubblegum)
    pub cnft_asset_id: Pubkey,
}

impl Ticket {
    pub const MAX_OFFCHAIN_REF_LEN: usize = 200;
    pub const INIT_SPACE: usize = 32 + 32 + 1 + 4 + Self::MAX_OFFCHAIN_REF_LEN + 1 + 32;
} 