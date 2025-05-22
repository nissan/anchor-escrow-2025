use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;
use anchor_lang::prelude::Pubkey;
use anchor_lang::prelude::ToAccountInfo;
use anchor_lang::prelude::Signer;
use anchor_lang::prelude::Account;
use anchor_lang::prelude::System;
use anchor_lang::prelude::Context;
use anchor_lang::prelude::Result;

// Import program state
use escrow::state;
use escrow::constants::*;

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::prelude::*;
    use anchor_lang::solana_program::clock::Clock;
    use anchor_lang::solana_program::sysvar;
    use anchor_lang::ToAccountInfos;
    use anchor_lang::prelude::Signer;
    use anchor_lang::prelude::Account;
    use anchor_lang::prelude::System;
    use anchor_lang::prelude::Context;
    use anchor_lang::prelude::Result;
    use std::str::FromStr;

    // Helper: Generate a test pubkey
    fn test_pubkey(seed: u8) -> Pubkey {
        Pubkey::new_from_array([seed; 32])
    }

    // Helper: Get a test clock time
    fn test_time() -> i64 {
        1_700_000_000 // Fixed timestamp for deterministic tests
    }

    #[test]
    fn test_event_creation() {
        // Simulate event creation with valid parameters
        let organizer = test_pubkey(1);
        let merkle_tree = test_pubkey(2);
        let metadata_url = "https://example.com/event.json".to_string();
        let ticket_supply = 10u32;
        let start_price = 1_000_000;
        let end_price = 100_000;
        let auction_start_time = test_time();
        let auction_end_time = auction_start_time + 3600;

        // Simulate event account
        let mut event = state::Event {
            organizer,
            metadata_url: metadata_url.clone(),
            ticket_supply,
            tickets_awarded: 0,
            start_price,
            end_price,
            auction_start_time,
            auction_end_time,
            auction_close_price: 0,
            status: EVENT_STATUS_CREATED,
            bump: 255,
            merkle_tree,
            cnft_asset_ids: vec![],
        };

        // Assert event fields
        assert_eq!(event.organizer, organizer);
        assert_eq!(event.metadata_url, metadata_url);
        assert_eq!(event.ticket_supply, ticket_supply);
        assert_eq!(event.tickets_awarded, 0);
        assert_eq!(event.start_price, start_price);
        assert_eq!(event.end_price, end_price);
        assert_eq!(event.auction_start_time, auction_start_time);
        assert_eq!(event.auction_end_time, auction_end_time);
        assert_eq!(event.status, EVENT_STATUS_CREATED);
        assert_eq!(event.merkle_tree, merkle_tree);
        // Asset IDs should be empty at creation
        assert!(event.cnft_asset_ids.is_empty());
    }

    #[test]
    fn test_event_activation() {
        // Simulate event account
        let mut event = state::Event {
            organizer: test_pubkey(1),
            metadata_url: "https://example.com/event.json".to_string(),
            ticket_supply: 10,
            tickets_awarded: 0,
            start_price: 1_000_000,
            end_price: 100_000,
            auction_start_time: test_time(),
            auction_end_time: test_time() + 3600,
            auction_close_price: 0,
            status: EVENT_STATUS_CREATED,
            bump: 255,
            merkle_tree: test_pubkey(2),
            cnft_asset_ids: vec![],
        };

        // Test activation
        assert_eq!(event.status, EVENT_STATUS_CREATED);
        event.status = EVENT_STATUS_ACTIVE;
        assert_eq!(event.status, EVENT_STATUS_ACTIVE);
    }

    #[test]
    fn test_bid_placement() {
        // Simulate placing a valid bid
        let bidder = test_pubkey(3);
        let event = test_pubkey(4);
        let amount = 1_000_000u64;
        let mut bid = state::Bid {
            bidder,
            event,
            amount,
            status: BID_STATUS_PENDING,
            bump: 254,
        };
        // Assert bid fields
        assert_eq!(bid.bidder, bidder);
        assert_eq!(bid.event, event);
        assert_eq!(bid.amount, amount);
        assert_eq!(bid.status, BID_STATUS_PENDING);
        
        // Test helper method
        assert!(bid.can_award());
        assert!(bid.can_refund());
    }

    #[test]
    fn test_ticket_awarding() {
        // Simulate awarding a ticket
        let owner = test_pubkey(5);
        let event = test_pubkey(6);
        let cnft_asset_id = test_pubkey(7);
        let mut ticket = state::Ticket {
            owner,
            event,
            status: TICKET_STATUS_OWNED,
            offchain_ref: String::new(),
            bump: 253,
            cnft_asset_id,
        };
        // Assert ticket fields
        assert_eq!(ticket.owner, owner);
        assert_eq!(ticket.event, event);
        assert_eq!(ticket.status, TICKET_STATUS_OWNED);
        assert_eq!(ticket.cnft_asset_id, cnft_asset_id);
        
        // Test helper methods
        assert!(ticket.can_claim());
        assert!(ticket.can_refund());
    }

    #[test]
    fn test_finalize_auction() {
        // Simulate event account
        let mut event = state::Event {
            organizer: test_pubkey(1),
            metadata_url: "https://example.com/event.json".to_string(),
            ticket_supply: 10,
            tickets_awarded: 5, // Some tickets awarded
            start_price: 1_000_000,
            end_price: 100_000,
            auction_start_time: test_time() - 7200, // 2 hours ago
            auction_end_time: test_time() - 3600, // 1 hour ago (auction ended)
            auction_close_price: 0, // Not finalized yet
            status: EVENT_STATUS_ACTIVE,
            bump: 255,
            merkle_tree: test_pubkey(2),
            cnft_asset_ids: vec![],
        };
        
        // Test finalization condition
        assert!(event.can_finalize(test_time())); // Should be finalizable now
        
        // Finalize auction
        let close_price = 500_000; // Between start and end price
        event.auction_close_price = close_price;
        event.status = EVENT_STATUS_FINALIZED;
        
        // Verify the auction is finalized
        assert_eq!(event.auction_close_price, close_price);
        assert_eq!(event.status, EVENT_STATUS_FINALIZED);
        assert!(!event.can_finalize(test_time())); // Cannot finalize again
    }

    #[test]
    fn test_dutch_auction_pricing() {
        // Create an event with a 1-hour auction
        let start_time = test_time();
        let end_time = start_time + 3600; // 1 hour duration
        let start_price = 1_000_000;
        let end_price = 100_000;
        
        let event = state::Event {
            organizer: test_pubkey(1),
            metadata_url: "https://example.com/event.json".to_string(),
            ticket_supply: 10,
            tickets_awarded: 0,
            start_price,
            end_price,
            auction_start_time: start_time,
            auction_end_time: end_time,
            auction_close_price: 0,
            status: EVENT_STATUS_ACTIVE,
            bump: 255,
            merkle_tree: test_pubkey(2),
            cnft_asset_ids: vec![],
        };
        
        // Test pricing at different times
        assert_eq!(event.get_current_auction_price(start_time - 1), start_price); // Before auction
        assert_eq!(event.get_current_auction_price(start_time), start_price); // At auction start
        assert_eq!(event.get_current_auction_price(end_time), end_price); // At auction end
        assert_eq!(event.get_current_auction_price(end_time + 1), end_price); // After auction
        
        // Test pricing at halfway point
        let halfway_time = start_time + 1800; // 30 minutes in
        let expected_halfway_price = 550_000; // Half between start and end price
        assert_eq!(event.get_current_auction_price(halfway_time), expected_halfway_price);
        
        // Test pricing at quarter points
        let quarter_time = start_time + 900; // 15 minutes in
        let expected_quarter_price = 775_000; // 1/4 between start and end price
        assert_eq!(event.get_current_auction_price(quarter_time), expected_quarter_price);
        
        let three_quarter_time = start_time + 2700; // 45 minutes in
        let expected_three_quarter_price = 325_000; // 3/4 between start and end price
        assert_eq!(event.get_current_auction_price(three_quarter_time), expected_three_quarter_price);
    }

    #[test]
    fn test_refunds() {
        // Simulate a full refund for a losing bid
        let mut bid = state::Bid {
            bidder: test_pubkey(8),
            event: test_pubkey(9),
            amount: 2_000_000,
            status: BID_STATUS_PENDING, // Pending
            bump: 252,
        };
        // Refund logic: losing bid
        bid.status = BID_STATUS_REFUNDED; // Refunded
        assert_eq!(bid.status, BID_STATUS_REFUNDED);
        assert!(!bid.can_refund()); // Can't refund again
        
        // Create event to simulate a finalized auction
        let mut event = state::Event {
            organizer: test_pubkey(10),
            metadata_url: "https://example.com/event2.json".to_string(),
            ticket_supply: 10,
            tickets_awarded: 5,
            start_price: 2_000_000,
            end_price: 1_000_000,
            auction_start_time: test_time() - 7200,
            auction_end_time: test_time() - 3600,
            auction_close_price: 1_500_000, // Auction finalized with this price
            status: EVENT_STATUS_FINALIZED,
            bump: 251,
            merkle_tree: test_pubkey(11),
            cnft_asset_ids: vec![],
        };

        // Simulate a partial refund for a winning bid (overbid)
        let mut awarded_bid = state::Bid {
            bidder: test_pubkey(12),
            event: event.merkle_tree,
            amount: 2_000_000, // Bid was at this higher amount
            status: BID_STATUS_AWARDED, // Awarded
            bump: 250,
        };
        
        // Calculate expected refund amount
        let refund_amount = if awarded_bid.amount > event.auction_close_price {
            awarded_bid.amount - event.auction_close_price
        } else {
            0
        };
        assert_eq!(refund_amount, 500_000); // Should get a partial refund of 0.5 SOL
    }

    #[test]
    fn test_bubblegum_cnft_logic() {
        // Simulate cNFT minting, transfer, and burn logic
        let mut event = state::Event {
            organizer: test_pubkey(12),
            metadata_url: "https://example.com/event.json".to_string(),
            ticket_supply: 2,
            tickets_awarded: 0,
            start_price: 1_000_000,
            end_price: 100_000,
            auction_start_time: test_time(),
            auction_end_time: test_time() + 3600,
            auction_close_price: 0,
            status: EVENT_STATUS_CREATED,
            bump: 250,
            merkle_tree: test_pubkey(13),
            cnft_asset_ids: vec![],
        };
        // Mint cNFTs (simulate by pushing asset IDs)
        let asset_id1 = test_pubkey(14);
        let asset_id2 = test_pubkey(15);
        event.cnft_asset_ids.push(asset_id1);
        event.cnft_asset_ids.push(asset_id2);
        assert_eq!(event.cnft_asset_ids.len(), 2);
        // Transfer cNFT (simulate by removing from event and assigning to ticket)
        let mut ticket = state::Ticket {
            owner: test_pubkey(16),
            event: event.merkle_tree,
            status: TICKET_STATUS_OWNED,
            offchain_ref: String::new(),
            bump: 249,
            cnft_asset_id: asset_id1,
        };
        // Burn unsold cNFT (simulate by removing from event)
        event.cnft_asset_ids.retain(|&id| id != asset_id2);
        assert_eq!(event.cnft_asset_ids.len(), 1);
    }
}