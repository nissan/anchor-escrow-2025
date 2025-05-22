#!/usr/bin/env npx tsx

import { connect } from "solana-kite";
import { PublicKey } from "@solana/web3.js";
import { awardTicket, refundBid, finalizeAuction, calculateCurrentPrice } from "../../src/ticketfair-api";
import * as programClient from "../../dist/js-client";

interface FinalizeParams {
  eventAddress: string;
  closePrice?: number; // in SOL, if not provided will use current auction price
  maxAwards?: number; // maximum number of tickets to award, defaults to all available
}

/**
 * Finalizes a TicketFair auction by setting close price, awarding tickets, and processing refunds
 * Usage: npx tsx examples/award-and-finalize.ts --event EVENT_ADDRESS [--close-price 0.3] [--max-awards 5]
 */
async function awardAndFinalizeScript() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const params: FinalizeParams = {
      eventAddress: getArg(args, '--event') || '',
      closePrice: getArg(args, '--close-price') ? parseFloat(getArg(args, '--close-price')!) : undefined,
      maxAwards: getArg(args, '--max-awards') ? parseInt(getArg(args, '--max-awards')!) : undefined
    };

    if (!params.eventAddress) {
      console.error('Error: --event parameter is required');
      console.log('Usage: npx tsx examples/award-and-finalize.ts --event EVENT_ADDRESS [--close-price 0.3] [--max-awards 5]');
      process.exit(1);
    }

    console.log('🏆 Starting auction finalization process...');
    console.log(`Event Address: ${params.eventAddress}`);

    // Connect to Solana (localnet for testing)
    const connection = await connect("localnet");
    console.log("Connected to Solana localnet");

    // Fetch event data
    let event;
    try {
      event = await programClient.fetchEvent(connection.rpc, params.eventAddress);
    } catch (error) {
      console.error(`Error: Could not fetch event at address ${params.eventAddress}`);
      console.error('Make sure the event address is correct and the event exists');
      process.exit(1);
    }

    console.log(`\nEvent Details:`);
    console.log(`  Organizer: ${event.data.organizer}`);
    console.log(`  Tickets Available: ${event.data.ticketSupply}`);
    console.log(`  Tickets Already Awarded: ${event.data.ticketsAwarded}`);
    console.log(`  Current Status: ${getEventStatusName(event.data.status)}`);

    // Check auction timing
    const now = Math.floor(Date.now() / 1000);
    const endTime = Number(event.data.auctionEndTime);

    if (now < endTime) {
      console.log(`\n⏰ Warning: Auction has not ended yet`);
      console.log(`Current time: ${new Date(now * 1000).toISOString()}`);
      console.log(`End time: ${new Date(endTime * 1000).toISOString()}`);
      console.log(`Time remaining: ${endTime - now} seconds`);
    }

    // Create organizer wallet (in real scenario, organizer would use their own wallet)
    const organizer = await connection.createWallet({ airdropAmount: 1_000_000_000n }); // 1 SOL
    console.log(`Using organizer wallet: ${organizer.address}`);

    // Determine close price
    let closePriceLamports: bigint;
    if (params.closePrice !== undefined) {
      closePriceLamports = BigInt(Math.floor(params.closePrice * 1e9));
      console.log(`\n💰 Using specified close price: ${params.closePrice} SOL`);
    } else {
      const currentPrice = calculateCurrentPrice(event.data, now);
      closePriceLamports = typeof currentPrice === 'bigint' ? currentPrice : BigInt(currentPrice.toString());
      console.log(`\n💰 Using current auction price as close price: ${Number(closePriceLamports) / 1e9} SOL`);
    }

    // Step 1: Finalize the auction
    console.log(`\n🔚 Finalizing auction with close price: ${Number(closePriceLamports) / 1e9} SOL`);
    
    try {
      const { tx: finalizeTx } = await finalizeAuction(connection, {
        organizer,
        event: params.eventAddress,
        closePrice: closePriceLamports,
      });
      console.log(`✅ Auction finalized. Transaction: ${finalizeTx}`);
    } catch (error) {
      console.error('❌ Failed to finalize auction:', error);
      process.exit(1);
    }

    // Step 2: Find all bids for this event
    console.log(`\n🔍 Searching for bids on this event...`);
    
    // Note: In a real implementation, you would query for all bid accounts
    // For this demo, we'll simulate by creating some bids or getting them from program accounts
    const allBids = await getAllBidsForEvent(connection, params.eventAddress);
    console.log(`Found ${allBids.length} bids for this event`);

    if (allBids.length === 0) {
      console.log('ℹ️  No bids found for this event. Nothing to award or refund.');
      const result = {
        success: true,
        eventAddress: params.eventAddress,
        finalized: true,
        closePrice: Number(closePriceLamports) / 1e9,
        bidsProcessed: 0,
        ticketsAwarded: 0,
        refundsProcessed: 0
      };
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    // Sort bids by amount (highest first) for fair awarding
    allBids.sort((a, b) => Number(b.data.amount) - Number(a.data.amount));

    // Step 3: Award tickets to winning bids
    const maxTicketsToAward = Math.min(
      params.maxAwards || Number(event.data.ticketSupply),
      Number(event.data.ticketSupply) - Number(event.data.ticketsAwarded),
      allBids.filter(bid => Number(bid.data.amount) >= Number(closePriceLamports)).length
    );

    console.log(`\n🎫 Awarding up to ${maxTicketsToAward} tickets...`);
    
    let ticketsAwarded = 0;
    const awardedBids = [];
    
    for (let i = 0; i < Math.min(maxTicketsToAward, allBids.length); i++) {
      const bid = allBids[i];
      
      // Check if bid amount is at or above close price
      if (Number(bid.data.amount) < Number(closePriceLamports)) {
        console.log(`⚠️  Bid ${i + 1} amount (${Number(bid.data.amount) / 1e9} SOL) is below close price, stopping awards`);
        break;
      }

      try {
        console.log(`🎟️  Awarding ticket ${i + 1} to bidder ${bid.data.bidder} (bid: ${Number(bid.data.amount) / 1e9} SOL)`);
        
        // Generate a placeholder cNFT asset ID (in real implementation, this would come from Bubblegum)
        const cnftAssetId = PublicKey.unique();
        
        const { ticketAddress, tx: awardTx } = await awardTicket(connection, {
          organizer,
          event: params.eventAddress,
          bid: bid.publicKey,
          buyer: bid.data.bidder,
          merkleTree: event.data.merkleTree,
          bubblegumProgram: "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY", // Bubblegum program ID
          logWrapper: "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV", // Log wrapper
          compressionProgram: "cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK", // Compression program
          noopProgram: "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV", // Noop program
          cnftAssetId,
        });
        
        console.log(`  ✅ Ticket awarded. Address: ${ticketAddress}, Transaction: ${awardTx}`);
        ticketsAwarded++;
        awardedBids.push({
          bidAddress: bid.publicKey,
          bidder: bid.data.bidder,
          ticketAddress,
          bidAmount: Number(bid.data.amount) / 1e9
        });
        
      } catch (error) {
        console.error(`  ❌ Failed to award ticket ${i + 1}:`, error);
      }
    }

    // Step 4: Process refunds for remaining bids
    console.log(`\n💸 Processing refunds for remaining bids...`);
    
    let refundsProcessed = 0;
    const refundedBids = [];
    
    for (const bid of allBids) {
      try {
        // Create a bidder wallet to sign the refund transaction
        const bidder = await connection.createWallet({ airdropAmount: 100_000_000n }); // 0.1 SOL for fees
        
        console.log(`💰 Processing refund for bidder ${bid.data.bidder} (${Number(bid.data.amount) / 1e9} SOL)`);
        
        // Calculate escrow PDA
        const programIdPubkey = new PublicKey(programClient.ESCROW_PROGRAM_ADDRESS);
        const eventPubkey = new PublicKey(params.eventAddress);
        const [eventPdaAddress] = PublicKey.findProgramAddressSync(
          [Buffer.from("escrow"), eventPubkey.toBuffer()], 
          programIdPubkey
        );
        
        const { tx: refundTx } = await refundBid(connection, {
          bidder,
          event: params.eventAddress,
          bid: bid.publicKey,
          eventPda: eventPdaAddress.toString(),
        });
        
        console.log(`  ✅ Refund processed. Transaction: ${refundTx}`);
        refundsProcessed++;
        refundedBids.push({
          bidAddress: bid.publicKey,
          bidder: bid.data.bidder,
          originalBidAmount: Number(bid.data.amount) / 1e9
        });
        
      } catch (error) {
        console.error(`  ❌ Failed to process refund for ${bid.data.bidder}:`, error);
      }
    }

    const result = {
      success: true,
      eventAddress: params.eventAddress,
      finalized: true,
      closePrice: Number(closePriceLamports) / 1e9,
      bidsProcessed: allBids.length,
      ticketsAwarded,
      refundsProcessed,
      awardedBids,
      refundedBids,
      finalizedAt: new Date().toISOString()
    };

    console.log(`\n--- AUCTION FINALIZATION COMPLETE ---`);
    console.log(`✅ Finalized at close price: ${result.closePrice} SOL`);
    console.log(`🎫 Tickets awarded: ${ticketsAwarded}`);
    console.log(`💸 Refunds processed: ${refundsProcessed}`);
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error("Error finalizing auction:", error);
    const result = {
      success: false,
      reason: 'error',
      error: error instanceof Error ? error.message : String(error),
      currentTime: Math.floor(Date.now() / 1000)
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }
}

// Helper function to get all bids for an event
// Note: This is a simplified implementation. In a real app, you would use getProgramAccounts or similar
async function getAllBidsForEvent(connection: any, eventAddress: string): Promise<any[]> {
  // This is a placeholder - in a real implementation you would:
  // 1. Use connection.getProgramAccounts to find all bid accounts
  // 2. Filter by event address
  // 3. Return the bid data
  
  console.log('📝 Note: In a real implementation, this would query all bid accounts from the blockchain');
  console.log('For this demo, returning empty array. Create some bids first using the place-bid script.');
  
  return [];
}

function getEventStatusName(status: number): string {
  switch (status) {
    case 0: return 'Created';
    case 1: return 'Active';
    case 2: return 'Finalized';
    default: return 'Unknown';
  }
}

function getArg(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  awardAndFinalizeScript().catch(console.error);
}

export { awardAndFinalizeScript };