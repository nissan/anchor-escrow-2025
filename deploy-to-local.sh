#!/bin/bash

echo "Building program..."
RUSTUP_TOOLCHAIN=nightly-2025-04-16 anchor build

echo "Deploying to local validator..."
RUSTUP_TOOLCHAIN=nightly-2025-04-16 anchor deploy

echo "Generating Typescript client..."
npx tsx create-codama-client.ts

echo "Deployment complete!"