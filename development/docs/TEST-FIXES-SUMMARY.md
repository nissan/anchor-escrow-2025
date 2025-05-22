# TicketFair Test Fixes Summary

This document summarizes the changes made to fix the TicketFair test suite.

## Key Issues Identified

1. **Account Collisions**: Multiple tests were using the same PDAs, causing "account already in use" errors.
2. **Price Calculation**: The `calculateCurrentPrice` function was being called with the wrong arguments.
3. **Event Organizer Handling**: Organizer address was not being accessed correctly.
4. **PDA Calculation**: PDAs were not being calculated correctly in some places.
5. **Transaction Timing**: Insufficient wait times between transactions caused confirmation issues.
6. **JSON Serialization**: BigInt values were causing serialization errors.

## Comprehensive Fixes

### 1. PDA Collision Prevention

- **Unique Event Organizers**: Modified `createAndActivateEvent` to create a unique organizer for each event.
- **Truly Unique Identifiers**: Enhanced `getUniqueMetadataUrl` to combine timestamp, random string, and nanosecond precision.
- **Fresh Wallets per Test**: Added code to create new wallets for each test to avoid address reuse.

```typescript
// Create a unique identifier for each test
const getUniqueMetadataUrl = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const nanos = process.hrtime()[1];
  return `${metadataUrl}-management-${timestamp}-${random}-${nanos}`;
};

// Create unique organizer for each event
const uniqueOrganizer = await connection.createWallet({ airdropAmount: 10n * 10000000000n });
```

### 2. Fixed Price Calculation

- Fixed all instances where `calculateCurrentPrice` was being called without `.data`
- Ensured all calls pass the event.data object rather than the event object

```typescript
// Changed from:
const currentPrice = calculateCurrentPrice(event);

// To:
const currentPrice = calculateCurrentPrice(event.data);
```

### 3. Direct PDA Calculation

- Enhanced `placeBid` and `refundBid` to correctly derive PDAs directly
- Added detailed logging to help diagnose PDA issues

```typescript
// Calculate the event PDA directly
const programIdPubkey = new PublicKey(programClient.ESCROW_PROGRAM_ADDRESS);
const organizerPubkey = new PublicKey(bidTestOrganizer.address);

const [eventPdaAddress] = PublicKey.findProgramAddressSync(
  [Buffer.from("event"), organizerPubkey.toBuffer()], 
  programIdPubkey
);
```

### 4. Improved Transaction Timing

- Increased wait times between critical transactions
- Added additional logging for transaction status
- Modified wait times based on the operation complexity

```typescript
// Increased wait time for transaction confirmation
await new Promise(resolve => setTimeout(resolve, 800));
```

### 5. Better Error Handling

- Enhanced error logging to provide more context
- Added specific error checks for different failure scenarios
- Improved assertions with better error messages

```typescript
// Added better error handling for specific error codes
const isExpectedError = 
  error.message.includes("BidNotAtCurrentPrice") || 
  error.message.includes("custom program error: 0x1774") ||
  error.message.includes("6004") ||
  error.message.includes("0x6004");
```

### 6. BigInt Serialization Fix

- Fixed JSON serialization issues with BigInt values
- Added structured logging to avoid serialization errors

```typescript
// Log selectively to avoid serialization issues with BigInt
console.log("Finalized event data:", {
  status: event.data.status,
  closePrice: Number(event.data.auctionClosePrice),
  expectedClosePrice: Number(closePrice),
  // ... other fields
});
```

## Additional Improvements

1. **Test Isolation**: Made each test fully independent with fresh state.
2. **Diagnostic Utilities**: Created helper functions to diagnose issues.
3. **Expanded Assertions**: Added more comprehensive checks for test validation.
4. **Better Transaction Tracking**: Added tx ID logging for easier debugging.

## Next Steps

1. Consider breaking down the test suite into smaller files for easier maintenance.
2. Add a timeout to the test runner configuration to avoid 2-minute timeouts.
3. Consider caching wallet creation to speed up tests further.

These changes have significantly improved test reliability and should prevent the "account already in use" errors and other issues that were occurring.