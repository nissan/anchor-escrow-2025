//! Ticketfair Event account definition (Dutch Auction)

use anchor_lang::prelude::*;
use crate::constants::*;

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
    pub const INIT_SPACE: usize = 32 + // organizer pubkey
                               4 + MAX_METADATA_URL_LEN + // metadata_url string
                               4 + // ticket_supply
                               4 + // tickets_awarded
                               8 + // start_price
                               8 + // end_price
                               8 + // auction_start_time
                               8 + // auction_end_time
                               8 + // auction_close_price
                               1 + // status 
                               1 + // bump
                               32 + // merkle_tree
                               4 + (32 * MAX_TICKETS_TEST_MODE as usize); // cnft_asset_ids vector

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

    /// Check if the auction is within the valid time window for bidding
    pub fn is_active_for_bidding(&self, now: i64) -> bool {
        self.status == EVENT_STATUS_ACTIVE && 
        now >= self.auction_start_time && 
        now <= self.auction_end_time
    }

    /// Check if the auction is in a valid state for finalizing (setting close price)
    pub fn can_finalize(&self, now: i64) -> bool {
        self.status == EVENT_STATUS_ACTIVE && 
        now >= self.auction_end_time &&
        self.auction_close_price == 0
    }
}