#!/bin/bash

# Set environment variables
export ANCHOR_PROVIDER_URL="http://localhost:8899"
export ANCHOR_WALLET="$(solana config get keypair | cut -d: -f2 | xargs)"

# Build the program first (skipping if already built)
echo "Building the program..."
RUSTUP_TOOLCHAIN=nightly-2025-04-16 anchor build

# Start the local validator if it's not already running
if ! solana ping -u localhost; then
  echo "Starting local validator..."
  solana-test-validator --bpf-program ./target/deploy/escrow-keypair.json ./target/deploy/escrow.so --reset &
  VALIDATOR_PID=$!
  
  # Wait for validator to start
  echo "Waiting for validator to start..."
  sleep 5
fi

# Run the focused test with node directly
echo "Running refund test with explicit timeout..."
node --test --test-only --test-timeout=300000 ./tests/run-refund-test.ts

# Clean up if we started the validator
if [ -n "$VALIDATOR_PID" ]; then
  echo "Stopping validator..."
  kill $VALIDATOR_PID
fi