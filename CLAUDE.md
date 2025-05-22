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

# Run TypeScript tests
RUSTUP_TOOLCHAIN=nightly-2025-04-16 anchor test -- -g "ticketfair"

# Alternative: Use npm script shortcuts
npm run test:escrow     # Run escrow tests only
npm run test:ticketfair # Run all TicketFair tests

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

### Demo Scripts

```bash
# Run full demonstration workflow
npm run demo:full-auction -- --name "Concert" --tickets 5 --duration 3 --bidders 8

# Individual demo steps
npm run demo:create-event -- --name "Concert" --tickets 10 --start-price 1.0 --end-price 0.2 --duration 30
npm run demo:place-bid -- --event EVENT_ADDRESS --bidder-name "Alice"
npm run demo:finalize -- --event EVENT_ADDRESS --close-price 0.5

# See all demo options
npm run demo:help

# Direct script execution
./demo/scripts/demo-ticketfair-workflow.sh  # Complete workflow demo
./demo/scripts/check-demo-deps.sh           # Check demo prerequisites
```

## Project Overview: TicketFair Platform

This repository is evolving from a basic Escrow program to the TicketFair platform - a decentralized event ticketing system using Dutch auctions and compressed NFTs on Solana.

### Repository Organization

The repository is organized into distinct sections for different purposes:

- **`demo/`** - Demo-ready materials for showcasing the platform
  - `scripts/` - Demo execution scripts
  - `examples/` - Code examples and samples
  - `docs/` - Demo documentation and presentation materials
  - `archived-runs/` - Historical demo execution logs

- **`development/`** - Development documentation and planning
  - `phases/` - Phased development documentation
  - `docs/` - Technical deployment and testing guides

- **Root level** - Core project files (program code, tests, configs)

### Dual Program Architecture

The codebase contains two separate but related programs:

1. **Escrow Program** (legacy) - Simple token swap escrow functionality
2. **TicketFair Program** - Advanced event ticketing with Dutch auctions

Both programs share the same `lib.rs` entry point, with separate handler modules for each functionality set.

### Phased Development Approach

This project follows a phased approach with clear milestones:

1. **Phase 1 (Complete)**: Foundation - Core account structures and auction logic
2. **Phase 2**: Switchboard VRF integration for randomness features
3. **Future Phases**: Optimizations and advanced features

Each phase has its own documentation in the `development/phases/phaseN/` directories, with the following key files:
- `PHASEN.md` - Overview of the phase
- `PHASEN-PLAN.md` - Detailed plan and requirements
- `PHASEN-STATUS.md` - Current implementation status
- `PHASEN-TESTING.md` - Testing criteria and approach

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

### Feature Flags

The codebase uses Rust feature flags to manage integration with external dependencies like Bubblegum. In `programs/escrow/Cargo.toml`:

```toml
[features]
default = []
bubblegum = [] # Feature flag for Bubblegum integration
```

This allows for conditional compilation of code that depends on external libraries, enabling phased development and testing of core functionality without needing all integrations to be complete.

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

1. **Escrow Instructions** (legacy):
   - **make_offer** - Create escrow between two parties
   - **take_offer** - Accept an existing offer
   - **refund_offer** - Refund offer to maker

2. **TicketFair Event Management**:
   - **create_event** - Creates a new event with Dutch auction parameters
   - **activate_event** - Changes event status from Created to Active
   - **finalize_auction** - Set auction close price and enable award/refund phase
   - Mints compressed NFTs to an event PDA using Bubblegum v2

3. **TicketFair Bidding**:
   - **place_bid** - Places a bid in the Dutch auction
   - **award_ticket** - Transfers ticket to winning bidder
   - **refund_bid** - Returns funds for unsuccessful bids
   - Escrows funds until auction completion

4. **TicketFair User Management**:
   - **create_user** - Creates user profile for tracking activity
   - **buy_ticket** - Direct ticket purchase (non-auction)

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

#### Program Code
- `programs/escrow/src/lib.rs` - Program entry point with instruction definitions
- `programs/escrow/src/handlers/` - Instruction implementations for events, tickets, users, and bids
- `programs/escrow/src/state/` - Account structures (event.rs, ticket.rs, user.rs, bid.rs)
- `programs/escrow/src/error.rs` - Custom error definitions
- `programs/escrow/tests/ticketfair_auction.rs` - Rust tests for auction flows

#### Client and API
- `src/ticketfair-api.ts` - High-level API functions for TicketFair operations
- `create-codama-client.ts` - Script to generate TypeScript client
- `tests/escrow.test.ts` - Basic TypeScript tests for escrow functionality
- `tests/ticketfair.test.ts` - TypeScript tests for TicketFair functionality
- `tests/ticketfair.test-helpers.ts` - Helper functions for TicketFair testing

#### Demo and Documentation
- `demo/` - Complete demo suite with scripts, examples, and documentation
- `demo/scripts/demo-ticketfair-workflow.sh` - Main demo script
- `demo/examples/` - Code examples for all major operations
- `demo/docs/DEMO.md` - Comprehensive demo guide
- `development/` - Development documentation and phase planning

### Development Workflow

- Project follows a phased approach with clear milestones (see development/phases/phase1/PHASE1.md)
- Changes are tracked in feature branches using a "phase-N" naming convention
- Tests are required for all new functionality before merging
- Demo materials are kept separate from development phases for easy showcase readiness

### Debugging and Common Issues

1. **Dependency Resolution**:
   - If you encounter errors about conflicting versions of Solana dependencies, see the Dependency Management Notes section.

2. **Bubblegum Integration**:
   - Currently behind a feature flag. Code that depends on Bubblegum is conditionally compiled using `#[cfg(feature = "bubblegum")]` and simulated in non-feature flag mode.

3. **Test Environment**:
   - Ensure you're using the specified nightly Rust toolchain for consistent builds:
   ```bash
   RUSTUP_TOOLCHAIN=nightly-2025-04-16 anchor test
   ```

4. **TypeScript Client**:
   - After any change to the program's instructions or accounts, regenerate the TypeScript client:
   ```bash
   npx tsx create-codama-client.ts
   ```

5. **PDA Collisions in Tests**:
   - Tests use unique organizers for each event to avoid PDA conflicts
   - Helper functions in `test-retry-helpers.ts` provide retry logic for flaky test scenarios

## Anchor Testing Notes

- run `anchor build` to build the project and `anchor test` to run tests. We cannot run isolated test suites, we have to run `anchor test` and then parse the outputs for the results of the tests we are interested in debugging at any time.
- The project uses Node.js built-in test framework (`node:test`) for TypeScript tests
- Test helpers are extensively used to create consistent test scenarios and handle common patterns
- Tests include both Rust-based unit tests and TypeScript integration tests