# TicketFair Phase 1 Deployment Instructions

## Prerequisites

1. Ensure you have all required environment dependencies installed:
   - Solana CLI: 2.1.21 (Agave)
   - Anchor: 0.31.1
   - Node.js: v22.14.0
   - Rust: 1.86.0

2. Clone the repository and checkout the Phase 1 branch:
   ```bash
   git clone https://github.com/your-username/anchor-escrow-2025.git
   cd anchor-escrow-2025
   git checkout ticketfair/phase-1
   ```

## Local Deployment

### 1. Start a Local Validator

In a separate terminal, start a local Solana validator:
```bash
solana-test-validator
```

This validator will run on `http://127.0.0.1:8899`.

### 2. Build the Program

Build the program:
```bash
anchor build
```

This will compile the program and generate the IDL.

### 3. Generate TypeScript Client

If you want to use the TypeScript client:
```bash
npx tsx create-codama-client.ts
```

This generates a TypeScript client in the `dist/js-client` directory.

### 4. Deploy the Program

Deploy the program to the local validator:
```bash
anchor deploy
```

### 5. Run Tests

To run the tests:
```bash
RUSTUP_TOOLCHAIN=nightly-2025-04-16 anchor test
```

Note: The TypeScript tests may require updates to work with the latest changes.

## Devnet Deployment

### 1. Configure Solana for Devnet

```bash
solana config set --url devnet
```

### 2. Create a Keypair (if needed)

```bash
solana-keygen new -o ~/.config/solana/id.json
```

### 3. Airdrop SOL to Your Account

```bash
solana airdrop 2
```

### 4. Build and Deploy

```bash
anchor build
anchor deploy
```

## Testing the Deployed Program

You can interact with the deployed program using:

1. The TypeScript client
2. Direct RPC calls
3. The Solana CLI
4. A custom UI (in future phases)

## Important Notes

1. **Bubblegum Integration**: The program is currently deployed without Bubblegum integration (feature flag disabled). This will be implemented in Phase 1.5.

2. **Event Status**: After creating an event, you must activate it using the `activate_event` instruction before users can place bids.

3. **Auction Finalization**: After the auction end time, use the `finalize_auction` instruction to set the closing price, which enables partial refunds.

4. **Refunds**: Refunds must be requested explicitly using the `refund_bid` instruction.

## Troubleshooting

- If you encounter program deployment issues, check the Solana validator logs.
- For dependency conflicts, refer to the guidance in the CLAUDE.md file.
- If tests fail, ensure you are using the correct Rust toolchain (`RUSTUP_TOOLCHAIN=nightly-2025-04-16`).

For detailed documentation, refer to:
- `PHASE1-COMPLETION.md`: Overview of Phase 1 features
- `phase1/PHASE1-STATUS-UPDATE.md`: Current status report
- `phase1/BUBBLEGUM-INTEGRATION-EVALUATION.md`: Bubblegum integration plan