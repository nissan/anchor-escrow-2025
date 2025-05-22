# Phase 1 Testing: Ticketfair Dutch Auction

This document summarizes the Anchor integration tests implemented for Phase 1 of the Ticketfair Dutch auction program. All tests are deterministic and validate both success and error/edge cases for the core auction flows.

## Test Coverage

### 1. Event Creation
- **What is tested:**
  - Creating an event with valid parameters (organizer, metadata URL, ticket supply, auction times, prices, Merkle Tree, etc.).
- **Criteria:**
  - All event account fields are set correctly.
  - Asset IDs are empty at creation.
- **Assertions:**
  - Each field in the event account matches the input and expected defaults.

### 2. Bid Placement
- **What is tested:**
  - Placing a valid bid at the current auction price.
- **Criteria:**
  - Bid account is created with correct fields.
  - Status is set to pending.
- **Assertions:**
  - Bidder, event, amount, and status fields are correct.

### 3. Ticket Awarding
- **What is tested:**
  - Awarding a ticket to a valid bid.
- **Criteria:**
  - Ticket account is created with correct fields.
  - Status is set to owned.
  - cNFT asset ID is tracked.
- **Assertions:**
  - Owner, event, status, and cnft_asset_id fields are correct.

### 4. Refunds
- **What is tested:**
  - Full refund for a losing bid.
  - Partial refund for a winning bid (overbid).
- **Criteria:**
  - Bid status is updated to refunded (for losing bid).
  - Refund amount is correct for overbid.
- **Assertions:**
  - Status and refund amount are as expected.

### 5. Bubblegum cNFT Logic
- **What is tested:**
  - Minting cNFTs to the PDA at event creation.
  - Transferring cNFTs to winners on award.
  - Burning unsold cNFTs at auction close.
- **Criteria:**
  - Asset IDs are tracked in the event account.
  - Ownership and burning logic are simulated and asserted.
- **Assertions:**
  - Asset ID vector length and contents are correct after mint, transfer, and burn operations.

## Notes
- All tests are deterministic and use fixed test pubkeys and timestamps for reproducibility.
- Error and edge cases (e.g., invalid status, overbid, already refunded) are explicitly checked.
- These tests ensure the correctness of all core flows before proceeding to Phase 2 (randomness integration). 