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

## Program Architecture

This repository implements an Escrow program for Solana, enabling secure token swaps between users. The program acts as a trusted intermediary, releasing tokens only when both parties meet the agreed terms.

### Core Components

1. **Offer** - Represents a token swap offer with:
   - Maker (offer creator)
   - Token A (offered by maker)
   - Token B (wanted by maker)
   - Amount of Token A offered
   - Amount of Token B wanted
   
2. **Vault** - Temporary PDA-controlled token account that holds the maker's offered tokens until:
   - A taker accepts the offer (tokens transferred to taker)
   - The maker cancels the offer (tokens refunded to maker)

### Program Instructions

1. **makeOffer** - Creates a new token swap offer:
   - Stores offer details on-chain
   - Transfers maker's tokens to the vault

2. **takeOffer** - Accepts an existing offer:
   - Transfers taker's tokens to the maker
   - Transfers tokens from the vault to the taker
   - Closes the offer account and vault

3. **refundOffer** - Cancels an existing offer:
   - Returns tokens from the vault to the maker
   - Closes the offer account and vault

### Technology Stack

- **Anchor Framework** - Solana program development
- **solana-kite** - Client-side utilities for interacting with Solana
- **Codama** - Used to generate TypeScript client from the Anchor IDL
- **Node.js built-in test framework** - Used for testing

### Key Files

- `programs/escrow/src/lib.rs` - Program entry point with instruction definitions
- `programs/escrow/src/handlers/` - Instruction implementations
- `programs/escrow/src/state/offer.rs` - Offer account structure
- `tests/escrow.test.ts` - Main test suite
- `create-codama-client.ts` - Script to generate TypeScript client