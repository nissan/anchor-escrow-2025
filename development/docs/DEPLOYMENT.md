# TicketFair Deployment Guide

This document provides comprehensive instructions for deploying the TicketFair platform to various Solana networks.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Local Development](#local-development)
4. [Devnet Deployment](#devnet-deployment)
5. [Mainnet Deployment](#mainnet-deployment)
6. [Configuration Management](#configuration-management)
7. [Troubleshooting](#troubleshooting)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Overview

TicketFair is a decentralized event ticketing platform built on Solana using the Anchor framework. The deployment process involves:

- Building the Solana program
- Deploying to the target network
- Updating configuration files
- Generating TypeScript client libraries
- Running post-deployment verification

### Deployment Environments

- **Local**: Development and testing using `solana-test-validator`
- **Devnet**: Staging environment for integration testing
- **Mainnet**: Production environment for live operations

## Prerequisites

### System Requirements

- **Operating System**: macOS 15.4.1 (recommended), Linux, or Windows WSL2
- **Memory**: Minimum 8GB RAM, 16GB recommended
- **Storage**: At least 50GB free space for Solana ledger

### Software Dependencies

```bash
# Solana CLI
curl -sSfL https://release.solana.com/v1.18.0/install | sh
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup component add rustfmt
rustup target add bpf-unknown-unknown

# Anchor CLI
npm install -g @coral-xyz/anchor-cli@0.31.1

# Node.js (v18 or higher)
# Use nvm for version management
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### Version Verification

Run the version check script to ensure all dependencies are correctly installed:

```bash
./show-versions.sh
```

Expected output:
```
Solana CLI: 2.1.21
Anchor CLI: 0.31.1
Node.js: v18.x.x
Rust: 1.86.0
```

## Local Development

### 1. Setup Local Environment

```bash
# Clone the repository
git clone [repository-url]
cd anchor-escrow-2025

# Install dependencies
npm install

# Verify Anchor configuration
cat Anchor.toml
```

### 2. Start Local Validator

```bash
# Start validator with reset
solana-test-validator --quiet --reset

# In another terminal, configure Solana CLI
solana config set --url localhost
solana config set --keypair ~/.config/solana/id.json
```

### 3. Build and Deploy Locally

```bash
# Build the program
anchor build

# Deploy to local validator
anchor deploy

# Generate TypeScript client
npx tsx create-codama-client.ts
```

### 4. Run Tests

```bash
# Run all tests
./run-tests.sh

# Run specific test
./run-tests.sh --test tests/ticketfair.test.ts
```

## Devnet Deployment

### 1. Configure for Devnet

Update `Anchor.toml`:
```toml
[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"
```

### 2. Setup Devnet Wallet

```bash
# Configure Solana CLI for devnet
solana config set --url devnet

# Check wallet balance
solana balance

# Request airdrop if needed (max 2 SOL per request)
solana airdrop 2
```

### 3. Deploy to Devnet

```bash
# Build the program
anchor build

# Deploy to devnet
anchor deploy

# Note the program ID from output
echo "Program deployed with ID: [PROGRAM_ID]"
```

### 4. Update Configuration

Update `Anchor.toml` with the deployed program ID:
```toml
[programs.devnet]
escrow = "[PROGRAM_ID]"
```

### 5. Generate Client and Test

```bash
# Generate TypeScript client with new program ID
npx tsx create-codama-client.ts

# Run tests against devnet (optional)
# Note: Tests are designed for local validator
```

### Example Devnet Deployment

Our current devnet deployment:
- **Program ID**: `3XCMusDvagK9wyRaHEMbrhLPQfFQPXhQXZZ7oZ2pr2ah`
- **Network**: Solana Devnet
- **Deployed**: [Current Date]

## Mainnet Deployment

> ⚠️ **Warning**: Mainnet deployment requires careful preparation and should only be done after thorough testing on devnet.

### Pre-Deployment Checklist

- [ ] All tests passing on devnet
- [ ] Security audit completed
- [ ] Configuration reviewed and verified
- [ ] Sufficient SOL for deployment fees (minimum 5-10 SOL)
- [ ] Backup of all deployment keys
- [ ] Team approval for mainnet deployment

### 1. Prepare Mainnet Wallet

```bash
# Create a dedicated mainnet deployment wallet
solana-keygen new --outfile ~/.config/solana/mainnet-deployer.json

# Configure Solana CLI for mainnet
solana config set --url mainnet-beta
solana config set --keypair ~/.config/solana/mainnet-deployer.json

# Fund the wallet (transfer from existing wallet or exchange)
solana balance
```

### 2. Update Configuration

Update `Anchor.toml`:
```toml
[provider]
cluster = "mainnet-beta"
wallet = "~/.config/solana/mainnet-deployer.json"

[programs.mainnet-beta]
escrow = "11111111111111111111111111111111"  # Will be updated after deployment
```

### 3. Deploy to Mainnet

```bash
# Final build
anchor build

# Deploy to mainnet
anchor deploy

# Update Anchor.toml with actual program ID
```

### 4. Post-Deployment Verification

```bash
# Verify program deployment
solana program show [PROGRAM_ID]

# Generate production client
npx tsx create-codama-client.ts

# Create deployment record
echo "Mainnet deployment: [PROGRAM_ID] at $(date)" >> DEPLOYMENT_HISTORY.md
```

## Configuration Management

### Environment-Specific Configurations

#### Local Development (`localnet`)
```toml
[programs.localnet]
escrow = "8jR5GeNzeweq35Uo84kGP3v1NcBaZWH5u62k7PxN4T2y"

[provider]
cluster = "localnet"
```

#### Devnet Staging
```toml
[programs.devnet]
escrow = "3XCMusDvagK9wyRaHEMbrhLPQfFQPXhQXZZ7oZ2pr2ah"

[provider]
cluster = "devnet"
```

#### Mainnet Production
```toml
[programs.mainnet-beta]
escrow = "[MAINNET_PROGRAM_ID]"

[provider]
cluster = "mainnet-beta"
```

### Configuration Scripts

Create environment-specific configuration scripts:

```bash
# scripts/configure-local.sh
#!/bin/bash
sed -i.bak 's/cluster = .*/cluster = "localnet"/' Anchor.toml
solana config set --url localhost

# scripts/configure-devnet.sh
#!/bin/bash
sed -i.bak 's/cluster = .*/cluster = "devnet"/' Anchor.toml
solana config set --url devnet

# scripts/configure-mainnet.sh
#!/bin/bash
sed -i.bak 's/cluster = .*/cluster = "mainnet-beta"/' Anchor.toml
solana config set --url mainnet-beta
```

## Troubleshooting

### Common Deployment Issues

#### 1. Insufficient Funds

**Error**: `Account has insufficient funds for spend`

**Solution**:
```bash
# Check balance
solana balance

# Request airdrop (devnet only)
solana airdrop 2

# For mainnet, transfer SOL from another wallet
```

#### 2. Program Already Exists

**Error**: `Program already exists`

**Solution**:
```bash
# Use upgrade authority to redeploy
anchor upgrade [PROGRAM_ID]

# Or deploy with new program ID (not recommended for production)
anchor deploy --program-name escrow_new
```

#### 3. Build Errors

**Error**: Various compilation errors

**Solutions**:
```bash
# Clean build artifacts
anchor clean
rm -rf target/

# Rebuild
anchor build

# Check Rust version
rustc --version

# Update toolchain if needed
rustup update
```

#### 4. Network Issues

**Error**: `Connection refused` or timeout errors

**Solutions**:
```bash
# Check network configuration
solana config get

# Try different RPC endpoints
solana config set --url https://api.devnet.solana.com

# For local development, ensure validator is running
pgrep -f solana-test-validator
```

### Debugging Commands

```bash
# Check program account
solana account [PROGRAM_ID]

# View program logs
solana logs [PROGRAM_ID]

# Check recent transactions
solana confirm [TRANSACTION_SIGNATURE] --verbose

# Program information
solana program show [PROGRAM_ID]
```

## Monitoring and Maintenance

### Health Checks

Create monitoring scripts to verify deployment health:

```bash
# scripts/health-check.sh
#!/bin/bash
echo "Checking TicketFair deployment health..."

# Check program exists
if solana program show $PROGRAM_ID &>/dev/null; then
    echo "✓ Program exists: $PROGRAM_ID"
else
    echo "✗ Program not found: $PROGRAM_ID"
    exit 1
fi

# Check RPC connectivity
if solana slot &>/dev/null; then
    echo "✓ RPC connectivity OK"
else
    echo "✗ RPC connectivity failed"
    exit 1
fi

echo "Health check completed successfully"
```

### Upgrade Process

For program upgrades:

```bash
# Build new version
anchor build

# Upgrade existing program
anchor upgrade [PROGRAM_ID]

# Verify upgrade
solana program dump [PROGRAM_ID] upgraded-program.so
```

### Backup and Recovery

1. **Backup Critical Data**:
   ```bash
   # Backup wallet keys
   cp ~/.config/solana/id.json ~/backups/wallet-$(date +%Y%m%d).json
   
   # Backup program binary
   cp target/deploy/escrow.so ~/backups/escrow-$(date +%Y%m%d).so
   ```

2. **Disaster Recovery**:
   ```bash
   # Restore from backup
   cp ~/backups/wallet-[DATE].json ~/.config/solana/id.json
   
   # Redeploy if necessary
   anchor deploy --program-keypair ~/backups/program-keypair.json
   ```

## Security Considerations

1. **Wallet Security**:
   - Use hardware wallets for mainnet deployments
   - Keep private keys encrypted and backed up
   - Use multi-signature wallets for critical operations

2. **Program Security**:
   - Conduct thorough security audits
   - Implement proper access controls
   - Use upgrade authorities carefully

3. **Network Security**:
   - Use verified RPC endpoints
   - Monitor for unusual activity
   - Implement rate limiting where applicable

## Deployment History

Track all deployments in `DEPLOYMENT_HISTORY.md`:

```markdown
# Deployment History

## Devnet Deployments
- 2025-05-22: Program ID `3XCMusDvagK9wyRaHEMbrhLPQfFQPXhQXZZ7oZ2pr2ah`
  - Features: Core event management, bidding, and refunds
  - Status: Active

## Mainnet Deployments
- TBD: Awaiting final testing and security audit
```

---

For questions about deployment, consult the development team or create an issue in the project repository.