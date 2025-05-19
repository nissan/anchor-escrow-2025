//! Ticketfair Ticket account definition

use anchor_lang::prelude::*;
use crate::constants::*;

#[account]
pub struct Ticket {
    pub owner: Pubkey,
    pub event: Pubkey,
    pub status: u8, // Use constants: TICKET_STATUS_OWNED, TICKET_STATUS_CLAIMED, TICKET_STATUS_REFUNDED
    pub offchain_ref: String, // Walrus blob or metadata URL
    pub bump: u8,
    /// The cNFT asset ID for this ticket (Bubblegum)
    pub cnft_asset_id: Pubkey,
}

impl Ticket {
    pub const INIT_SPACE: usize = 32 + 32 + 1 + 4 + MAX_METADATA_URL_LEN + 1 + 32;
    
    /// Check if the ticket can be claimed
    pub fn can_claim(&self) -> bool {
        // Only owned tickets can be claimed
        self.status == TICKET_STATUS_OWNED
    }
    
    /// Check if the ticket can be refunded
    pub fn can_refund(&self) -> bool {
        // Only owned tickets can be refunded
        self.status == TICKET_STATUS_OWNED
    }
}