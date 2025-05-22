# TicketFair Refund Test Implementation

This document outlines the refund functionality tests implemented for the TicketFair platform.

## Overview

The TicketFair refund functionality allows users to:
1. Get full refunds for losing bids (those not awarded tickets)
2. Get partial refunds for winning bids when the auction close price is lower than their bid amount
3. Prevents double-refunds for already refunded bids

## Test Implementations

We've implemented these tests in multiple ways to accommodate different testing scenarios:

### 1. Comprehensive Test Suite (`ticketfair.test.ts`)

- Contains a full `describe("Refunds")` block with three test cases:
  - `refunds a losing bid in full`
  - `partially refunds a winning bid when it exceeds the close price`
  - `rejects refund for an already refunded bid`

This is the most complete implementation but may time out when run with the full test suite.

### 2. Focused Test (`run-refund-test.ts`)

- Single-purpose test file focused purely on testing refund functionality
- Uses Node's test runner with explicit timeouts
- Implements retry mechanisms and adequate waiting periods
- More reliable for isolated testing

### 3. Helper Functions (`refundBid.test-fix.ts`)

- Contains the improved `refundBidImproved` function with better error handling
- Used by both test implementations

## Running Tests

### Option 1: Use the Dedicated Script

Run the dedicated test script with:

```bash
./run-refund-test.sh
```

This script:
- Builds the program if needed
- Manages the local validator
- Runs the focused test with appropriate timeouts
- Handles cleanup

### Option 2: Run Focused Test Directly

```bash
node --test --test-only --test-timeout=300000 ./tests/run-refund-test.ts
```

### Option 3: Run Full Test Suite

```bash
RUSTUP_TOOLCHAIN=nightly-2025-04-16 anchor test
```

Note: The full test suite may time out due to the many transactions involved.

## Key Features Tested

1. **Full Refund Flow**
   - Creates an event
   - Places a bid
   - Finalizes the auction
   - Processes a full refund for a losing bid
   - Verifies bid status changes to REFUNDED
   - Verifies SOL is returned to bidder

2. **Partial Refund Flow**
   - Creates an event
   - Places a bid at the higher start price
   - Awards the ticket to the bidder
   - Finalizes auction with a lower close price
   - Processes a partial refund for the difference between bid and close price
   - Verifies the bidder receives the correct amount

3. **Double Refund Prevention**
   - Creates an event
   - Places a bid
   - Processes a refund
   - Attempts a second refund, which should fail
   - Verifies the bid status doesn't change

## Implementation Details

The tests incorporate best practices for Solana testing:

1. **Error Handling & Retries**
   - Implements exponential backoff for transaction retries
   - Provides descriptive error messages
   - Handles timeouts gracefully

2. **State Verification**
   - Verifies event status (ACTIVE → FINALIZED)
   - Verifies bid status (PENDING → REFUNDED)
   - Verifies SOL balances before and after

3. **Deterministic Testing**
   - Uses unique identifiers to prevent PDA collisions
   - Uses fresh wallets for each test
   - Controls timing for predictable outcomes

## Notes on Test Stability

These tests involve multiple on-chain transactions which can sometimes lead to timeout issues. The focused test implementation handles this with:

1. Explicit timeouts
2. Retry mechanisms
3. Adequate waiting periods between transactions
4. Detailed logging for debugging

For production testing in CI/CD pipelines, consider using the dedicated script approach which provides the most stable execution.