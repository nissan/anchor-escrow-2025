# TicketFair Testing Documentation

This document provides comprehensive guidance on testing the TicketFair platform, including test structure, execution, and troubleshooting.

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Test Files](#test-files)
5. [Common Issues](#common-issues)
6. [Development Workflow](#development-workflow)
7. [CI/CD Integration](#cicd-integration)

## Overview

The TicketFair platform uses a comprehensive testing strategy that includes:

- **Rust Tests**: Native Solana program tests using the Anchor testing framework
- **TypeScript Tests**: Client-side integration tests using Node.js built-in test framework
- **End-to-End Tests**: Complete workflow tests from event creation to ticket distribution

### Testing Philosophy

- **Real Transactions**: All tests execute real blockchain transactions rather than mocks
- **Unique Accounts**: Each test uses unique accounts and PDAs to avoid collisions
- **Comprehensive Coverage**: Tests cover both happy paths and error conditions
- **Performance Aware**: Tests include timeouts and performance considerations

## Test Structure

### Directory Structure

```
tests/
├── escrow.test-helpers.ts      # Helper functions for basic escrow operations
├── escrow.test.ts              # Basic escrow functionality tests
├── ticketfair.test-helpers.ts  # Helper functions for TicketFair operations
├── ticketfair.test.ts          # Main TicketFair functionality tests
├── refund-focused.ts           # Focused refund testing
├── refund-test.ts              # Additional refund tests
└── REFUND-TESTS.md            # Refund testing documentation
```

### Test Categories

#### 1. Event Management Tests
- **Event Creation**: Creating events with valid parameters
- **Event Activation**: Transitioning events from Created to Active state
- **Auction Finalization**: Setting closing prices and finalizing auctions

#### 2. Bidding and Awarding Tests
- **Bid Placement**: Valid bids at current auction prices
- **Bid Rejection**: Invalid bids (wrong price, timing issues)
- **Ticket Awarding**: Successful ticket awards to winning bidders
- **Sold-Out Validation**: Preventing over-awarding of tickets

#### 3. Refund Tests
- **Losing Bid Refunds**: Full refunds for unsuccessful bids
- **Partial Refunds**: Refunds of bid surplus when final price is lower
- **Double Refund Prevention**: Ensuring bids can't be refunded twice

## Running Tests

### Quick Start

Use the provided test runner script for the most reliable test execution:

```bash
# Run all tests
./run-tests.sh

# Run specific test file
./run-tests.sh --test tests/ticketfair.test.ts

# Only start validator
./run-tests.sh --validator

# Only generate TypeScript client
./run-tests.sh --client

# Get help
./run-tests.sh --help
```

### Manual Test Execution

#### Prerequisites

1. **Environment Setup**:
   ```bash
   # Ensure correct toolchain
   rustup default stable
   rustup target add bpf-unknown-unknown
   
   # Install dependencies
   npm install
   ```

2. **Local Validator**:
   ```bash
   # Start local validator (in separate terminal)
   solana-test-validator --quiet --reset
   ```

3. **Generate TypeScript Client**:
   ```bash
   npx tsx create-codama-client.ts
   ```

#### Running Specific Tests

```bash
# All TypeScript tests
npx tsx --test tests/*.ts

# Specific test file
npx tsx --test tests/ticketfair.test.ts

# Specific test pattern (if supported)
npx tsx --test tests/ticketfair.test.ts --grep "places a bid"

# Rust tests (via Anchor)
RUSTUP_TOOLCHAIN=nightly-2025-04-16 anchor test
```

## Test Files

### `escrow.test.ts`
Basic escrow functionality testing including:
- Making offers between parties
- Taking offers and completing trades
- Refunding cancelled offers

### `ticketfair.test.ts`
Comprehensive TicketFair platform testing:

#### Event Management Suite
- `creates a new event with valid parameters`
- `finalizes auction with a closing price`

#### Ticket Bidding & Awarding Suite
- `places a bid at the current price`
- `rejects bids not at the current auction price`
- `awards a ticket to a valid bid`
- `fails to award a ticket if tickets are sold out`

#### Refunds Suite
- `refunds a losing bid in full`
- `partially refunds a winning bid when it exceeds the close price`
- `rejects refund for an already refunded bid`

### `refund-focused.ts`
Dedicated refund testing with enhanced error handling and retry mechanisms.

## Common Issues

### 1. "Account not owned by system program" Error

**Cause**: PDA collisions between test runs or validator state persistence.

**Solutions**:
- Use the `run-tests.sh` script which automatically resets the validator
- Ensure unique organizers for each test
- Clear validator state: `solana-test-validator --reset`

### 2. Test Timeouts

**Cause**: Network latency, slow transaction confirmation, or validator issues.

**Solutions**:
- Increase test timeouts in test configuration
- Use the test runner script which includes appropriate timeouts
- Check validator is running and responsive

### 3. Insufficient Funds Errors

**Cause**: Test accounts don't have enough SOL for transactions.

**Solutions**:
- Ensure airdrop amounts are sufficient (tests use 10 SOL per account)
- Check validator has sufficient funds for airdrops
- Use localnet instead of devnet for testing

### 4. Client Generation Issues

**Cause**: Outdated TypeScript client or IDL changes.

**Solutions**:
- Regenerate client: `npx tsx create-codama-client.ts`
- Rebuild program: `anchor build`
- Check for syntax errors in program code

## Development Workflow

### Adding New Tests

1. **Create Test Function**:
   ```typescript
   it("describes what the test does", async () => {
     // Use unique identifiers to avoid collisions
     const uniqueId = `test-${Date.now()}-${Math.random().toString(36)}`;
     
     // Test implementation
   });
   ```

2. **Use Helper Functions**:
   ```typescript
   // Create events with unique parameters
   const result = await createAndActivateEvent(connection, {
     organizer,
     metadataUrl: `https://example.com/${uniqueId}.json`,
     // ... other parameters
   });
   ```

3. **Handle Errors Gracefully**:
   ```typescript
   try {
     // Test operation that should fail
     await someOperation();
     assert.fail("Operation should have failed");
   } catch (error) {
     // Verify it's the expected error
     assert.ok(error.message.includes("ExpectedErrorCode"));
   }
   ```

### Debugging Tests

1. **Enable Verbose Logging**:
   ```typescript
   console.log("Debug info:", { 
     account: account.address,
     balance: balance.toString(),
     status: status
   });
   ```

2. **Check Account States**:
   ```typescript
   const accountData = await programClient.fetchEvent(connection.rpc, eventAddress);
   console.log("Account data:", accountData);
   ```

3. **Validate Transactions**:
   ```typescript
   console.log("Transaction signature:", tx);
   // Wait for confirmation
   await new Promise(resolve => setTimeout(resolve, 1000));
   ```

## CI/CD Integration

### GitHub Actions Configuration

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install Solana CLI
        run: |
          sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"
          echo "$HOME/.local/share/solana/install/active_release/bin" >> $GITHUB_PATH
      - name: Install Anchor
        run: npm install -g @coral-xyz/anchor-cli
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: ./run-tests.sh
```

### Test Execution Environment

- **Timeouts**: Tests use appropriate timeouts (3 minutes per test file)
- **Cleanup**: Validator is reset between runs to ensure clean state
- **Parallel Execution**: Tests can run in parallel with unique account generation
- **Error Reporting**: Comprehensive error reporting with colored output

## Best Practices

### Test Design

1. **Use Unique Identifiers**: Always generate unique URLs, organizers, and other identifiers
2. **Wait for Confirmation**: Include delays after transactions for network confirmation
3. **Validate State Changes**: Check account states before and after operations
4. **Test Error Conditions**: Include negative test cases for error handling

### Performance

1. **Batch Operations**: Use `createWallets()` to create multiple accounts at once
2. **Appropriate Delays**: Use minimal but sufficient delays for network confirmation
3. **Resource Management**: Clean up resources and accounts when possible

### Maintenance

1. **Keep Helpers Updated**: Maintain helper functions as the program evolves
2. **Document Test Intent**: Clear test descriptions and comments
3. **Version Compatibility**: Ensure tests work with specified Anchor/Solana versions

---

For questions or issues with testing, refer to the project's GitHub issues or consult the team documentation.