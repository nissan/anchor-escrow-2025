//! Ticketfair Event account definition (Dutch Auction)

use anchor_lang::prelude::*;

#[account]
pub struct Event {
    /// The event organizer
    pub organizer: Pubkey,
    /// Off-chain metadata reference (e.g., Walrus blob URL)
    pub metadata_url: String,
    /// Total number of tickets available
    pub ticket_supply: u32,
    /// Number of tickets awarded so far
    pub tickets_awarded: u32,
    /// Starting price for Dutch auction (in lamports)
    pub start_price: u64,
    /// Ending price for Dutch auction (in lamports)
    pub end_price: u64,
    /// Auction start time (Unix timestamp)
    pub auction_start_time: i64,
    /// Auction end time (Unix timestamp)
    pub auction_end_time: i64,
    /// The price at which the auction closed (set when auction ends, 0 if not finalized)
    pub auction_close_price: u64,
    /// Current status (0 = Created, 1 = Active, 2 = Finalized, 3 = Cancelled)
    pub status: u8,
    /// PDA bump
    pub bump: u8,
    /// Bubblegum Merkle Tree address for cNFTs
    pub merkle_tree: Pubkey,
    /// Asset IDs of cNFTs minted for this event (max 1000 tickets)
    pub cnft_asset_ids: Vec<Pubkey>, // #[max_len = 1000]
}

impl Event {
    pub const MAX_METADATA_URL_LEN: usize = 200;
    pub const MAX_TICKETS: usize = 1000;
    pub const INIT_SPACE: usize = 32 + 4 + Self::MAX_METADATA_URL_LEN + 4 + 4 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 32 + 4 + (32 * Self::MAX_TICKETS);

    /// Calculate the current auction price based on the event parameters and the given timestamp.
    pub fn get_current_auction_price(&self, now: i64) -> u64 {
        if now <= self.auction_start_time {
            self.start_price
        } else if now >= self.auction_end_time {
            self.end_price
        } else {
            let elapsed = now - self.auction_start_time;
            let duration = self.auction_end_time - self.auction_start_time;
            let price_diff = self.start_price.saturating_sub(self.end_price);
            self.start_price - ((price_diff as i64 * elapsed) / duration) as u64
        }
    }
} 