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

// Helper function to wait for a specific duration with a message
const wait = (ms: number, message = `Waiting ${ms}ms...`) => {
  console.log(message);
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Helper function to retry an operation with exponential backoff
async function retry<T>(
  operation: () => Promise<T>,
  description: string,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}: ${description}`);
      return await operation();
    } catch (error) {
      console.log(`Failed attempt ${attempt}/${maxRetries}: ${error.message}`);
      lastError = error;
      await wait(delay, `Waiting ${delay}ms before retry...`);
      delay *= 2; // Exponential backoff
    }
  }

  throw lastError || new Error(`Failed after ${maxRetries} attempts: ${description}`);
}

describe("Focused Refund Test", () => {
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

  // Test parameters - with unique identifier to avoid collisions
  const testId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  const metadataUrl = `https://example.com/event-metadata-refund-${testId}.json`;
  const ticketSupply = 5; // Reduced for faster testing
  const startPrice = BigInt(ONE_SOL); // 1 SOL
  const endPrice = BigInt(ONE_SOL) / 10n; // 0.1 SOL

  // Used to determine if we should skip some tests due to errors in setup
  let setupSuccessful = false;

  before(async () => {
    console.log("=== REFUND TEST SETUP START ===");
    try {
      // Connect to Solana
      connection = await connect();
      console.log("Connected to local validator");

      // Create wallets with sufficient funds
      console.log("Creating test wallets...");
      [organizer, buyer, merkleTree, bubblegumProgram, logWrapper, compressionProgram, noopProgram] =
        await connection.createWallets(7, { airdropAmount: ONE_SOL * 10n });
      
      // Wait for airdrops to confirm
      await wait(3000, "Waiting for airdrop confirmation...");

      // Create an event for testing with clear timing
      const currentTime = Math.floor(Date.now() / 1000);
      console.log(`Creating test event at time ${currentTime}...`);
      
      // Event timing: started 60 seconds ago, ends in 30 minutes (shorter for testing)
      const result = await retry(
        () => createAndActivateEvent(connection, {
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
          auctionStartTime: BigInt(currentTime - 60),
          auctionEndTime: BigInt(currentTime + 1800), // 30 minutes
        }),
        "Creating and activating event",
        3,
        1500
      );

      eventAddress = result.eventAddress;
      eventOrganizer = result.organizer;
      console.log(`Event created with address: ${eventAddress}`);
      console.log(`Event organizer: ${eventOrganizer.address}`);
      
      // Wait for event creation to confirm and stabilize
      await wait(2000, "Waiting for event to stabilize...");
      
      // Verify event was created properly
      const eventData = await programClient.fetchEvent(connection.rpc, eventAddress);
      assert.ok(eventData, "Event should exist");
      assert.strictEqual(eventData.data.status, EVENT_STATUS.ACTIVE, "Event should be ACTIVE");
      
      setupSuccessful = true;
      console.log("=== REFUND TEST SETUP COMPLETE ===");
    } catch (error) {
      console.error("Setup failed:", error);
      console.log("=== REFUND TEST SETUP FAILED ===");
    }
  });

  it("refunds a losing bid in full", async () => {
    console.log("=== FULL REFUND TEST START ===");
    
    // If setup failed, we need to attempt it again in the test
    if (!setupSuccessful) {
      console.log("Setup was not successful, attempting setup in the test itself");
      try {
        // Connect to Solana
        connection = await connect();
        console.log("Connected to local validator");

        // Create wallets with sufficient funds
        console.log("Creating test wallets...");
        [organizer, buyer, merkleTree, bubblegumProgram, logWrapper, compressionProgram, noopProgram] =
          await connection.createWallets(7, { airdropAmount: ONE_SOL * 10n });
        
        // Wait for airdrops to confirm
        await wait(3000, "Waiting for airdrop confirmation...");

        // Create an event for testing with clear timing
        const currentTime = Math.floor(Date.now() / 1000);
        console.log(`Creating test event at time ${currentTime}...`);
        
        // Event timing: started 60 seconds ago, ends in 30 minutes (shorter for testing)
        const result = await retry(
          () => createAndActivateEvent(connection, {
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
            auctionStartTime: BigInt(currentTime - 60),
            auctionEndTime: BigInt(currentTime + 1800), // 30 minutes
          }),
          "Creating and activating event",
          3,
          1500
        );

        eventAddress = result.eventAddress;
        eventOrganizer = result.organizer;
        console.log(`Event created with address: ${eventAddress}`);
        console.log(`Event organizer: ${eventOrganizer.address}`);
        
        // Wait for event creation to confirm and stabilize
        await wait(2000, "Waiting for event to stabilize...");
        
        // Verify event was created properly
        const eventData = await programClient.fetchEvent(connection.rpc, eventAddress);
        assert.ok(eventData, "Event should exist");
        assert.strictEqual(eventData.data.status, EVENT_STATUS.ACTIVE, "Event should be ACTIVE");
      } catch (error) {
        console.error("Failed to setup test during the test run:", error);
        // Instead of skipping, we'll fail the test explicitly
        assert.fail("Test setup failed both in before hook and in test itself");
      }
    }
    
    // Only proceed if we have valid data
    try {
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
      console.log(`Current price: ${currentPrice}`);

      // Record initial balance
      const initialBalance = await connection.rpc.getBalance(buyer.address);
      console.log(`Initial balance: ${initialBalance}`);

      // Place a bid with retry
      console.log("Placing bid...");
      const bidResult = await retry(
        () => placeBid(connection, {
          bidder: buyer,
          event: eventAddress,
          amount: currentPrice
        }),
        "Placing bid",
        3,
        1500
      );
      console.log(`Bid placed with address: ${bidResult.bidAddress}`);

      // Wait for bid to confirm
      await wait(2000, "Waiting for bid to confirm...");

      // Verify bid was placed correctly
      const bidData = await programClient.fetchBid(connection.rpc, bidResult.bidAddress);
      assert.strictEqual(bidData.status, BID_STATUS.PENDING, "Bid should be PENDING");
      console.log("Bid verified as PENDING");

      // Finalize the auction with retry
      console.log("Finalizing auction...");
      await retry(
        () => finalizeAuction(connection, {
          organizer: eventOrganizer,
          event: eventAddress,
          closePrice: currentPrice,
        }),
        "Finalizing auction",
        3,
        1500
      );

      // Wait for finalization to confirm
      await wait(2000, "Waiting for auction finalization to confirm...");

      // Verify auction was finalized
      const finalizedEventData = await programClient.fetchEvent(connection.rpc, eventAddress);
      assert.strictEqual(finalizedEventData.data.status, EVENT_STATUS.FINALIZED, "Event should be FINALIZED");
      console.log("Event finalized successfully");

      // Refund the bid with retry
      console.log("Refunding bid...");
      await retry(
        () => refundBidImproved(connection, {
          bidder: buyer,
          event: eventAddress,
          bid: bidResult.bidAddress,
          eventOrganizer: eventOrganizer.address
        }),
        "Refunding bid",
        3,
        1500
      );

      // Wait for refund to confirm
      await wait(2000, "Waiting for refund to confirm...");

      // Verify bid was refunded
      const refundedBidData = await programClient.fetchBid(connection.rpc, bidResult.bidAddress);
      assert.strictEqual(refundedBidData.status, BID_STATUS.REFUNDED, "Bid should be REFUNDED");
      console.log("Bid successfully refunded");

      // Check final balance
      const finalBalance = await connection.rpc.getBalance(buyer.address);
      console.log(`Final balance: ${finalBalance}`);

      // Allow for gas fees
      const gasFeeAllowance = BigInt(20000000); // 0.02 SOL for transaction fees
      const balanceCheck = finalBalance + gasFeeAllowance >= initialBalance;
      
      console.log("Balance comparison:", {
        initialBalance: initialBalance.toString(),
        finalBalance: finalBalance.toString(),
        difference: (initialBalance - finalBalance).toString(),
        gasFeeAllowance: gasFeeAllowance.toString()
      });
      
      assert.ok(balanceCheck, "Buyer should have received a full refund (accounting for gas fees)");
      console.log("=== FULL REFUND TEST PASSED ===");
    } catch (error) {
      console.error("Test failed:", error);
      console.log("=== FULL REFUND TEST FAILED ===");
      throw error;
    }
  });
});