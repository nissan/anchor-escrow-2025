//! Ticketfair event instruction handlers

use anchor_lang::prelude::*;
use crate::state::Event;
use crate::constants::*;
use crate::error::ErrorCode;

// We'll add these imports back when we properly integrate Bubblegum
// #[cfg(feature = "bubblegum")]
// use mpl_bubblegum::instruction as bubblegum_instruction;
// #[cfg(feature = "bubblegum")]
// use mpl_bubblegum::state::metaplex_adapter::MetadataArgsV2;

#[derive(Accounts)]
pub struct CreateEventAccountConstraints<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
    #[account(
        init,
        payer = organizer,
        space = 8 + Event::INIT_SPACE, // 8 bytes for discriminator
        seeds = [b"event", organizer.key().as_ref()],
        bump
    )]
    pub event: Account<'info, Event>,
    /// Bubblegum Merkle Tree for cNFTs (must be created before event)
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

pub fn create_event(
    context: Context<CreateEventAccountConstraints>,
    metadata_url: String,
    ticket_supply: u32,
    start_price: u64,
    end_price: u64,
    auction_start_time: i64,
    auction_end_time: i64,
) -> Result<()> {
    let event = &mut context.accounts.event;
    
    // Validate parameters
    if ticket_supply > MAX_TICKETS_PER_EVENT {
        return Err(error!(ErrorCode::CustomError)); // Replace with specific error
    }
    
    if start_price < MIN_TICKET_PRICE || end_price < MIN_TICKET_PRICE {
        return Err(error!(ErrorCode::CustomError)); // Replace with specific error
    }
    
    let duration = auction_end_time - auction_start_time;
    if duration < MIN_AUCTION_DURATION || duration > MAX_AUCTION_DURATION {
        return Err(error!(ErrorCode::CustomError)); // Replace with specific error
    }
    
    event.organizer = context.accounts.organizer.key();
    event.metadata_url = metadata_url.clone();
    event.ticket_supply = ticket_supply;
    event.tickets_awarded = 0;
    event.start_price = start_price;
    event.end_price = end_price;
    event.auction_start_time = auction_start_time;
    event.auction_end_time = auction_end_time;
    event.auction_close_price = 0;
    event.status = EVENT_STATUS_CREATED;
    event.bump = context.bumps.event;
    event.merkle_tree = context.accounts.merkle_tree.key();
    let ticket_supply_to_reserve = ticket_supply as usize;
    event.cnft_asset_ids = Vec::with_capacity(ticket_supply_to_reserve);

    // Bubblegum CPI: Mint cNFTs for ticket supply
    #[cfg(feature = "bubblegum")]
    {
        // This code will be enabled when we properly integrate Bubblegum
        // for i in 0..ticket_supply {
        //     let metadata = MetadataArgsV2 {
        //         name: format!("Ticket #{}", i + 1),
        //         uri: metadata_url.clone(),
        //         seller_fee_basis_points: 0,
        //         collection: None,
        //         creators: vec![],
        //         // Add other fields as required by Bubblegum v2
        //     };
        //
        //     let mint_ix = bubblegum_instruction::mint_v2(
        //         context.accounts.bubblegum_program.key(),
        //         context.accounts.merkle_tree.key(),
        //         event.key(), // event PDA as tree delegate/authority
        //         event.key(), // leaf owner (event PDA)
        //         event.key(), // leaf delegate (event PDA)
        //         None, // collection authority (optional)
        //         None, // core collection (optional)
        //         metadata,
        //     );
        //
        //     let event_pda_seeds: &[&[u8]] = &[b"event", event.organizer.as_ref(), &[event.bump]];
        //
        //     anchor_lang::solana_program::program::invoke_signed(
        //         &mint_ix,
        //         &[
        //             context.accounts.bubblegum_program.to_account_info(),
        //             context.accounts.merkle_tree.to_account_info(),
        //             event.to_account_info(),
        //             context.accounts.log_wrapper.to_account_info(),
        //             context.accounts.compression_program.to_account_info(),
        //             context.accounts.noop_program.to_account_info(),
        //             context.accounts.system_program.to_account_info(),
        //         ],
        //         &[event_pda_seeds],
        //     ).map_err(|_| error!(crate::error::ErrorCode::CustomError))?;
        //
        //     // TODO: Parse asset ID from transaction logs off-chain and update event.cnft_asset_ids
        //     // For now, push a placeholder
        //     event.cnft_asset_ids.push(Pubkey::default());
        // }
    }
    
    // When bubblegum feature is not enabled, we just simulate the minting
    #[cfg(not(feature = "bubblegum"))]
    {
        msg!("Bubblegum feature not enabled - simulating cNFT minting for {} tickets", ticket_supply);
        // Create placeholder asset IDs for testing
        event.cnft_asset_ids = Vec::new();
        for _ in 0..ticket_supply {
            event.cnft_asset_ids.push(Pubkey::default());
        }
    }

    Ok(())
}

#[derive(Accounts)]
pub struct ActivateEventAccountConstraints<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"event", organizer.key().as_ref()],
        bump,
        constraint = event.organizer == organizer.key() @ ErrorCode::CustomError,
    )]
    pub event: Account<'info, Event>,
}

pub fn activate_event(
    context: Context<ActivateEventAccountConstraints>,
) -> Result<()> {
    let event = &mut context.accounts.event;
    
    // Only activate if the event is in the Created state
    if event.status != EVENT_STATUS_CREATED {
        return Err(error!(ErrorCode::CustomError)); // Replace with specific error
    }
    
    // Set the event status to Active
    event.status = EVENT_STATUS_ACTIVE;
    
    Ok(())
}

#[derive(Accounts)]
pub struct FinalizeEventAccountConstraints<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"event", organizer.key().as_ref()],
        bump,
        constraint = event.organizer == organizer.key() @ ErrorCode::CustomError,
    )]
    pub event: Account<'info, Event>,
}

pub fn finalize_auction(
    context: Context<FinalizeEventAccountConstraints>,
    close_price: u64,
) -> Result<()> {
    let event = &mut context.accounts.event;
    
    // Get current time
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;
    
    // Check if the auction can be finalized
    if !event.can_finalize(now) {
        return Err(error!(ErrorCode::CustomError)); // Replace with specific error
    }
    
    // Validate close price is between start and end prices
    if close_price > event.start_price || close_price < event.end_price {
        return Err(error!(ErrorCode::CustomError)); // Replace with specific error
    }
    
    // Set the auction close price
    event.auction_close_price = close_price;
    
    // Update event status to finalized
    event.status = EVENT_STATUS_FINALIZED;
    
    Ok(())
}