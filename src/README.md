# TicketFair API

This directory contains the TypeScript API for interacting with the TicketFair auction platform built on Solana.

## Overview

The TicketFair API provides a set of high-level functions for working with the TicketFair auction system, which enables:

- Creating and activating events with Dutch auction parameters
- Placing bids on tickets at the current auction price
- Awarding tickets to winning bidders
- Processing refunds for unsuccessful or partial bids
- Finalizing auctions with a closing price

## API Reference

### Core Functions

#### `calculateCurrentPrice`

Calculates the current Dutch auction price based on the event parameters and current time.

```typescript
function calculateCurrentPrice(
  event: {
    startPrice: bigint;
    endPrice: bigint;
    auctionStartTime: bigint;
    auctionEndTime: bigint;
  },
  now: number = Math.floor(Date.now() / 1000)
): bigint
```

#### `createAndActivateEvent`

Creates and activates a new TicketFair event with Dutch auction parameters.

```typescript
async function createAndActivateEvent(
  connection: Connection,
  params: {
    organizer: KeyPairSigner;
    merkleTree: Address;
    bubblegumProgram: Address;
    logWrapper: Address;
    compressionProgram: Address;
    noopProgram: Address;
    metadataUrl: string;
    ticketSupply: number;
    startPrice: bigint;
    endPrice: bigint;
    auctionStartTime: bigint;
    auctionEndTime: bigint;
  }
): Promise<{ 
  eventAddress: string;
  eventPdaAddress: string;
  createTx: string;
  activateTx: string;
}>
```

#### `placeBid`

Places a bid on a TicketFair event at the current auction price.

```typescript
async function placeBid(
  connection: Connection,
  params: {
    bidder: KeyPairSigner;
    event: Address;
    amount: bigint;
  }
): Promise<{ 
  bidAddress: string;
  tx: string;
}>
```

#### `awardTicket`

Awards a ticket to a winning bidder.

```typescript
async function awardTicket(
  connection: Connection,
  params: {
    organizer: KeyPairSigner;
    event: Address;
    bid: Address;
    buyer: Address;
    merkleTree: Address;
    bubblegumProgram: Address;
    logWrapper: Address;
    compressionProgram: Address;
    noopProgram: Address;
    cnftAssetId: PublicKey;
  }
): Promise<{
  ticketAddress: string;
  tx: string;
}>
```

#### `refundBid`

Processes a refund for a bid (full refund for unsuccessful bids or partial refund for bids above closing price).

```typescript
async function refundBid(
  connection: Connection,
  params: {
    bidder: KeyPairSigner;
    event: Address;
    bid: Address;
    eventPda: Address;
  }
): Promise<{
  tx: string;
}>
```

#### `finalizeAuction`

Finalizes an auction with a closing price.

```typescript
async function finalizeAuction(
  connection: Connection,
  params: {
    organizer: KeyPairSigner;
    event: Address;
    closePrice: bigint;
  }
): Promise<{
  tx: string;
}>
```

### Constants

The API also provides constants for working with program-specific states:

```typescript
// Event status constants
export const EVENT_STATUS = {
  CREATED: 0,
  ACTIVE: 1,
  FINALIZED: 2,
};

// Bid status constants
export const BID_STATUS = {
  PENDING: 0,
  TICKET_AWARDED: 1,
  REFUNDED: 2,
};
```

## Usage Example

Here's a simple example of placing a bid:

```typescript
import { connect } from "solana-kite";
import { placeBid, calculateCurrentPrice } from "./ticketfair-api";
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
  
  // Ensure price is a BigInt
  const bidAmount = typeof currentPrice === 'bigint' 
    ? currentPrice 
    : BigInt(currentPrice.toString());
  
  // Place bid
  const { bidAddress, tx } = await placeBid(connection, {
    bidder,
    event: eventAddress,
    amount: bidAmount,
  });
  
  console.log(`Bid placed with tx: ${tx}`);
  console.log(`Bid address: ${bidAddress}`);
}
```

## Implementation Notes

1. The API handles deriving the appropriate PDAs (Program Derived Addresses) for events, bids, and tickets.

2. When placing a bid, the API:
   - Calculates the event PDA from the organizer
   - Derives a unique bid PDA for the specific bidder
   - Ensures the bid amount is a properly formatted BigInt
   - Returns both the bid address and transaction signature

3. All functions that interact with the blockchain return transaction signatures, allowing for confirmation tracking.

4. Error handling is delegated to the caller, allowing for custom error management strategies.

## Dependencies

- `solana-kite`: Connection management and transaction handling
- `@solana/kit`: Solana wallet and signer utilities
- `@solana/web3.js`: Solana web3 library for working with PDAs and PublicKeys
- Generated JavaScript client from the Anchor IDL