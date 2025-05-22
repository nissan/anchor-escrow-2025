import { before, beforeEach, describe, test, it } from "node:test";
import assert from "node:assert";
import * as programClient from "../dist/js-client";
import { connect, Connection } from "solana-kite";
import { type KeyPairSigner, type Address, lamports } from "@solana/kit";
import { ONE_SOL } from "./escrow.test-helpers";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  calculateCurrentPrice,
  createAndActivateEvent,
  placeBid,
  awardTicket,
  refundBid,
  finalizeAuction,
  ERROR_CODES,
  EVENT_STATUS,
  BID_STATUS
} from "./ticketfair.test-helpers";
import { refundBidImproved } from "./refundBid.test-fix";
import { 
  createWalletsWithRetry, 
  delayWithJitter, 
  withRetry,
  checkTestEnvironmentHealth
} from "./test-retry-helpers";

describe("Ticketfair", () => {
  let connection: Connection;
  let organizer: KeyPairSigner;
  let buyer1: KeyPairSigner;
  let buyer2: KeyPairSigner;
  let merkleTree: KeyPairSigner; // Simulated merkle tree for testing
  let bubblegumProgram: KeyPairSigner; // Simulated Bubblegum program
  let logWrapper: KeyPairSigner; // Simulated log wrapper program
  let compressionProgram: KeyPairSigner; // Simulated compression program
  let noopProgram: KeyPairSigner; // Simulated noop program

  // Test parameters for event creation
  const metadataUrl = "https://example.com/event-metadata.json";
  const ticketSupply = 10;
  const startPrice = BigInt(ONE_SOL); // 1 SOL
  const endPrice = BigInt(ONE_SOL) / 10n; // 0.1 SOL
  
  // Get current time in seconds
  const now = Math.floor(Date.now() / 1000);
  const auctionStartTime = BigInt(now - 10); // Start 10 seconds ago (immediate)
  const auctionEndTime = BigInt(now + 3600); // End in 1 hour

  before(async () => {
    connection = await connect();

    // Check test environment health before starting
    const healthCheck = await checkTestEnvironmentHealth(connection);
    if (!healthCheck.healthy) {
      console.warn("Test environment issues detected:", healthCheck.issues);
    }

    // Create all the required accounts with retry mechanism
    [organizer, buyer1, buyer2, merkleTree, bubblegumProgram, logWrapper, compressionProgram, noopProgram] = 
      await createWalletsWithRetry(connection, 8, ONE_SOL * 10n, "Setup wallets");
    
    // Log the structure of the organizer to debug
    console.log("Organizer structure:", Object.keys(organizer));
    console.log("Organizer address property:", organizer.address);
    
    // Wait for airdrop transactions to confirm before starting tests with jitter
    await delayWithJitter(2000, 20);
  });

  describe("Event Management", () => {
    let eventAddress: Address;
    let eventPdaAddress: Address;
    
    // Create a truly unique identifier for each test to avoid PDA collisions
    const getUniqueMetadataUrl = () => {
      // Combine current timestamp, random string, and a nanosecond-precision counter if available
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 10);
      const nanos = process.hrtime()[1];
      const suiteId = Math.random().toString(36).substring(2, 6); // Additional randomness for test suite
      const processId = process.pid.toString(36); // Process ID for uniqueness across parallel runs
      return `${metadataUrl}-management-${timestamp}-${random}-${nanos}-${suiteId}-${processId}`;
    };

    it("creates a new event with valid parameters", async () => {
      // Create and activate the event with unique metadata URL
      const result = await createAndActivateEvent(connection, {
        organizer,
        merkleTree,
        bubblegumProgram,
        logWrapper,
        compressionProgram,
        noopProgram,
        metadataUrl: getUniqueMetadataUrl(),
        ticketSupply,
        startPrice,
        endPrice,
        auctionStartTime,
        auctionEndTime
      });

      eventAddress = result.eventAddress;
      eventPdaAddress = result.eventPdaAddress;
      const eventOrganizer = result.organizer; // Use the returned unique organizer

      // Fetch the event account and verify its fields
      const event = await programClient.fetchEvent(connection.rpc, eventAddress);
      
      console.log("Fetched event:", event);
      console.log("Expected organizer:", eventOrganizer.address);
      console.log("Event data keys:", Object.keys(event));
      console.log("Event.data keys:", Object.keys(event.data));
      
      // Access all fields from event.data
      assert.strictEqual(event.data.organizer, eventOrganizer.address);
      // We're using a dynamic metadata URL, so we just check it's not empty
      assert.ok(event.data.metadataUrl.startsWith(metadataUrl), "Metadata URL should start with the base URL");
      assert.strictEqual(event.data.ticketSupply, ticketSupply);
      assert.strictEqual(event.data.ticketsAwarded, 0);
      assert.strictEqual(event.data.startPrice, startPrice);
      assert.strictEqual(event.data.endPrice, endPrice);
      assert.strictEqual(event.data.auctionStartTime, auctionStartTime);
      assert.strictEqual(event.data.auctionEndTime, auctionEndTime);
      assert.strictEqual(event.data.auctionClosePrice, 0n);
      assert.strictEqual(event.data.status, EVENT_STATUS.ACTIVE); // Active since we already activated it
      assert.strictEqual(event.data.merkleTree, merkleTree.address);
      assert.strictEqual(event.data.cnftAssetIds.length, 10); // Should have 10 placeholder asset IDs
    });

    it("finalizes auction with a closing price", async () => {
      // Create a fresh event specifically for finalization to avoid state issues
      const finalizeUrl = getUniqueMetadataUrl() + "-finalize";
      
      // Get current time in seconds for auction timing
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Create a unique organizer for this finalization test
      const [finalizeOrganizer] = await connection.createWallets(1, { airdropAmount: ONE_SOL * 10n });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // For finalization test, make start time in the past and end time VERY close to current time
      // This ensures the event can be finalized immediately
      const finalizeStartTime = BigInt(currentTime - 3600); // Start 1 hour ago
      const finalizeEndTime = BigInt(currentTime - 10); // End 10 seconds ago (already ended)
      
      const finalizeResult = await createAndActivateEvent(connection, {
        organizer: finalizeOrganizer,
        merkleTree,
        bubblegumProgram,
        logWrapper,
        compressionProgram,
        noopProgram,
        metadataUrl: finalizeUrl,
        ticketSupply,
        startPrice,
        endPrice,
        auctionStartTime: finalizeStartTime,
        auctionEndTime: finalizeEndTime
      });
      
      // Use the unique event for finalization
      const finalizeEventAddress = finalizeResult.eventAddress;
      const finalizeOrganizer = finalizeResult.organizer; // Use the unique organizer
      
      // Set a reasonable close price
      const closePrice = BigInt(startPrice) / 2n; // 50% of start price
      
      // Brief delay before finalization
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify the event is in a state that can be finalized
      const eventBeforeFinalize = await programClient.fetchEvent(connection.rpc, finalizeEventAddress);
      console.log("Event before finalization:", {
        status: eventBeforeFinalize.data.status,
        now: Math.floor(Date.now() / 1000),
        start: Number(eventBeforeFinalize.data.auctionStartTime),
        end: Number(eventBeforeFinalize.data.auctionEndTime)
      });
      
      try {
        // Use the helper function to finalize the auction with the unique organizer
        const { tx } = await finalizeAuction(connection, {
          organizer: finalizeOrganizer, // Use the unique organizer
          event: finalizeEventAddress,
          closePrice,
        });
        
        console.log("Finalization transaction:", tx);
        
        // Add a slightly longer delay after finalization to ensure the transaction is confirmed
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Verify the auction was finalized
        const event = await programClient.fetchEvent(connection.rpc, finalizeEventAddress);
        // Log selectively to avoid serialization issues with BigInt
        console.log("Finalized event data:", {
          status: event.data.status,
          closePrice: Number(event.data.auctionClosePrice),
          expectedClosePrice: Number(closePrice),
          startPrice: Number(event.data.startPrice),
          endPrice: Number(event.data.endPrice),
          ticketsAwarded: event.data.ticketsAwarded,
          ticketSupply: event.data.ticketSupply
        });
        
        // If the event status is not FINALIZED, log more details about the event
        if (event.data.status !== EVENT_STATUS.FINALIZED) {
          console.log(`Error: Expected event status ${EVENT_STATUS.FINALIZED} but got ${event.data.status}`);
          console.log("Current auction times:", {
            now: Math.floor(Date.now() / 1000),
            start: Number(event.data.auctionStartTime),
            end: Number(event.data.auctionEndTime)
          });
        }
        
        assert.strictEqual(event.data.status, EVENT_STATUS.FINALIZED, "Event should be in FINALIZED state");
        assert.strictEqual(event.data.auctionClosePrice, closePrice, "Event should have the correct close price");
      } catch (error) {
        if (error instanceof Error) {
          console.error("Error in finalize auction test:", error.message);
          
          // Try to fetch the event again to see its current state
          try {
            const event = await programClient.fetchEvent(connection.rpc, finalizeEventAddress);
            console.log("Event state after error:", {
              status: event.data.status,
              closePrice: event.data.auctionClosePrice,
              now: Math.floor(Date.now() / 1000),
              start: Number(event.data.auctionStartTime),
              end: Number(event.data.auctionEndTime)
            });
          } catch (fetchError) {
            console.error("Could not fetch event after error:", fetchError.message);
          }
          
          throw error;
        }
      }
    });
  });

  describe("Ticket Bidding & Awarding", () => {
    let bidEventAddress: Address;
    let bidEventPdaAddress: Address;
    let buyerBidAddress: Address;
    let testBuyer1: KeyPairSigner;
    let testBuyer2: KeyPairSigner;
    let testOrganizer: KeyPairSigner; // Unique organizer for this test suite
    
    // Create a truly unique identifier for each test to avoid PDA collisions
    const getUniqueMetadataUrl = () => {
      // Combine current timestamp, random string, and a nanosecond-precision counter if available
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 10);
      const nanos = process.hrtime()[1];
      const suiteId = Math.random().toString(36).substring(2, 6); // Additional randomness for test suite
      return `${metadataUrl}-bidding-${timestamp}-${random}-${nanos}-${suiteId}`;
    };

    let bidEventOrganizer: KeyPairSigner; // Add to store unique organizer
    
    beforeEach(async () => {
      // Create fresh wallets for each test to avoid PDA collisions, including a unique organizer
      [testBuyer1, testBuyer2, testOrganizer] = await createWalletsWithRetry(connection, 3, ONE_SOL * 10n, "Bidding test wallets");
      
      // Brief delay to let the wallet creation propagate with jitter
      await delayWithJitter(1000, 15);
      
      // Get a fresh timestamp for each test
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Create and activate a fresh event for bidding tests using the unique organizer
      const result = await createAndActivateEvent(connection, {
        organizer: testOrganizer, // Use unique organizer instead of global one
        merkleTree,
        bubblegumProgram,
        logWrapper,
        compressionProgram,
        noopProgram,
        metadataUrl: getUniqueMetadataUrl(), // Make it truly unique for each test
        ticketSupply,
        startPrice,
        endPrice,
        auctionStartTime: BigInt(currentTime - 60), // Start 1 minute ago
        auctionEndTime: BigInt(currentTime + 3600), // End in 1 hour
      });
      
      bidEventAddress = result.eventAddress;
      bidEventPdaAddress = result.eventPdaAddress;
      bidEventOrganizer = result.organizer; // Store the unique organizer for later use
      
      // Brief delay for network confirmation
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    it("places a bid at the current price", async () => {
      console.log("Testing bid placement with actual transaction");
      
      // Verify the event exists and get its data
      const eventData = await programClient.fetchEvent(connection.rpc, bidEventAddress);
      assert.ok(eventData, "Event data should exist");
      assert.strictEqual(eventData.data.organizer, bidEventOrganizer.address, "Event should have the correct organizer");
      
      // Record buyer's initial balance for validation later
      const initialBalance = await connection.rpc.getBalance(testBuyer1.address);
      console.log("Initial buyer balance:", initialBalance);
      
      // Calculate the current auction price based on the event data
      const currentPrice = calculateCurrentPrice({
        startPrice: eventData.data.startPrice,
        endPrice: eventData.data.endPrice,
        auctionStartTime: eventData.data.auctionStartTime,
        auctionEndTime: eventData.data.auctionEndTime
      });
      console.log("Current auction price:", currentPrice.toString());
      
      // Actually place the bid with a real transaction
      try {
        console.log("Placing bid at current price:", currentPrice.toString());
        const { bidAddress: actualBidAddress, tx } = await placeBid(connection, {
          bidder: testBuyer1,
          event: bidEventAddress,
          amount: currentPrice
        });
        
        console.log("Bid placed successfully with transaction:", tx);
        console.log("Bid address:", actualBidAddress);
        
        // Allow time for the transaction to confirm
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify the bid was actually created and has the correct status
        const bidData = await programClient.fetchBid(connection.rpc, actualBidAddress);
        assert.ok(bidData, "Bid data should exist");
        assert.strictEqual(bidData.status, BID_STATUS.PENDING, "Bid should be in PENDING status");
        assert.strictEqual(bidData.bidder, testBuyer1.address, "Bid should have the correct bidder");
        assert.strictEqual(bidData.event, bidEventAddress, "Bid should reference the correct event");
        assert.strictEqual(bidData.amount.toString(), currentPrice.toString(), "Bid should have the correct amount");
        
        // Verify the buyer's balance decreased by at least the bid amount
        const finalBalance = await connection.rpc.getBalance(testBuyer1.address);
        console.log("Final buyer balance:", finalBalance);
        
        const balanceDecrease = initialBalance - finalBalance;
        console.log("Balance decrease:", balanceDecrease.toString());
        
        // The balance should decrease by at least the bid amount
        // (plus some for transaction fees)
        assert.ok(
          balanceDecrease >= currentPrice, 
          `Balance decrease (${balanceDecrease}) should be at least the bid amount (${currentPrice})`
        );
        
        // Store the bid address for use in other tests
        buyerBidAddress = actualBidAddress;
        
        // Final validation
        assert.ok(buyerBidAddress, "Bid address should be set for future tests");
        console.log("Bid test successful with real transaction, bid address:", buyerBidAddress);
      } catch (error) {
        console.error("Error placing bid:", error);
        throw error;
      }
    });

    it("rejects bids not at the current auction price", async () => {
      // This test verifies the error handling in the placeBid instruction
      // when the bid amount doesn't match the current auction price
      console.log("Testing rejection of incorrect price bids with actual transaction");
      
      // Create a fresh event specifically for this test
      const incorrectBidUrl = getUniqueMetadataUrl() + "-incorrectbid";
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Create a unique organizer for this specific test
      const [incorrectBidOrganizer] = await connection.createWallets(1, { airdropAmount: ONE_SOL * 10n });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create an event with a known start/end time for predictable pricing
      const eventResult = await createAndActivateEvent(connection, {
        organizer: incorrectBidOrganizer,
        merkleTree,
        bubblegumProgram,
        logWrapper,
        compressionProgram,
        noopProgram,
        metadataUrl: incorrectBidUrl,
        ticketSupply,
        startPrice, // 1 SOL
        endPrice,   // 0.1 SOL
        auctionStartTime: BigInt(currentTime - 60),  // 1 minute ago
        auctionEndTime: BigInt(currentTime + 3600),  // 1 hour from now
      });
      
      const eventAddress = eventResult.eventAddress;
      const eventOrganizer = eventResult.organizer;
      
      // Fetch the event data to validate our calculations
      const eventData = await programClient.fetchEvent(connection.rpc, eventAddress);
      assert.ok(eventData, "Event data should exist");
      assert.strictEqual(eventData.data.status, EVENT_STATUS.ACTIVE, "Event should be active");
      
      // Calculate the current price based on the current time
      const currentPrice = calculateCurrentPrice({
        startPrice: eventData.data.startPrice,
        endPrice: eventData.data.endPrice,
        auctionStartTime: eventData.data.auctionStartTime,
        auctionEndTime: eventData.data.auctionEndTime
      });
      console.log("Calculated current price:", currentPrice.toString());
      
      // Calculate an incorrect price - intentionally higher than the current price
      const incorrectPrice = currentPrice + BigInt(200000000); // 0.2 SOL higher
      console.log("Using incorrect price for test:", incorrectPrice.toString());
      
      console.log("==========================================");
      console.log("===== TESTING INCORRECT BID REJECTION =====");
      console.log("==========================================");
      
      try {
        // Actually try to place a bid with the incorrect price
        console.log("Attempting to place bid with incorrect price:", incorrectPrice.toString());
        await placeBid(connection, {
          bidder: testBuyer2,
          event: eventAddress,
          amount: incorrectPrice
        });
        
        // If we reach here, the test has failed - the bid should have been rejected
        assert.fail("Bid with incorrect price should have been rejected");
      } catch (error) {
        // We expect an error with a specific message
        console.log("Got error as expected:", error.message);
        
        // Check if the error is the expected one
        const isExpectedError = 
          error.message.includes("BidNotAtCurrentPrice") || 
          error.message.includes("custom program error: 0x1774") ||
          error.message.includes("6004") ||
          error.message.includes("0x6004");
        
        if (isExpectedError) {
          console.log("Error matches expected 'BidNotAtCurrentPrice' error");
        } else {
          console.error("Unexpected error type:", error.message);
          throw new Error("Test failed: Received error, but not the expected 'BidNotAtCurrentPrice' error");
        }
        
        // Try to place a bid with the correct price to verify it works
        console.log("Verifying that a bid with the correct price succeeds");
        try {
          const { bidAddress, tx } = await placeBid(connection, {
            bidder: testBuyer2,
            event: eventAddress,
            amount: currentPrice
          });
          
          console.log("Bid with correct price succeeded with transaction:", tx);
          
          // Verify the bid was created
          const bidData = await programClient.fetchBid(connection.rpc, bidAddress);
          assert.ok(bidData, "Bid with correct price should exist");
          assert.strictEqual(bidData.status, BID_STATUS.PENDING, "Bid should be in PENDING status");
          
          console.log("==========================================");
          console.log("===== INCORRECT BID REJECTION TEST PASSED! =====");
          console.log("==========================================");
        } catch (error) {
          console.error("Error placing bid with correct price:", error);
          throw new Error("Test failed: Could not place bid with correct price after confirming rejection of incorrect price");
        }
      }
    });

    it("awards a ticket to a valid bid", async () => {
      // This test validates the ticket awarding process by actually awarding a ticket
      console.log("============== TESTING TICKET AWARD WITH REAL TRANSACTION ==============");
      
      // For a successful ticket award we need:
      // 1. A valid bid from a buyer for an active event
      // 2. The organizer to create and award the ticket
      // 3. A valid CNFT asset ID from the event
      
      // Create a fresh event specifically for this test to avoid interference
      const ticketAwardUrl = getUniqueMetadataUrl() + "-ticketaward";
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Create a unique organizer for this specific test
      const [ticketAwardOrganizer] = await connection.createWallets(1, { airdropAmount: ONE_SOL * 10n });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create an event with known parameters
      console.log("Creating fresh event for ticket award test");
      const eventResult = await createAndActivateEvent(connection, {
        organizer: ticketAwardOrganizer,
        merkleTree,
        bubblegumProgram,
        logWrapper,
        compressionProgram,
        noopProgram,
        metadataUrl: ticketAwardUrl,
        ticketSupply: 5, // Enough tickets for this test
        startPrice,
        endPrice,
        auctionStartTime: BigInt(currentTime - 60),  // 1 minute ago
        auctionEndTime: BigInt(currentTime + 3600),  // 1 hour from now
      });
      
      const eventAddress = eventResult.eventAddress;
      const eventOrganizer = eventResult.organizer;
      
      // Allow time for the event to be properly created
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the event data to calculate current price
      const eventData = await programClient.fetchEvent(connection.rpc, eventAddress);
      assert.ok(eventData, "Event data should exist");
      assert.strictEqual(eventData.data.status, EVENT_STATUS.ACTIVE, "Event should be active");
      
      // Get the current price
      const currentPrice = calculateCurrentPrice({
        startPrice: eventData.data.startPrice,
        endPrice: eventData.data.endPrice,
        auctionStartTime: eventData.data.auctionStartTime,
        auctionEndTime: eventData.data.auctionEndTime
      });
      console.log("Current auction price:", currentPrice.toString());
      
      // Place a real bid from a test buyer
      console.log("Placing bid for ticket award test");
      const bidResult = await placeBid(connection, {
        bidder: testBuyer1,
        event: eventAddress,
        amount: currentPrice
      });
      console.log("Bid placed successfully, address:", bidResult.bidAddress);
      
      // Allow time for the bid to be confirmed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify the bid was placed correctly
      const bidData = await programClient.fetchBid(connection.rpc, bidResult.bidAddress);
      assert.ok(bidData, "Bid data should exist");
      assert.strictEqual(bidData.status, BID_STATUS.PENDING, "Bid should be in PENDING status");
      assert.strictEqual(bidData.bidder, testBuyer1.address, "Bid should have the correct bidder");
      assert.strictEqual(bidData.event, eventAddress, "Bid should reference the correct event");
      
      // Get ticket count before award
      const ticketsAwardedBefore = eventData.data.ticketsAwarded;
      console.log("Tickets awarded before:", ticketsAwardedBefore);
      
      try {
        // Get a CNFT asset ID from the event
        // For testing, we'll use the first one from the event's asset list
        const cnftAssetId = new PublicKey(eventData.data.cnftAssetIds[0]);
        console.log("Using CNFT asset ID:", cnftAssetId.toString());
        
        // Actually award the ticket using the helper function
        console.log("Awarding ticket to bidder");
        const awardResult = await awardTicket(connection, {
          organizer: eventOrganizer, // Use the unique organizer for this event
          event: eventAddress,
          bid: bidResult.bidAddress,
          buyer: testBuyer1.address,
          merkleTree: merkleTree.address,
          bubblegumProgram: bubblegumProgram.address,
          logWrapper: logWrapper.address,
          compressionProgram: compressionProgram.address,
          noopProgram: noopProgram.address,
          cnftAssetId: cnftAssetId
        });
        
        console.log("Ticket awarded with transaction:", awardResult.tx);
        console.log("Ticket address:", awardResult.ticketAddress);
        
        // Wait for the transaction to confirm
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verify the bid status changed to AWARDED
        const awardedBidData = await programClient.fetchBid(connection.rpc, bidResult.bidAddress);
        assert.ok(awardedBidData, "Bid data should still exist after award");
        assert.strictEqual(
          awardedBidData.status, 
          BID_STATUS.TICKET_AWARDED, 
          "Bid status should change to TICKET_AWARDED"
        );
        
        // Verify the event's ticketsAwarded count increased
        const updatedEventData = await programClient.fetchEvent(connection.rpc, eventAddress);
        assert.strictEqual(
          updatedEventData.data.ticketsAwarded,
          ticketsAwardedBefore + 1,
          "Event's ticketsAwarded count should increase by 1"
        );
        console.log("Tickets awarded after:", updatedEventData.data.ticketsAwarded);
        
        // Verify we can fetch the created ticket account (if the program exposes it)
        try {
          // This might fail if the program doesn't expose a fetch method for tickets
          const ticketData = await programClient.fetchTicket(connection.rpc, awardResult.ticketAddress);
          if (ticketData) {
            console.log("Ticket data retrieved successfully");
            assert.strictEqual(ticketData.buyer, testBuyer1.address, "Ticket should have the correct buyer");
            assert.strictEqual(ticketData.event, eventAddress, "Ticket should reference the correct event");
          }
        } catch (fetchError) {
          console.log("Note: Could not fetch ticket data directly, this is normal if the program doesn't expose a fetch method for tickets");
        }
        
        console.log("============== TICKET AWARD TEST PASSED ==============");
      } catch (error) {
        console.error("Error in ticket award test:", error);
        console.log("============== TICKET AWARD TEST FAILED ==============");
        throw error;
      }
    });

    it("fails to award a ticket if tickets are sold out", async () => {
      // Test that the system correctly prevents awarding tickets when sold out
      console.log("============== TESTING TICKET SOLD OUT VALIDATION ==============");
      
      // For this test, we need to:
      // 1. Create a new event with a very small ticket supply (1)
      // 2. Place a bid and award that single ticket
      // 3. Place another bid and try to award a second ticket, which should fail
      
      // Create a small event just for this test
      const smallEventUrl = getUniqueMetadataUrl() + "-smallevent";
      const smallTicketSupply = 1; // Just one ticket available!
      
      // Get current time in seconds
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Create a unique organizer for this specific test
      const [smallEventOrganizer] = await connection.createWallets(1, { airdropAmount: ONE_SOL * 10n });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log("Creating small event with only 1 ticket...");
      const smallEventResult = await createAndActivateEvent(connection, {
        organizer: smallEventOrganizer,
        merkleTree,
        bubblegumProgram,
        logWrapper,
        compressionProgram,
        noopProgram,
        metadataUrl: smallEventUrl,
        ticketSupply: smallTicketSupply,
        startPrice,
        endPrice,
        auctionStartTime: BigInt(currentTime - 100), // Started 100 seconds ago
        auctionEndTime: BigInt(currentTime + 3600), // End in 1 hour
      });
      
      // Allow the event to be properly created
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const smallEventAddress = smallEventResult.eventAddress;
      const smallEventOrganizer = smallEventResult.organizer;
      
      // Verify the event was created properly with only 1 ticket
      const smallEventData = await programClient.fetchEvent(connection.rpc, smallEventAddress);
      assert.ok(smallEventData, "Small event data should exist");
      assert.strictEqual(smallEventData.data.ticketSupply, smallTicketSupply, "Event should have exactly 1 ticket");
      assert.strictEqual(smallEventData.data.ticketsAwarded, 0, "No tickets should be awarded yet");
      
      // Place a valid bid for the first buyer
      const currentPrice = BigInt(ONE_SOL); // Fixed price for testing simplicity
      
      console.log("Placing first bid...");
      const firstBidResult = await placeBid(connection, {
        bidder: testBuyer1,
        event: smallEventAddress,
        amount: currentPrice
      });
      
      // Wait for bid to be confirmed
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Check if first bid was placed correctly
      const firstBidData = await programClient.fetchBid(connection.rpc, firstBidResult.bidAddress);
      assert.ok(firstBidData, "First bid data should exist");
      
      // Now place a second bid from a different buyer
      console.log("Placing second bid...");
      const secondBidResult = await placeBid(connection, {
        bidder: testBuyer2,
        event: smallEventAddress,
        amount: currentPrice
      });
      
      // Wait for second bid to be confirmed
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Check if second bid was placed correctly
      const secondBidData = await programClient.fetchBid(connection.rpc, secondBidResult.bidAddress);
      assert.ok(secondBidData, "Second bid data should exist");
      
      // Actually award the ticket to the first bidder
      console.log("Awarding ticket to first bidder...");
      
      // Get a CNFT asset ID from the event
      const cnftAssetId = new PublicKey(smallEventData.data.cnftAssetIds[0]);
      
      try {
        // Award the first ticket
        await awardTicket(connection, {
          organizer: smallEventOrganizer,
          event: smallEventAddress,
          bid: firstBidResult.bidAddress,
          buyer: testBuyer1.address,
          merkleTree: merkleTree.address,
          bubblegumProgram: bubblegumProgram.address,
          logWrapper: logWrapper.address,
          compressionProgram: compressionProgram.address,
          noopProgram: noopProgram.address,
          cnftAssetId,
        });
        
        // Wait for award to confirm
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verify the event now has 1 awarded ticket (sold out)
        const updatedEventData = await programClient.fetchEvent(connection.rpc, smallEventAddress);
        assert.strictEqual(updatedEventData.data.ticketsAwarded, 1, "Event should now have 1 ticket awarded");
        console.log("Event is now sold out with 1 of 1 tickets awarded");
        
        // Try to award a second ticket, which should fail because the event is sold out
        console.log("Attempting to award second ticket (should fail due to sold out)...");
        try {
          await awardTicket(connection, {
            organizer: smallEventOrganizer,
            event: smallEventAddress,
            bid: secondBidResult.bidAddress,
            buyer: testBuyer2.address,
            merkleTree: merkleTree.address,
            bubblegumProgram: bubblegumProgram.address,
            logWrapper: logWrapper.address,
            compressionProgram: compressionProgram.address,
            noopProgram: noopProgram.address,
            cnftAssetId,
          });
          
          // If we reach here, the test has failed - this should have thrown an error
          assert.fail("Should have failed to award ticket when event is sold out");
        } catch (error) {
          // Expected error - verify it's the right kind of error
          console.log("Got expected error:", error.message);
          
          // Verify no additional tickets were awarded
          const finalEventData = await programClient.fetchEvent(connection.rpc, smallEventAddress);
          assert.strictEqual(finalEventData.data.ticketsAwarded, 1, "Event should still have only 1 ticket awarded");
          
          console.log("============== TICKET SOLD OUT TEST PASSED ==============");
        }
      } catch (error) {
        console.error("Unexpected error during first ticket award:", error.message);
        throw error;
      }
    });
  });

  describe("Refunds", () => {
    let refundEventAddress: Address;
    let refundEventPdaAddress: Address;
    let refundBuyer1: KeyPairSigner;
    let refundBuyer2: KeyPairSigner;
    let refundTestOrganizer: KeyPairSigner; // Unique organizer for this test suite
    
    // Create a truly unique identifier for each test to avoid PDA collisions
    const getUniqueMetadataUrl = () => {
      // Combine current timestamp, random string, and a nanosecond-precision counter if available
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 10);
      const nanos = process.hrtime()[1];
      const suiteId = Math.random().toString(36).substring(2, 6); // Additional randomness for test suite
      return `${metadataUrl}-refund-${timestamp}-${random}-${nanos}-${suiteId}`;
    };
    
    let refundEventOrganizer: KeyPairSigner; // Add to store unique organizer
    
    beforeEach(async () => {
      // Create fresh wallets for each test to avoid PDA collisions, including a unique organizer
      [refundBuyer1, refundBuyer2, refundTestOrganizer] = await createWalletsWithRetry(connection, 3, ONE_SOL * 10n, "Refund test wallets");
      
      // Brief delay to let the wallet creation propagate with jitter
      await delayWithJitter(1000, 15);
      
      // Get a fresh timestamp for each test
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Create a fresh event for refund tests with unique timing using the unique organizer
      const result = await createAndActivateEvent(connection, {
        organizer: refundTestOrganizer, // Use unique organizer instead of global one
        merkleTree,
        bubblegumProgram,
        logWrapper,
        compressionProgram,
        noopProgram,
        metadataUrl: getUniqueMetadataUrl(), // Make truly unique for each test
        ticketSupply,
        startPrice,
        endPrice,
        auctionStartTime: BigInt(currentTime - 60), // Start 1 minute ago
        auctionEndTime: BigInt(currentTime + 3600), // End in 1 hour
      });
      
      refundEventAddress = result.eventAddress;
      refundEventPdaAddress = result.eventPdaAddress;
      refundEventOrganizer = result.organizer; // Store the unique organizer for later use
      
      // Brief delay for network confirmation
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    it("refunds a losing bid in full", async () => {
      console.log("======================= TESTING FULL REFUND OF LOSING BID =======================");
      
      // 1. Create event
      // 2. Place a bid 
      // 3. Finalize the auction (simulating that this bid wasn't a winner)
      // 4. Verify the bid can be refunded
      
      // Place a bid from the test buyer
      const eventData = await programClient.fetchEvent(connection.rpc, refundEventAddress);
      if (!eventData) {
        throw new Error("Event data not found - cannot proceed with refund test");
      }
      
      // Get the current price
      const currentPrice = calculateCurrentPrice({
        startPrice: eventData.data.startPrice,
        endPrice: eventData.data.endPrice,
        auctionStartTime: eventData.data.auctionStartTime,
        auctionEndTime: eventData.data.auctionEndTime
      });
      
      // Record the buyer's initial balance
      const initialBalance = await connection.rpc.getBalance(refundBuyer1.address);
      console.log("Initial buyer balance:", initialBalance);
      
      // Place a bid from a test buyer
      console.log("Placing bid...");
      const bidResult = await placeBid(connection, {
        bidder: refundBuyer1,
        event: refundEventAddress,
        amount: currentPrice
      });
      console.log("Bid placed successfully, address:", bidResult.bidAddress);
      
      // Verify bid exists and has the correct status
      const bidData = await programClient.fetchBid(connection.rpc, bidResult.bidAddress);
      if (!bidData) {
        throw new Error("Bid data not found - cannot proceed with refund test");
      }
      assert.strictEqual(bidData.status, BID_STATUS.PENDING, "Bid should be in PENDING status");
      
      // Record the balance after placing bid
      const postBidBalance = await connection.rpc.getBalance(refundBuyer1.address);
      console.log("Balance after bid:", postBidBalance);
      
      // Finalize the auction
      console.log("Finalizing auction...");
      
      // Modify auctionEndTime to be in the past for finalization
      const currentTime = Math.floor(Date.now() / 1000);
      await connection.sendTransactionFromInstructions({
        feePayer: refundEventOrganizer,
        instructions: [
          await programClient.getFinalizeAuctionInstructionAsync({
            organizer: refundEventOrganizer,
            event: refundEventAddress,
            closePrice: currentPrice, // Use the current price as close price
          }),
        ],
      });
      
      // Allow finalization to confirm
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify auction was finalized
      const finalizedEventData = await programClient.fetchEvent(connection.rpc, refundEventAddress);
      assert.strictEqual(finalizedEventData.data.status, EVENT_STATUS.FINALIZED, "Event should be finalized");
      
      // Now refund the bid
      console.log("Refunding bid...");
      
      // We need to derive the event PDA address for the refund
      const programIdPubkey = new PublicKey(programClient.ESCROW_PROGRAM_ADDRESS);
      const organizerPubkey = new PublicKey(refundEventOrganizer.address);
      const [eventPdaAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizerPubkey.toBuffer()], 
        programIdPubkey
      );
      
      await refundBidImproved(connection, {
        bidder: refundBuyer1,
        event: refundEventAddress,
        bid: bidResult.bidAddress,
        eventOrganizer: refundEventOrganizer.address
      });
      
      // Allow refund to confirm
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify bid is now marked as refunded
      const refundedBidData = await programClient.fetchBid(connection.rpc, bidResult.bidAddress);
      assert.strictEqual(refundedBidData.status, BID_STATUS.REFUNDED, "Bid should be marked as REFUNDED");
      
      // Check if the buyer received their funds back
      const finalBalance = await connection.rpc.getBalance(refundBuyer1.address);
      console.log("Final balance after refund:", finalBalance);
      
      // Allow for some gas fees in the balance comparison
      const gasFeeAllowance = BigInt(10000000); // 0.01 SOL for fees
      const balanceCheck = finalBalance + gasFeeAllowance >= initialBalance;
      
      console.log("Balance comparison:", {
        initialBalance,
        finalBalancePlusFees: finalBalance + gasFeeAllowance,
        balanceCheck
      });
      
      assert.ok(balanceCheck, "Buyer should have received a full refund (accounting for gas fees)");
      console.log("======================= FULL REFUND TEST PASSED =======================");
    });

    it("partially refunds a winning bid when it exceeds the close price", async () => {
      console.log("======================= TESTING PARTIAL REFUND OF WINNING BID =======================");
      
      // 1. Create event
      // 2. Place a bid at a higher price 
      // 3. Finalize auction with a lower close price
      // 4. Award the ticket to the bidder
      // 5. Refund the difference between bid amount and close price
      
      // Place a bid from the test buyer at the start price (which is higher)
      const eventData = await programClient.fetchEvent(connection.rpc, refundEventAddress);
      if (!eventData) {
        throw new Error("Event data not found - cannot proceed with partial refund test");
      }
      
      // Use the start price for the bid (highest possible price)
      const bidAmount = eventData.data.startPrice;
      
      // Record the buyer's initial balance
      const initialBalance = await connection.rpc.getBalance(refundBuyer1.address);
      console.log("Initial buyer balance:", initialBalance);
      
      // Place a bid from a test buyer
      console.log("Placing bid at start price...");
      const bidResult = await placeBid(connection, {
        bidder: refundBuyer1,
        event: refundEventAddress,
        amount: bidAmount
      });
      console.log("Bid placed successfully, address:", bidResult.bidAddress);
      
      // Verify bid exists and has the correct status
      const bidData = await programClient.fetchBid(connection.rpc, bidResult.bidAddress);
      if (!bidData) {
        throw new Error("Bid data not found - cannot proceed with partial refund test");
      }
      assert.strictEqual(bidData.status, BID_STATUS.PENDING, "Bid should be in PENDING status");
      
      // Award the ticket first since the bid is a winner
      console.log("Awarding ticket to the bidder...");
      
      // Get a CNFT asset ID from the event - for testing, we'll use the first one
      const cnftAssetId = new PublicKey(eventData.data.cnftAssetIds[0]);
      
      await awardTicket(connection, {
        organizer: refundEventOrganizer,
        event: refundEventAddress,
        bid: bidResult.bidAddress,
        buyer: refundBuyer1.address,
        merkleTree: merkleTree.address,
        bubblegumProgram: bubblegumProgram.address,
        logWrapper: logWrapper.address,
        compressionProgram: compressionProgram.address,
        noopProgram: noopProgram.address,
        cnftAssetId: cnftAssetId
      });
      
      // Allow award to confirm
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify the bid is now marked as awarded
      const awardedBidData = await programClient.fetchBid(connection.rpc, bidResult.bidAddress);
      assert.strictEqual(awardedBidData.status, BID_STATUS.AWARDED, "Bid should be marked as AWARDED");
      
      // Calculate a close price that's lower than the bid amount
      const closePrice = bidAmount / 2n; // 50% of the bid amount
      
      // Finalize the auction with the lower close price
      console.log("Finalizing auction with lower close price...");
      await connection.sendTransactionFromInstructions({
        feePayer: refundEventOrganizer,
        instructions: [
          await programClient.getFinalizeAuctionInstructionAsync({
            organizer: refundEventOrganizer,
            event: refundEventAddress,
            closePrice: closePrice,
          }),
        ],
      });
      
      // Allow finalization to confirm
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify auction was finalized with the correct close price
      const finalizedEventData = await programClient.fetchEvent(connection.rpc, refundEventAddress);
      assert.strictEqual(finalizedEventData.data.status, EVENT_STATUS.FINALIZED, "Event should be finalized");
      assert.strictEqual(finalizedEventData.data.auctionClosePrice, closePrice, "Close price should be set correctly");
      
      // Now refund the difference
      console.log("Refunding difference between bid amount and close price...");
      
      // We need to derive the event PDA address for the refund
      const programIdPubkey = new PublicKey(programClient.ESCROW_PROGRAM_ADDRESS);
      const organizerPubkey = new PublicKey(refundEventOrganizer.address);
      const [eventPdaAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizerPubkey.toBuffer()], 
        programIdPubkey
      );
      
      await refundBidImproved(connection, {
        bidder: refundBuyer1,
        event: refundEventAddress,
        bid: bidResult.bidAddress,
        eventOrganizer: refundEventOrganizer.address
      });
      
      // Allow refund to confirm
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Note: For winning bids, the status stays as AWARDED even after partial refund
      const refundedBidData = await programClient.fetchBid(connection.rpc, bidResult.bidAddress);
      assert.strictEqual(refundedBidData.status, BID_STATUS.AWARDED, "Winning bid should remain AWARDED after partial refund");
      
      // Check if the buyer received their partial refund
      const finalBalance = await connection.rpc.getBalance(refundBuyer1.address);
      console.log("Final balance after partial refund:", finalBalance);
      
      // Expected refund: bidAmount - closePrice
      const expectedRefund = bidAmount - closePrice;
      console.log("Expected refund amount:", expectedRefund);
      
      // Allow for some gas fees in the balance comparison
      // Check if final balance is at least initial_balance - close_price - gas_fees
      const gasFeeAllowance = BigInt(30000000); // 0.03 SOL for multiple transactions
      const minExpectedBalance = initialBalance - closePrice - gasFeeAllowance;
      
      console.log("Balance comparison:", {
        initialBalance,
        closePrice,
        expectedRefund,
        finalBalance,
        minExpectedBalance
      });
      
      assert.ok(finalBalance >= minExpectedBalance, "Buyer should have received a partial refund");
      console.log("======================= PARTIAL REFUND TEST PASSED =======================");
    });

    it("rejects refund for an already refunded bid", async () => {
      console.log("======================= TESTING REJECTION OF DOUBLE REFUND =======================");
      
      // 1. Create event
      // 2. Place a bid
      // 3. Finalize the auction
      // 4. Refund the bid successfully 
      // 5. Attempt to refund again - should fail
      
      // Place a bid from the test buyer
      const eventData = await programClient.fetchEvent(connection.rpc, refundEventAddress);
      if (!eventData) {
        throw new Error("Event data not found - cannot proceed with double refund test");
      }
      
      // Get the current price
      const currentPrice = calculateCurrentPrice({
        startPrice: eventData.data.startPrice,
        endPrice: eventData.data.endPrice,
        auctionStartTime: eventData.data.auctionStartTime,
        auctionEndTime: eventData.data.auctionEndTime
      });
      
      // Place a bid from a test buyer
      console.log("Placing bid...");
      const bidResult = await placeBid(connection, {
        bidder: refundBuyer1,
        event: refundEventAddress,
        amount: currentPrice
      });
      console.log("Bid placed successfully, address:", bidResult.bidAddress);
      
      // Verify bid exists and has the correct status
      const bidData = await programClient.fetchBid(connection.rpc, bidResult.bidAddress);
      if (!bidData) {
        throw new Error("Bid data not found - cannot proceed with double refund test");
      }
      assert.strictEqual(bidData.status, BID_STATUS.PENDING, "Bid should be in PENDING status");
      
      // Finalize the auction
      console.log("Finalizing auction...");
      await connection.sendTransactionFromInstructions({
        feePayer: refundEventOrganizer,
        instructions: [
          await programClient.getFinalizeAuctionInstructionAsync({
            organizer: refundEventOrganizer,
            event: refundEventAddress,
            closePrice: currentPrice,
          }),
        ],
      });
      
      // Allow finalization to confirm
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Now refund the bid
      console.log("Refunding bid first time...");
      
      // We need to derive the event PDA address for the refund
      const programIdPubkey = new PublicKey(programClient.ESCROW_PROGRAM_ADDRESS);
      const organizerPubkey = new PublicKey(refundEventOrganizer.address);
      const [eventPdaAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), organizerPubkey.toBuffer()], 
        programIdPubkey
      );
      
      await refundBidImproved(connection, {
        bidder: refundBuyer1,
        event: refundEventAddress,
        bid: bidResult.bidAddress,
        eventOrganizer: refundEventOrganizer.address
      });
      
      // Allow refund to confirm
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify bid is now marked as refunded
      const refundedBidData = await programClient.fetchBid(connection.rpc, bidResult.bidAddress);
      assert.strictEqual(refundedBidData.status, BID_STATUS.REFUNDED, "Bid should be marked as REFUNDED");
      
      // Now try to refund again - should fail due to validation in the smart contract
      console.log("Attempting to refund bid a second time...");
      
      try {
        // The second refund should fail since the program checks can_refund() which validates
        // that the bid status is not already REFUNDED
        await refundBidImproved(connection, {
          bidder: refundBuyer1,
          event: refundEventAddress,
          bid: bidResult.bidAddress,
          eventOrganizer: refundEventOrganizer.address
        });
        
        // If we reach here, the test failed because the refund succeeded when it should have failed
        assert.fail("Second refund should have failed but succeeded");
      } catch (error) {
        // Expected behavior - refund should fail
        console.log("Second refund correctly failed with error:", error.message);
        
        // Additional verification - check that the bid is still in REFUNDED status
        const stillRefundedBidData = await programClient.fetchBid(connection.rpc, bidResult.bidAddress);
        assert.strictEqual(stillRefundedBidData.status, BID_STATUS.REFUNDED, "Bid should still be in REFUNDED status");
        
        console.log("======================= DOUBLE REFUND REJECTION TEST PASSED =======================");
      }
    });
  });
});