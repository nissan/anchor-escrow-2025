#!/usr/bin/env npx tsx

import { connect } from "solana-kite";
import { createEvent, placeBid, calculateCurrentPrice } from "./src/ticketfair-api";
import * as programClient from "./dist/js-client";

async function debugBidIssue() {
  try {
    console.log('🔍 Debugging bid placement issue...');
    
    // Connect to localnet (devnet has RPC compatibility issues with solana-kite)
    const connection = await connect("localnet");
    console.log("✅ Connected to localnet");

    // Step 1: Create a new event
    console.log('\n📅 Creating event...');
    const { eventAddress, organizer: organizerAddress } = await createEvent(connection, {
      name: "Debug Event",
      description: "Testing bid placement",
      ticketSupply: 5,
      startPrice: BigInt(1_000_000_000), // 1 SOL
      endPrice: BigInt(100_000_000),     // 0.1 SOL
      startTime: Math.floor(Date.now() / 1000) + 10, // Start in 10 seconds
      endTime: Math.floor(Date.now() / 1000) + 310,  // End in 5 minutes + 10 seconds
    });
    
    console.log(`✅ Event created: ${eventAddress}`);
    console.log(`   Organizer: ${organizerAddress}`);

    // Step 2: Wait for auction to start
    console.log('\n⏳ Waiting for auction to start...');
    await new Promise(resolve => setTimeout(resolve, 12000)); // Wait 12 seconds

    // Step 3: Fetch event data to verify it's active
    console.log('\n🔍 Fetching event data...');
    const event = await programClient.fetchEvent(connection.rpc, eventAddress);
    console.log(`   Status: ${event.data.status}`);
    console.log(`   Start time: ${new Date(Number(event.data.auctionStartTime) * 1000).toISOString()}`);
    console.log(`   End time: ${new Date(Number(event.data.auctionEndTime) * 1000).toISOString()}`);
    
    // Step 4: Calculate current price
    console.log('\n💰 Calculating current price...');
    const now = Math.floor(Date.now() / 1000);
    const currentPrice = calculateCurrentPrice(event.data, now);
    console.log(`   Current timestamp: ${now}`);
    console.log(`   Event start time: ${Number(event.data.auctionStartTime)}`);
    console.log(`   Event end time: ${Number(event.data.auctionEndTime)}`);
    console.log(`   Start price: ${Number(event.data.startPrice) / 1e9} SOL`);
    console.log(`   End price: ${Number(event.data.endPrice) / 1e9} SOL`);
    console.log(`   Current price: ${Number(currentPrice) / 1e9} SOL`);
    console.log(`   Current price (lamports): ${currentPrice}`);
    
    // Manual calculation to debug
    if (now > Number(event.data.auctionStartTime) && now < Number(event.data.auctionEndTime)) {
      const elapsed = now - Number(event.data.auctionStartTime);
      const duration = Number(event.data.auctionEndTime) - Number(event.data.auctionStartTime);
      const priceDiff = Number(event.data.startPrice) - Number(event.data.endPrice);
      console.log(`   Elapsed: ${elapsed}s, Duration: ${duration}s`);
      console.log(`   Price diff: ${priceDiff} lamports`);
      const reduction = Math.floor((priceDiff * elapsed) / duration);
      const manualPrice = Number(event.data.startPrice) - reduction;
      console.log(`   Manual calculation: ${manualPrice} lamports`);
    }

    // Step 5: Create bidder and place bid
    console.log('\n👤 Creating bidder...');
    const bidder = await connection.createWallet({ airdropAmount: 2_000_000_000n }); // 2 SOL
    console.log(`   Bidder address: ${bidder.address}`);
    
    // Wait a moment for airdrop to confirm
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n💸 Placing bid...');
    console.log(`   Event: ${eventAddress}`);
    console.log(`   Bidder: ${bidder.address}`);
    
    // Get Solana clock time to match what the program will use
    const clockInfo = await connection.rpc.getSlot();
    const epochInfo = await connection.rpc.getEpochInfo();
    
    // Try to get current Solana clock time
    let solanaTime;
    try {
      const clockAccount = await connection.rpc.getAccountInfo("SysvarC1ock11111111111111111111111111111111");
      if (clockAccount && clockAccount.exists) {
        // Solana clock data layout: slot (8 bytes) + epoch_start_timestamp (8 bytes) + epoch (8 bytes) + leader_schedule_epoch (8 bytes) + unix_timestamp (8 bytes)
        const clockData = clockAccount.data;
        const clockDataBytes = Buffer.from(clockData, 'base64');
        // unix_timestamp is at offset 32 (8+8+8+8)
        solanaTime = clockDataBytes.readBigInt64LE(32);
      } else {
        // Fallback to current time
        solanaTime = BigInt(Math.floor(Date.now() / 1000));
      }
    } catch (err) {
      console.log(`   Clock fetch failed, using system time: ${err.message}`);
      solanaTime = BigInt(Math.floor(Date.now() / 1000));
    }
    
    // Let's try a few timestamps around the current time to see the exact price the program expects
    const solanaTimeNum = Number(solanaTime);
    console.log(`   Solana clock time: ${solanaTime}`);
    
    for (let offset = -2; offset <= 2; offset++) {
      const testTime = solanaTimeNum + offset;
      const testPrice = calculateCurrentPrice(event.data, testTime);
      console.log(`   Time ${testTime} (${offset >= 0 ? '+' : ''}${offset}s): ${Number(testPrice)} lamports`);
    }
    
    // Use the exact time from the table that will match what the program sees
    const bidPrice = calculateCurrentPrice(event.data, solanaTimeNum);
    console.log(`   Using price for time ${solanaTimeNum}: ${Number(bidPrice) / 1e9} SOL (${bidPrice} lamports)`);
    
    try {
      const { bidAddress, tx } = await placeBid(connection, {
        bidder,
        event: eventAddress,
        amount: bidPrice,
      });
      
      console.log(`✅ Bid placed successfully!`);
      console.log(`   Bid address: ${bidAddress}`);
      console.log(`   Transaction: ${tx}`);
      
    } catch (bidError) {
      console.error('❌ Bid placement failed:', bidError);
      
      // Let's examine the error in detail
      if (bidError.message) {
        console.log('Error message:', bidError.message);
      }
      if (bidError.cause) {
        console.log('Error cause:', bidError.cause);
      }
      if (bidError.context) {
        console.log('Error context:', bidError.context);
      }
      if (bidError.transaction && bidError.transaction.meta && bidError.transaction.meta.logMessages) {
        console.log('Transaction logs:', bidError.transaction.meta.logMessages);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run debug
if (import.meta.url === `file://${process.argv[1]}`) {
  debugBidIssue().catch(console.error);
}

export { debugBidIssue };