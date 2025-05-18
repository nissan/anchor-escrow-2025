//! Ticketfair bid instruction handlers (Dutch Auction)

use anchor_lang::prelude::*;
use crate::state::{Bid, Event, Ticket};
use mpl_bubblegum::instruction as bubblegum_instruction;

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
    /// Bubblegum Merkle Tree for cNFTs
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,
    /// Bubblegum program
    pub bubblegum_program: UncheckedAccount<'info>,
    /// Log wrapper program (required by Bubblegum)
    pub log_wrapper: UncheckedAccount<'info>,
    /// Compression program (required by Bubblegum)
    pub compression_program: UncheckedAccount<'info>,
    /// Noop program (required by Bubblegum)
    pub noop_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn award_ticket(
    context: Context<AwardTicketAccountConstraints>,
    cnft_asset_id: Pubkey, // Asset ID to transfer
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

    // Bubblegum CPI: Transfer cNFT from event PDA to winner
    let transfer_ix = bubblegum_instruction::transfer_v2(
        context.accounts.bubblegum_program.key(),
        context.accounts.merkle_tree.key(),
        event.key(), // event PDA as current owner
        bid.bidder,  // new owner (winner)
        cnft_asset_id,
        event.key(), // event PDA as authority
        None, // leaf delegate (optional)
        None, // collection (optional)
    );
    let event_pda_seeds: &[&[u8]] = &[b"event", event.organizer.as_ref(), &[event.bump]];
    anchor_lang::solana_program::program::invoke_signed(
        &transfer_ix,
        &[
            context.accounts.bubblegum_program.to_account_info(),
            context.accounts.merkle_tree.to_account_info(),
            event.to_account_info(),
            context.accounts.log_wrapper.to_account_info(),
            context.accounts.compression_program.to_account_info(),
            context.accounts.noop_program.to_account_info(),
            context.accounts.system_program.to_account_info(),
        ],
        &[event_pda_seeds],
    ).map_err(|_| error!(crate::error::ErrorCode::CustomError))?;

    // Mark bid as awarded
    bid.status = 1;
    event.tickets_awarded = event.tickets_awarded.checked_add(1).ok_or(error!(crate::error::ErrorCode::CustomError))?;

    // Create ticket
    ticket.owner = bid.bidder;
    ticket.event = event.key();
    ticket.status = 0; // Owned
    ticket.offchain_ref = String::new(); // To be set by user later
    ticket.bump = context.bumps.ticket;
    ticket.cnft_asset_id = cnft_asset_id;

    Ok(())
}

#[derive(Accounts)]
pub struct RefundBidAccountConstraints<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(mut)]
    pub event: Account<'info, Event>,
    #[account(mut)]
    pub bid: Account<'info, Bid>,
    /// Event PDA (escrow authority)
    #[account(mut, seeds = [b"event", event.organizer.as_ref()], bump = event.bump)]
    pub event_pda: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn refund_bid(
    context: Context<RefundBidAccountConstraints>,
) -> Result<()> {
    let event = &mut context.accounts.event;
    let bid = &mut context.accounts.bid;
    let bidder = &context.accounts.bidder;
    let event_pda = &context.accounts.event_pda;

    // Only allow refund if not already refunded
    if bid.status == 2 {
        return Err(error!(crate::error::ErrorCode::CustomError)); // Already refunded
    }

    let mut refund_amount = 0u64;
    if bid.status == 0 {
        // Case 1: Bid did not win, full refund
        refund_amount = bid.amount;
        bid.status = 2; // Refunded
    } else if bid.status == 1 {
        // Case 2: Bid won, partial refund if closing price < bid amount
        let close_price = event.auction_close_price;
        if bid.amount > close_price {
            refund_amount = bid.amount - close_price;
        } else {
            // No refund needed
            return Ok(());
        }
        // Do not mark as refunded, as the ticket is already awarded
    } else {
        return Err(error!(crate::error::ErrorCode::CustomError)); // Invalid bid status
    }

    if refund_amount > 0 {
        let event_pda_seeds: &[&[u8]] = &[b"event", event.organizer.as_ref(), &[event.bump]];
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &event_pda.key(),
            &bidder.key(),
            refund_amount,
        );
        anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &[
                event_pda.to_account_info(),
                bidder.to_account_info(),
                context.accounts.system_program.to_account_info(),
            ],
            &[event_pda_seeds],
        ).map_err(|_| error!(crate::error::ErrorCode::CustomError))?;
    }

    Ok(())
} 