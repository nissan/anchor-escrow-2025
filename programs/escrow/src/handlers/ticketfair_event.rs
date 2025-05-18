//! Ticketfair event instruction handlers

use anchor_lang::prelude::*;
use crate::state::Event;
// Import Bubblegum CPI types (scaffold)
use mpl_bubblegum::instruction as bubblegum_instruction;
use mpl_bubblegum::state::metaplex_adapter::MetadataArgsV2;
use anchor_lang::solana_program::sysvar;

#[derive(Accounts)]
pub struct CreateEventAccountConstraints<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
    #[account(
        init,
        payer = organizer,
        space = Event::DISCRIMINATOR.len() + Event::INIT_SPACE,
        seeds = [b"event", organizer.key().as_ref()],
        bump
    )]
    pub event: Account<'info, Event>,
    /// Bubblegum Merkle Tree for cNFTs (must be created before event)
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
    event.organizer = context.accounts.organizer.key();
    event.metadata_url = metadata_url.clone();
    event.ticket_supply = ticket_supply;
    event.tickets_awarded = 0;
    event.start_price = start_price;
    event.end_price = end_price;
    event.auction_start_time = auction_start_time;
    event.auction_end_time = auction_end_time;
    event.auction_close_price = 0;
    event.status = 0;
    event.bump = context.bumps.event;
    event.merkle_tree = context.accounts.merkle_tree.key();
    event.cnft_asset_ids = Vec::new();

    // Bubblegum CPI: Mint cNFTs for ticket supply
    for i in 0..ticket_supply {
        let metadata = MetadataArgsV2 {
            name: format!("Ticket #{}", i + 1),
            uri: metadata_url.clone(),
            seller_fee_basis_points: 0,
            collection: None,
            creators: vec![],
            // Add other fields as required by Bubblegum v2
        };

        let mint_ix = bubblegum_instruction::mint_v2(
            context.accounts.bubblegum_program.key(),
            context.accounts.merkle_tree.key(),
            event.key(), // event PDA as tree delegate/authority
            event.key(), // leaf owner (event PDA)
            event.key(), // leaf delegate (event PDA)
            None, // collection authority (optional)
            None, // core collection (optional)
            metadata,
        );

        let event_pda_seeds: &[&[u8]] = &[b"event", event.organizer.as_ref(), &[event.bump]];

        anchor_lang::solana_program::program::invoke_signed(
            &mint_ix,
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

        // TODO: Parse asset ID from transaction logs off-chain and update event.cnft_asset_ids
        // For now, push a placeholder
        event.cnft_asset_ids.push(Pubkey::default());
    }

    Ok(())
} 