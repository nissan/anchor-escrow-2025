# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Environment Requirements

- Solana CLI: 2.1.21 (Agave)
- Anchor: 0.31.1  
- Node.js: v22.14.0
- Rust: 1.86.0
- Recommended OS: MacOS 15.4.1

## Commands

### Build and Development

```bash
# Install dependencies
npm install

# Build the program
npm run build

# Generate TypeScript client
npx tsx create-codama-client.ts

# Show all environment versions
npm run show-versions
```

### Testing

```bash
# Run all tests
# Note: RUSTUP_TOOLCHAIN is needed for consistent builds
RUSTUP_TOOLCHAIN=nightly-2025-04-16 anchor test

# Run specific test file
RUSTUP_TOOLCHAIN=nightly-2025-04-16 anchor test -- -g "ticketfair_auction"

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Deployment

```bash
# Deploy the program
anchor deploy
```

## Project Overview: TicketFair Platform

This repository is evolving from a basic Escrow program to the TicketFair platform - a decentralized event ticketing system using Dutch auctions and compressed NFTs on Solana.

### Dependency Management Notes

When working with mpl-bubblegum and other Solana dependencies, you may encounter version conflicts. If you see errors like:

```
error: failed to select a version for `solana-program`
```

Try one of these solutions:
1. Remove direct dependencies on `solana-program` and use it from `anchor-lang` instead:
   ```rust
   // Instead of: use solana_program::xyz
   use anchor_lang::solana_program::xyz
   ```

2. If you need to pin a specific version, use the equals syntax:
   ```toml
   solana-program = "=2.1.0"
   ```

3. For development and testing, you can temporarily comment out problematic dependencies like `mpl-bubblegum` and their related code until you're ready to integrate them fully.

### Core Components

1. **Event** - Represents an event with tickets for sale:
   - Organizer (event creator)
   - Ticket supply and metadata
   - Dutch auction parameters (start price, end price, timeframes)
   - Compressed NFT metadata (Bubblegum v2)

2. **Ticket** - Represents a purchased ticket:
   - Owner (ticket holder)
   - Event reference
   - Status (Owned/Claimed/Refunded)
   
3. **User** - Maintains user activity and holdings:
   - User profile data
   - Events created
   - Tickets purchased

4. **Bid** - Tracks auction bids:
   - Bidder (potential ticket buyer)
   - Event reference
   - Bid amount
   - Status (Pending/Awarded/Refunded)

5. **PDA Authorities and Vaults** - Secure token handling:
   - Event PDA as authority for compressed NFT operations
   - Escrow vaults for holding bid funds

### Program Instructions

1. **Event Management**:
   - **create_event** - Creates a new event with Dutch auction parameters
   - Mints compressed NFTs to an event PDA using Bubblegum v2

2. **Bidding**:
   - **place_bid** - Places a bid in the Dutch auction
   - Escrows funds until auction completion

3. **Ticket Distribution**:
   - **award_ticket** - Transfers ticket to winning bidder
   - Transfers cNFT from event PDA to winner

4. **Refunds**:
   - **refund_bid** - Returns funds for unsuccessful bids
   - **cancel_event** - Returns funds and burns tickets for canceled events

### Integration with Metaplex Bubblegum v2

- Tickets are represented as compressed NFTs (cNFTs) using Bubblegum v2
- Event creation mints the full supply of cNFTs to an event PDA
- Awarding tickets transfers cNFTs from the PDA to winners
- Unsold tickets are burned at auction close

### Future Switchboard VRF Integration (Phase 2)

- Random auction end determination
- Fair winner selection when oversubscribed

### Technology Stack

- **Anchor Framework** - Solana program development
- **Metaplex Bubblegum v2** - Compressed NFT implementation
- **solana-kite** - Client-side utilities for interacting with Solana
- **Codama** - Used to generate TypeScript client from the Anchor IDL
- **Node.js built-in test framework** - Used for testing

### Key Files

- `programs/escrow/src/lib.rs` - Program entry point with instruction definitions
- `programs/escrow/src/handlers/` - Instruction implementations for events, tickets, users, and bids
- `programs/escrow/src/state/` - Account structures (event.rs, ticket.rs, user.rs, bid.rs)
- `programs/escrow/src/error.rs` - Custom error definitions
- `programs/escrow/tests/ticketfair_auction.rs` - Rust tests for auction flows
- `tests/escrow.test.ts` - TypeScript test suite
- `create-codama-client.ts` - Script to generate TypeScript client

### Development Workflow

- Project follows a phased approach with clear milestones (see phase1/PHASE1.md)
- Changes are tracked in feature branches using a "phase-N" naming convention
- Tests are required for all new functionality before merging