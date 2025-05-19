# Local Deployment Instructions for TicketFair

This document provides instructions for deploying the TicketFair platform to a local Solana validator for testing.

## Prerequisites

- Solana CLI installed (version 2.1.21 or higher)
- Anchor CLI installed (version 0.31.1 or higher)
- Node.js (version 22.14.0 or higher)
- Rust (version 1.86.0 or higher)

## Step 1: Start a Local Validator

Open a terminal and start the Solana local validator:

```bash
# Terminal 1
cd /path/to/anchor-escrow-2025
anchor localnet
```

The validator will start running and show logs in this terminal. Keep this terminal open.

## Step 2: Deploy the Program

Open a second terminal and deploy the program to the local validator:

```bash
# Terminal 2
cd /path/to/anchor-escrow-2025
./deploy-to-local.sh
```

This script will:
1. Build the program using the nightly Rust toolchain
2. Deploy the program to the local validator
3. Generate the TypeScript client

## Step 3: Verify Deployment

You can verify the deployment by checking the program ID on the local validator:

```bash
solana program show 8jR5GeNzeweq35Uo84kGP3v1NcBaZWH5u62k7PxN4T2y --url localhost
```

This should return information about the deployed program.

## Step 4: Run Tests Against Local Validator

To run the tests against the local validator:

```bash
RUSTUP_TOOLCHAIN=nightly-2025-04-16 anchor test
```

## Troubleshooting

- If the validator fails to start, ensure no other Solana validators are running on your machine.
- If deployment fails with an RPC error, ensure the validator is running and the RPC port (8899) is accessible.
- If tests fail, check the program logs for detailed error information:
  ```bash
  solana logs --url localhost
  ```