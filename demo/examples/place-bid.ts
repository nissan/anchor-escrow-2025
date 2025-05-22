#!/usr/bin/env npx tsx

import { connect } from "solana-kite";
import { PublicKey } from "@solana/web3.js";
import { placeBid, calculateCurrentPrice } from "../../src/ticketfair-api";
import * as programClient from "../../dist/js-client";

interface BidParams {
  eventAddress: string;
  bidderName?: string;
  customAmount?: number; // in SOL, if provided will override current price
}

/**
 * Places a bid on a TicketFair event at current auction price
 * Usage: npx tsx examples/place-bid.ts --event EVENT_ADDRESS [--bidder-name "Alice"] [--amount 0.5]
 */
async function placeBidScript() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const params: BidParams = {
      eventAddress: getArg(args, '--event') || '',
      bidderName: getArg(args, '--bidder-name') || 'Anonymous Bidder',
      customAmount: getArg(args, '--amount') ? parseFloat(getArg(args, '--amount')!) : undefined
    };

    if (!params.eventAddress) {
      console.error('Error: --event parameter is required');
      console.log('Usage: npx tsx examples/place-bid.ts --event EVENT_ADDRESS [--bidder-name "Alice"] [--amount 0.5]');
      process.exit(1);
    }

    console.log(`Attempting to place bid for ${params.bidderName}`);
    console.log(`Event Address: ${params.eventAddress}`);

    // Connect to Solana (localnet for testing)
    const connection = await connect("localnet");
    console.log("Connected to Solana localnet");

    // Create bidder wallet and fund it
    const bidder = await connection.createWallet({ airdropAmount: 2_000_000_000n }); // 2 SOL
    console.log(`Bidder address: ${bidder.address}`);

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
    console.log(`  Name: ${event.data.name}`);
    console.log(`  Organizer: ${event.data.organizer}`);
    console.log(`  Tickets Available: ${event.data.ticketSupply}`);
    console.log(`  Tickets Awarded: ${event.data.ticketsAwarded}`);
    console.log(`  Start Time: ${new Date(Number(event.data.auctionStartTime) * 1000).toISOString()}`);
    console.log(`  End Time: ${new Date(Number(event.data.auctionEndTime) * 1000).toISOString()}`);
    

    // Check auction timing
    const now = Math.floor(Date.now() / 1000);
    const startTime = Number(event.data.auctionStartTime);
    const endTime = Number(event.data.auctionEndTime);

    if (now < startTime) {
      const timeUntilStart = startTime - now;
      console.log(`\n❌ Auction has not started yet`);
      console.log(`Current time: ${new Date(now * 1000).toISOString()}`);
      console.log(`Time until start: ${timeUntilStart} seconds (${Math.floor(timeUntilStart / 60)} minutes)`);
      
      const result = {
        success: false,
        reason: 'auction_not_started',
        timeUntilStart,
        startTime,
        currentTime: now
      };
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    if (now > endTime) {
      const timeSinceEnd = now - endTime;
      console.log(`\n❌ Auction has ended`);
      console.log(`Current time: ${new Date(now * 1000).toISOString()}`);
      console.log(`Time since end: ${timeSinceEnd} seconds (${Math.floor(timeSinceEnd / 60)} minutes ago)`);
      
      const result = {
        success: false,
        reason: 'auction_ended',
        timeSinceEnd,
        endTime,
        currentTime: now
      };
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    // Calculate current price or use custom amount
    let bidAmount: bigint;
    let priceSource: string;

    if (params.customAmount !== undefined) {
      bidAmount = BigInt(Math.floor(params.customAmount * 1e9));
      priceSource = 'custom';
      console.log(`\n💰 Using custom bid amount: ${params.customAmount} SOL`);
    } else {
      // Use the most accurate time possible - try to predict what the program will use
      const currentPrice = calculateCurrentPrice(event.data, now);
      bidAmount = typeof currentPrice === 'bigint' ? currentPrice : BigInt(currentPrice.toString());
      priceSource = 'current_auction_price';
      console.log(`\n💰 Current auction price: ${Number(bidAmount) / 1e9} SOL`);
    }

    // Check if auction is still active
    console.log(`\n✅ Auction is active - placing bid...`);
    const timeRemaining = endTime - now;
    console.log(`Time remaining: ${timeRemaining} seconds (${Math.floor(timeRemaining / 60)} minutes)`);

    // Place the bid with retry logic for timing issues
    let bidAddress: string;
    let tx: string;
    let lastError: any;
    
    // Try different timing offsets if the first attempt fails
    for (let offset = 2; offset >= -2; offset--) {
      try {
        const adjustedTime = now + offset;
        const adjustedPrice = calculateCurrentPrice(event.data, adjustedTime);
        const adjustedBidAmount = typeof adjustedPrice === 'bigint' ? adjustedPrice : BigInt(adjustedPrice.toString());
        
        if (offset < 0) {
          console.log(`\n🔄 Retrying with time offset ${offset}s (price: ${Number(adjustedBidAmount) / 1e9} SOL)...`);
        }
        
        const result = await placeBid(connection, {
          bidder,
          event: params.eventAddress,
          amount: adjustedBidAmount,
        });
        
        bidAddress = result.bidAddress;
        tx = result.tx;
        bidAmount = adjustedBidAmount; // Update for accurate reporting
        break; // Success!
        
      } catch (error: any) {
        lastError = error;
        // Check for BidNotAtCurrentPrice error (6004) in different ways
        const errorMessage = error.message || '';
        const hasContext = error.context && error.context.code === 6004;
        const isBidPriceError = errorMessage.includes('#6004') || hasContext;
        
        if (isBidPriceError) {
          // BidNotAtCurrentPrice error - try next offset
          if (offset > -2) {
            continue;
          } else {
            // All retries failed
            break;
          }
        } else {
          // Different error - don't retry
          throw error;
        }
      }
    }
    
    if (!bidAddress!) {
      throw lastError || new Error('All bid attempts failed');
    }

    const result = {
      success: true,
      bidAddress,
      transactionId: tx,
      bidder: bidder.address,
      bidderName: params.bidderName,
      eventAddress: params.eventAddress,
      bidAmount: Number(bidAmount) / 1e9, // Convert back to SOL for display
      priceSource,
      currentTime: now,
      timeRemaining,
      placedAt: new Date(now * 1000).toISOString()
    };

    console.log(`\n--- BID PLACED SUCCESSFULLY ---`);
    console.log(`Bid Address: ${bidAddress}`);
    console.log(`Transaction ID: ${tx}`);
    console.log(`Amount: ${result.bidAmount} SOL`);
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error("Error placing bid:", error);
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

function getArg(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  placeBidScript().catch(console.error);
}

export { placeBidScript };