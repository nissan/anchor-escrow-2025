import { before, describe, it } from "node:test";
import assert from "node:assert";
import * as programClient from "../dist/js-client";
import { connect, Connection } from "solana-kite";
import { type KeyPairSigner, type Address, lamports } from "@solana/kit";
import { ONE_SOL } from "./escrow.test-helpers";
import { PublicKey } from "@solana/web3.js";
import {
  calculateCurrentPrice,
  createAndActivateEvent,
  placeBid,
  finalizeAuction,
  BID_STATUS,
  EVENT_STATUS
} from "./ticketfair.test-helpers";
import { refundBidImproved } from "./refundBid.test-fix";

describe("Refund Tests", () => {
  let connection: Connection;
  let organizer: KeyPairSigner;
  let merkleTree: KeyPairSigner;
  let bubblegumProgram: KeyPairSigner;
  let logWrapper: KeyPairSigner;
  let compressionProgram: KeyPairSigner;
  let noopProgram: KeyPairSigner;
  let buyer: KeyPairSigner;

  let eventAddress: Address;
  let eventOrganizer: KeyPairSigner;

  // Test parameters
  const metadataUrl = "https://example.com/event-metadata-refund.json";
  const ticketSupply = 10;
  const startPrice = BigInt(ONE_SOL); // 1 SOL
  const endPrice = BigInt(ONE_SOL) / 10n; // 0.1 SOL

  before(async () => {
    connection = await connect();

    // Create all the required accounts
    [organizer, buyer, merkleTree, bubblegumProgram, logWrapper, compressionProgram, noopProgram] =
      await connection.createWallets(7, { airdropAmount: ONE_SOL * 10n });

    // Wait for airdrop transactions to confirm
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create an event for testing
    const currentTime = Math.floor(Date.now() / 1000);
    const result = await createAndActivateEvent(connection, {
      organizer,
      merkleTree,
      bubblegumProgram,
      logWrapper,
      compressionProgram,
      noopProgram,
      metadataUrl,
      ticketSupply,
      startPrice,
      endPrice,
      auctionStartTime: BigInt(currentTime - 60), // Start 1 minute ago
      auctionEndTime: BigInt(currentTime + 3600), // End in 1 hour
    });

    eventAddress = result.eventAddress;
    eventOrganizer = result.organizer;

    // Wait for event creation to confirm
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it("refunds a losing bid in full", async () => {
    // Get the event data
    const eventData = await programClient.fetchEvent(connection.rpc, eventAddress);
    assert.ok(eventData, "Event data should exist");

    // Calculate current price
    const currentPrice = calculateCurrentPrice({
      startPrice: eventData.data.startPrice,
      endPrice: eventData.data.endPrice,
      auctionStartTime: eventData.data.auctionStartTime,
      auctionEndTime: eventData.data.auctionEndTime
    });

    // Record initial balance
    const initialBalance = await connection.rpc.getBalance(buyer.address);
    console.log("Initial balance:", initialBalance);

    // Place a bid
    const bidResult = await placeBid(connection, {
      bidder: buyer,
      event: eventAddress,
      amount: currentPrice
    });

    // Verify bid was placed
    const bidData = await programClient.fetchBid(connection.rpc, bidResult.bidAddress);
    assert.strictEqual(bidData.status, BID_STATUS.PENDING, "Bid should be PENDING");

    // Finalize the auction
    await finalizeAuction(connection, {
      organizer: eventOrganizer,
      event: eventAddress,
      closePrice: currentPrice,
    });

    // Verify auction was finalized
    const finalizedEventData = await programClient.fetchEvent(connection.rpc, eventAddress);
    assert.strictEqual(finalizedEventData.data.status, EVENT_STATUS.FINALIZED, "Event should be FINALIZED");

    // Refund the bid
    await refundBidImproved(connection, {
      bidder: buyer,
      event: eventAddress,
      bid: bidResult.bidAddress,
      eventOrganizer: eventOrganizer.address
    });

    // Verify bid was refunded
    const refundedBidData = await programClient.fetchBid(connection.rpc, bidResult.bidAddress);
    assert.strictEqual(refundedBidData.status, BID_STATUS.REFUNDED, "Bid should be REFUNDED");

    // Check final balance
    const finalBalance = await connection.rpc.getBalance(buyer.address);
    console.log("Final balance:", finalBalance);

    // Allow for gas fees
    const gasFeeAllowance = BigInt(10000000); // 0.01 SOL
    const balanceCheck = finalBalance + gasFeeAllowance >= initialBalance;
    assert.ok(balanceCheck, "Buyer should have received a full refund (accounting for gas fees)");
  });
});