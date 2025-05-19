# TicketFair API Examples

This directory contains examples demonstrating how to use the TicketFair API for interacting with the TicketFair auction platform.

## Available Examples

- `place-bid-example.ts`: Demonstrates how to place a bid on an active TicketFair event auction

## Using the TicketFair API

The TicketFair API provides a set of high-level functions for interacting with the TicketFair platform:

```typescript
import { 
  createAndActivateEvent,
  placeBid,
  awardTicket,
  refundBid,
  finalizeAuction,
  calculateCurrentPrice,
  EVENT_STATUS,
  BID_STATUS
} from "../src/ticketfair-api";
```

### Key Functions

1. **`createAndActivateEvent`**: Creates and activates a new TicketFair event with Dutch auction
2. **`placeBid`**: Places a bid at the current auction price
3. **`awardTicket`**: Awards a ticket to a winning bidder
4. **`refundBid`**: Processes refunds for bids
5. **`finalizeAuction`**: Finalizes an auction with a closing price
6. **`calculateCurrentPrice`**: Helper to calculate the current Dutch auction price

### Example Usage

Here's a simple example of placing a bid:

```typescript
import { connect } from "solana-kite";
import { placeBid, calculateCurrentPrice } from "../src/ticketfair-api";
import * as programClient from "../dist/js-client";

async function example() {
  // Connect to Solana
  const connection = await connect();
  
  // Get bidder wallet
  const bidder = await connection.getWallet("path/to/keypair.json");
  
  // Fetch event data
  const eventAddress = "EVENT_ADDRESS_HERE";
  const event = await programClient.fetchEvent(connection.rpc, eventAddress);
  
  // Calculate current price
  const currentPrice = calculateCurrentPrice(event.data);
  
  // Place bid
  const { bidAddress, tx } = await placeBid(connection, {
    bidder,
    event: eventAddress,
    amount: currentPrice,
  });
  
  console.log(`Bid placed with tx: ${tx}`);
}
```

## Running Examples

To run an example:

1. Build the project first:
   ```
   npm run build
   ```

2. Generate the TypeScript client:
   ```
   npx tsx create-codama-client.ts
   ```

3. Update the example with your specific values (event addresses, etc.)

4. Run the example:
   ```
   npx tsx examples/place-bid-example.ts
   ```

## Notes

- The examples are designed to demonstrate API usage but may need to be modified with real addresses and accounts
- Always test on devnet before using in production
- Make sure your wallet has sufficient SOL for the bid amount plus transaction fees