# Devnet Deployment Instructions for TicketFair

This document provides instructions for deploying the TicketFair platform to the Solana devnet for testing.

## Prerequisites

- Solana CLI installed (version 2.1.21 or higher)
- Anchor CLI installed (version 0.31.1 or higher)
- Node.js (version 22.14.0 or higher)
- Rust (version 1.86.0 or higher)
- A Solana wallet with devnet SOL (for deployment costs)

## Step 1: Configure for Devnet

First, update the `Anchor.toml` file to target devnet:

```toml
[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"  # Path to your keypair
```

## Step 2: Ensure Your Wallet Has Devnet SOL

You'll need some devnet SOL to pay for deployment. You can get this from a faucet:

```bash
solana airdrop 2 $(solana address) --url devnet
```

Check your balance to ensure you received the SOL:

```bash
solana balance --url devnet
```

## Step 3: Build the Program

Build the program using the nightly Rust toolchain:

```bash
RUSTUP_TOOLCHAIN=nightly-2025-04-16 anchor build
```

## Step 4: Deploy to Devnet

Deploy the program to devnet:

```bash
RUSTUP_TOOLCHAIN=nightly-2025-04-16 anchor deploy --provider.cluster devnet
```

## Step 5: Generate TypeScript Client

Generate the TypeScript client for interacting with the deployed program:

```bash
npx tsx create-codama-client.ts
```

## Step 6: Verify Deployment

You can verify the deployment by checking the program ID on devnet:

```bash
solana program show 8jR5GeNzeweq35Uo84kGP3v1NcBaZWH5u62k7PxN4T2y --url devnet
```

This should return information about the deployed program.

## Step 7: Interacting with the Deployed Program

You can interact with the deployed program using the TypeScript client:

```javascript
import * as programClient from "./dist/js-client";
import { Connection } from "@solana/web3.js";

// Connect to devnet
const connection = new Connection("https://api.devnet.solana.com");

// Use the client to interact with your program
// Example code will depend on your specific use case
```

## Monitoring Program Logs

To monitor the logs of your program on devnet:

```bash
solana logs --url devnet 8jR5GeNzeweq35Uo84kGP3v1NcBaZWH5u62k7PxN4T2y
```

## Troubleshooting

- If deployment fails, ensure you have enough devnet SOL in your wallet.
- Check program logs for detailed error information.
- Ensure your program's dependencies are correctly specified in `Cargo.toml`.
- If you encounter RPC errors, try using a different RPC endpoint for devnet.

## Important Notes

- Devnet is a test environment and may occasionally be reset.
- Programs deployed to devnet are visible to everyone, so be cautious about sensitive information.
- Devnet has rate limits and resource constraints. For production deployments, consider mainnet.