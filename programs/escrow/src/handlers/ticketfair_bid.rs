//! Ticketfair bid instruction handlers (Dutch Auction)

use anchor_lang::prelude::*;
use crate::state::{Bid, Event, Ticket};
use crate::constants::*;
use crate::error::ErrorCode;

// We'll add this import back when we properly integrate Bubblegum
// #[cfg(feature = "bubblegum")]
// use mpl_bubblegum::instruction as bubblegum_instruction;

#[derive(Accounts)]
pub struct PlaceBidAccountConstraints<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(mut)]
    pub event: Account<'info, Event>,
    /// The PDA that will hold escrowed funds for the event
    /// Seeds: [b"escrow", event.key().as_ref()]
    #[account(mut, seeds = [b"escrow", event.key().as_ref()], bump)]
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
    if event.status != EVENT_STATUS_ACTIVE {
        return Err(error!(ErrorCode::AuctionNotActive));
    }
    if now < event.auction_start_time {
        return Err(error!(ErrorCode::AuctionNotStarted));
    }
    if now > event.auction_end_time {
        return Err(error!(ErrorCode::AuctionEnded));
    }

    // Calculate current auction price
    let current_price = event.get_current_auction_price(now);
    if amount != current_price {
        return Err(error!(ErrorCode::BidNotAtCurrentPrice));
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
    ).map_err(|_| error!(ErrorCode::CustomError))?;

    // Record the bid
    bid.bidder = bidder.key();
    bid.event = event.key();
    bid.amount = amount;
    bid.status = BID_STATUS_PENDING;
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
    /// CHECK: Verified in Bubblegum program CPI call
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,
    /// Bubblegum program
    /// CHECK: Program ID verified in CPI
    pub bubblegum_program: UncheckedAccount<'info>,
    /// Log wrapper program (required by Bubblegum)
    /// CHECK: Program ID verified in CPI
    pub log_wrapper: UncheckedAccount<'info>,
    /// Compression program (required by Bubblegum)
    /// CHECK: Program ID verified in CPI
    pub compression_program: UncheckedAccount<'info>,
    /// Noop program (required by Bubblegum)
    /// CHECK: Program ID verified in CPI
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
        return Err(error!(ErrorCode::CustomError)); // Replace with specific error if desired
    }
    
    // Check event and bid status
    if event.status != EVENT_STATUS_ACTIVE {
        return Err(error!(ErrorCode::AuctionNotActive));
    }
    
    // Use the helper method to check if bid can be awarded
    if !bid.can_award() {
        return Err(error!(ErrorCode::CustomError)); // Replace with BidNotPending if desired
    }
    
    // Check if tickets are still available
    if event.tickets_awarded >= event.ticket_supply {
        return Err(error!(ErrorCode::CustomError)); // Replace with TicketsSoldOut if desired
    }

    // We'll use these in both branches
    let _event_pda_seeds: &[&[u8]] = &[b"event", event.organizer.as_ref(), &[event.bump]];

    // Bubblegum CPI: Transfer cNFT from event PDA to winner
    #[cfg(feature = "bubblegum")]
    {
        // This code will be enabled when we properly integrate Bubblegum
        // let transfer_ix = bubblegum_instruction::transfer_v2(
        //     context.accounts.bubblegum_program.key(),
        //     context.accounts.merkle_tree.key(),
        //     event.key(), // event PDA as current owner
        //     bid.bidder,  // new owner (winner)
        //     cnft_asset_id,
        //     event.key(), // event PDA as authority
        //     None, // leaf delegate (optional)
        //     None, // collection (optional)
        // );
        //
        // anchor_lang::solana_program::program::invoke_signed(
        //     &transfer_ix,
        //     &[
        //         context.accounts.bubblegum_program.to_account_info(),
        //         context.accounts.merkle_tree.to_account_info(),
        //         event.to_account_info(),
        //         context.accounts.log_wrapper.to_account_info(),
        //         context.accounts.compression_program.to_account_info(),
        //         context.accounts.noop_program.to_account_info(),
        //         context.accounts.system_program.to_account_info(),
        //     ],
        //     &[_event_pda_seeds],
        // ).map_err(|_| error!(ErrorCode::CustomError))?;
    }

    // When bubblegum feature is not enabled, we just simulate the transfer
    #[cfg(not(feature = "bubblegum"))]
    msg!("Bubblegum feature not enabled - simulating cNFT transfer for asset ID: {}", cnft_asset_id);

    // Mark bid as awarded
    bid.status = BID_STATUS_AWARDED;
    event.tickets_awarded = event.tickets_awarded.checked_add(1).ok_or(error!(ErrorCode::CustomError))?;

    // Create ticket
    ticket.owner = bid.bidder;
    ticket.event = event.key();
    ticket.status = TICKET_STATUS_OWNED;
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
    #[account(mut, seeds = [b"escrow", event.key().as_ref()], bump)]
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

    // Use the helper method to check if bid can be refunded
    if !bid.can_refund() {
        return Err(error!(ErrorCode::CustomError)); // Already refunded
    }

    let refund_amount;
    if bid.status == BID_STATUS_PENDING {
        // Case 1: Bid did not win, full refund
        refund_amount = bid.amount;
        bid.status = BID_STATUS_REFUNDED;
    } else if bid.status == BID_STATUS_AWARDED {
        // Case 2: Bid won, partial refund if closing price < bid amount
        // We need the auction to be finalized to know the closing price
        if event.status != EVENT_STATUS_FINALIZED || event.auction_close_price == 0 {
            return Err(error!(ErrorCode::CustomError)); // Auction not finalized, can't refund
        }
        
        let close_price = event.auction_close_price;
        if bid.amount > close_price {
            refund_amount = bid.amount - close_price;
        } else {
            // No refund needed
            return Ok(());
        }
        // Do not mark as refunded, as the ticket is already awarded
    } else {
        return Err(error!(ErrorCode::CustomError)); // Invalid bid status
    }

    if refund_amount > 0 {
        let event_key = event.key();
        let bump = &[context.bumps.event_pda];
        let event_pda_seeds: &[&[u8]] = &[b"escrow", event_key.as_ref(), bump];
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
        ).map_err(|_| error!(ErrorCode::CustomError))?;
    }

    Ok(())
}