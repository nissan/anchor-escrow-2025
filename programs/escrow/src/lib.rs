#![allow(unexpected_cfgs)]
// See https://solana.stackexchange.com/questions/17777/unexpected-cfg-condition-value-solana)

pub mod constants;
pub mod error;
pub mod handlers;
pub mod state;

use anchor_lang::prelude::*;
use handlers::*;

declare_id!("8jR5GeNzeweq35Uo84kGP3v1NcBaZWH5u62k7PxN4T2y");

#[program]
pub mod escrow {
    use super::*;

    /// Create a new offer (escrow) between two parties.
    pub fn make_offer(
        context: Context<MakeOffer>,
        id: u64,
        token_a_offered_amount: u64,
        token_b_wanted_amount: u64,
    ) -> Result<()> {
        handlers::make_offer::make_offer(context, id, token_a_offered_amount, token_b_wanted_amount)
    }

    /// Accept an existing offer.
    pub fn take_offer(context: Context<TakeOffer>) -> Result<()> {
        handlers::take_offer::take_offer(context)
    }

    /// Refund an offer to the maker.
    pub fn refund_offer(context: Context<RefundOffer>) -> Result<()> {
        handlers::refund::refund_offer(context)
    }

    /// Create a new Ticketfair event.
    pub fn create_event(
        context: Context<CreateEventAccountConstraints>,
        metadata_url: String,
        ticket_supply: u32,
        start_price: u64,
        end_price: u64,
        auction_start_time: i64,
        auction_end_time: i64,
    ) -> Result<()> {
        handlers::ticketfair_event::create_event(
            context, 
            metadata_url, 
            ticket_supply, 
            start_price, 
            end_price, 
            auction_start_time, 
            auction_end_time
        )
    }

    /// Buy a ticket for a Ticketfair event.
    pub fn buy_ticket(
        context: Context<BuyTicketAccountConstraints>,
        offchain_ref: String,
    ) -> Result<()> {
        handlers::ticketfair_ticket::buy_ticket(context, offchain_ref)
    }

    /// Create a new Ticketfair user account.
    pub fn create_user(
        context: Context<CreateUserAccountConstraints>,
    ) -> Result<()> {
        handlers::ticketfair_user::create_user(context)
    }
}
