# TicketFair TypeScript Test Update Plan

The TypeScript tests for the TicketFair platform need updating to match the latest program changes made during Phase 1 implementation. This document outlines the approach and specific updates needed.

## Current Issues

1. **Instruction Index Mismatches**
   - The test file uses hardcoded instruction indices that no longer match the program
   - Several instruction handlers have been added/modified
   - We began updating these to use the client methods (e.g., for activate_event, place_bid)

2. **PublicKey Handling Issues**
   - Many tests fail with `Cannot read properties of undefined (reading '_bn')` errors
   - This appears to be due to incompatibilities between the PublicKey handling in the tests versus client

3. **Account Validation Errors**
   - Some instructions fail with account validation errors like "The program expected this account to be already initialized"
   - The finalize_auction test appears to be failing with this kind of error

4. **Missing Proper Client Usage**
   - Several tests manually construct transactions instead of using the generated client
   - We've updated some but a more comprehensive approach is needed

5. **Feature Flags**
   - Tests don't account for feature flag conditionals in the program
   - Some tests might be trying to access account fields that don't exist in the current version

## Update Approach

### 1. Client Generation

```bash
# Regenerate the TypeScript client
npx tsx create-codama-client.ts

# Verify the client matches the latest IDL
cat dist/js-client/index.ts
```

### 2. Test File Updates

#### Update Instruction Indices

Replace hardcoded instruction indices with references to client methods:

```typescript
// Instead of:
data: Buffer.from([6]), // 6 is the index for activate_event instruction

// Use:
const activateEventIx = await programClient.getActivateEventInstructionAsync({
  organizer,
  event: eventAddress,
});
```

#### Add Tests for New Instructions

```typescript
it("finalizes auction with a closing price", async () => {
  // Code to finalize the auction
  const finalizeAuctionIx = await programClient.getFinalizeAuctionInstructionAsync({
    organizer,
    event: eventAddress,
    closePrice: closePrice,
  });
  
  // Send the transaction
  await connection.sendTransactionFromInstructions({
    feePayer: organizer,
    instructions: [finalizeAuctionIx],
  });
  
  // Verify the event was finalized
  const event = await programClient.fetchEvent(connection.rpc, eventAddress);
  assert.strictEqual(event.status, 2); // Finalized
  assert.strictEqual(event.auctionClosePrice, closePrice);
});
```

#### Fix Account References

Ensure all account references match the updated program constraints:

```typescript
// Include all required accounts
const placeBidIx = await programClient.getPlaceBidInstructionAsync({
  bidder: buyer1,
  event: eventAddress,
  eventAuthority: eventPdaAddress,
  bid: bidAddress,
  amount: currentPrice,
});
```

### 3. Test Organization

Restructure tests into logical sections:

1. **Event Management Tests**
   - Event creation
   - Event activation
   - Event finalization
   
2. **Bidding Tests**
   - Bid placement (valid/invalid)
   - Price calculation verification
   
3. **Ticket Management Tests**
   - Ticket awarding
   - Supply limitations
   
4. **Refund Tests**
   - Full refunds
   - Partial refunds
   - Refund validations

### 4. Helper Functions

Create helper functions for common test operations:

```typescript
// Helper to create and activate an event
async function createAndActivateEvent(params) {
  // Implementation...
  return { eventAddress, eventPdaAddress };
}

// Helper to calculate current auction price
function calculateCurrentPrice(event, now) {
  // Implementation...
  return currentPrice;
}

// Helper to place a bid
async function placeBid(bidder, event, amount) {
  // Implementation...
  return { bidAddress, tx };
}
```

## Implementation Plan

1. **Phase 1: Client Update**
   - Regenerate TypeScript client
   - Verify instruction definitions
   - Test client methods in isolation

2. **Phase 2: Core Test Fixes**
   - Update instruction indices
   - Fix account references
   - Update data structures

3. **Phase 3: Test Enhancement**
   - Add missing test cases
   - Improve error handling
   - Add test helpers

4. **Phase 4: Validation**
   - Ensure all tests pass
   - Verify coverage of all program features
   - Document any remaining issues

## Specific Tasks

- [ ] Update `createTxInstruction` calls to use client methods
- [ ] Fix instruction indices in all test cases
- [ ] Add tests for `finalize_auction`
- [ ] Update error constants to match program errors
- [ ] Create helper functions for common test operations
- [ ] Add validation for auction price calculations
- [ ] Update event status constants
- [ ] Fix account constraints for each instruction
- [ ] Add tests for edge cases (e.g., auction timing limits)
- [ ] Document any workarounds needed for testing

## Notes

- The focus should be on making the tests accurately reflect the current program behavior
- Some tests may need to be temporarily disabled if they depend on features planned for future phases
- Consider adding more robust test utilities to make future updates easier
- Test against both local and devnet deployments to ensure consistency