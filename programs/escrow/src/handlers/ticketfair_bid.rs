//! Ticketfair bid instruction handlers (Dutch Auction)

use anchor_lang::prelude::*;
use crate::state::{Bid, Event, Ticket};

#[derive(Accounts)]
pub struct PlaceBidAccountConstraints<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(mut)]
    pub event: Account<'info, Event>,
    /// The PDA that will hold escrowed funds for the event
    /// Seeds: [b"event", organizer.key().as_ref()]
    #[account(mut, seeds = [b"event", event.organizer.as_ref()], bump = event.bump)]
    pub event_pda: SystemAccount<'info>,
    #[account(
        init,
        payer = bidder,
        space = Bid::DISCRIMINATOR.len() + Bid::INIT_SPACE,
        seeds = [b"bid", event.key().as_ref(), bidder.key().as_ref()],
        bump
    )]
    pub bid: Account<'info, Bid>,
    pub system_program: Program<'info, System>,
}

pub fn place_bid(
    context: Context<PlaceBidAccountConstraints>,
    amount: u64,
) -> Result<()> {
    let event = &mut context.accounts.event;
    let bid = &mut context.accounts.bid;
    let bidder = &context.accounts.bidder;
    let event_pda = &context.accounts.event_pda;

    // Get current time
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    // Check auction status
    if event.status != 1 {
        return Err(error!(crate::error::ErrorCode::AuctionNotActive));
    }
    if now < event.auction_start_time {
        return Err(error!(crate::error::ErrorCode::AuctionNotStarted));
    }
    if now > event.auction_end_time {
        return Err(error!(crate::error::ErrorCode::AuctionEnded));
    }

    // Calculate current auction price
    let current_price = event.get_current_auction_price(now);
    if amount != current_price {
        return Err(error!(crate::error::ErrorCode::BidNotAtCurrentPrice));
    }

    // Escrow funds from bidder to event PDA
    let ix = anchor_lang::solana_program::system_instruction::transfer(
        &bidder.key(),
        &event_pda.key(),
        amount,
    );
    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            bidder.to_account_info(),
            event_pda.to_account_info(),
            context.accounts.system_program.to_account_info(),
        ],
    ).map_err(|_| error!(crate::error::ErrorCode::CustomError))?;

    // Record the bid
    bid.bidder = bidder.key();
    bid.event = event.key();
    bid.amount = amount;
    bid.status = 0; // Pending
    bid.bump = context.bumps.bid;

    Ok(())
}

#[derive(Accounts)]
pub struct AwardTicketAccountConstraints<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
    #[account(mut)]
    pub event: Account<'info, Event>,
    #[account(mut)]
    pub bid: Account<'info, Bid>,
    #[account(
        init,
        payer = organizer,
        space = Ticket::DISCRIMINATOR.len() + Ticket::INIT_SPACE,
        seeds = [b"ticket", event.key().as_ref(), bid.bidder.as_ref()],
        bump
    )]
    pub ticket: Account<'info, Ticket>,
    pub system_program: Program<'info, System>,
}

pub fn award_ticket(
    context: Context<AwardTicketAccountConstraints>,
) -> Result<()> {
    let event = &mut context.accounts.event;
    let bid = &mut context.accounts.bid;
    let organizer = &context.accounts.organizer;
    let ticket = &mut context.accounts.ticket;

    // Only the organizer can award tickets
    if event.organizer != organizer.key() {
        return Err(error!(crate::error::ErrorCode::CustomError)); // Replace with specific error if desired
    }
    if event.status != 1 {
        return Err(error!(crate::error::ErrorCode::AuctionNotActive));
    }
    if bid.status != 0 {
        return Err(error!(crate::error::ErrorCode::CustomError)); // Replace with BidNotPending if desired
    }
    if event.tickets_awarded >= event.ticket_supply {
        return Err(error!(crate::error::ErrorCode::CustomError)); // Replace with TicketsSoldOut if desired
    }

    // Mark bid as awarded
    bid.status = 1;
    event.tickets_awarded = event.tickets_awarded.checked_add(1).ok_or(error!(crate::error::ErrorCode::CustomError))?;

    // Create ticket
    ticket.owner = bid.bidder;
    ticket.event = event.key();
    ticket.status = 0; // Owned
    ticket.offchain_ref = String::new(); // To be set by user later
    ticket.bump = context.bumps.ticket;

    // Transfer funds from event PDA to organizer
    let event_pda_seeds: &[&[u8]] = &[b"event", event.organizer.as_ref(), &[event.bump]];
    let event_pda = context.accounts.event.to_account_info();
    let organizer_account = organizer.to_account_info();
    let system_program = context.accounts.system_program.to_account_info();
    let ix = anchor_lang::solana_program::system_instruction::transfer(
        &event_pda.key(),
        &organizer.key(),
        bid.amount,
    );
    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[event_pda.clone(), organizer_account, system_program],
        &[event_pda_seeds],
    ).map_err(|_| error!(crate::error::ErrorCode::CustomError))?;

    Ok(())
}

#[derive(Accounts)]
pub struct RefundBidAccountConstraints<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(mut)]
    pub bid: Account<'info, Bid>,
    pub system_program: Program<'info, System>,
}

pub fn refund_bid(
    context: Context<RefundBidAccountConstraints>,
) -> Result<()> {
    // TODO: Implement bid refund logic
    Ok(())
} 