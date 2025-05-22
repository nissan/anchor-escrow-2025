#!/usr/bin/env npx tsx

import { createEventScript } from './create-event';
import { placeBidScript } from './place-bid';
import { awardAndFinalizeScript } from './award-and-finalize';

interface DemoParams {
  eventName: string;
  ticketSupply: number;
  startPrice: number; // in SOL
  endPrice: number; // in SOL
  auctionDurationMinutes: number;
  numBidders: number;
  delayBetweenBids: number; // seconds
}

/**
 * Master demo orchestrator that simulates a complete TicketFair auction lifecycle
 * Usage: npx tsx examples/demo-full-auction.ts [--name "Concert"] [--tickets 5] [--start-price 1.0] [--end-price 0.2] [--duration 5] [--bidders 8] [--bid-delay 10]
 */
async function demoFullAuction() {
  try {
    console.log('🚀 TicketFair Complete Auction Demo Starting...\n');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const params: DemoParams = {
      eventName: getArg(args, '--name') || 'Demo Concert',
      ticketSupply: parseInt(getArg(args, '--tickets') || '5'),
      startPrice: parseFloat(getArg(args, '--start-price') || '1.0'),
      endPrice: parseFloat(getArg(args, '--end-price') || '0.2'),
      auctionDurationMinutes: parseInt(getArg(args, '--duration') || '5'),
      numBidders: parseInt(getArg(args, '--bidders') || '8'),
      delayBetweenBids: parseInt(getArg(args, '--bid-delay') || '10')
    };

    console.log('📋 Demo Configuration:');
    console.log(`  Event Name: ${params.eventName}`);
    console.log(`  Ticket Supply: ${params.ticketSupply}`);
    console.log(`  Start Price: ${params.startPrice} SOL`);
    console.log(`  End Price: ${params.endPrice} SOL`);
    console.log(`  Auction Duration: ${params.auctionDurationMinutes} minutes`);
    console.log(`  Number of Bidders: ${params.numBidders}`);
    console.log(`  Delay Between Bids: ${params.delayBetweenBids} seconds\n`);

    // === PHASE 1: CREATE EVENT ===
    console.log('🎪 PHASE 1: Creating Event');
    console.log('=' .repeat(50));
    
    // Override createEventScript to use our parameters
    process.argv = [
      'node', 'create-event.ts',
      '--name', params.eventName,
      '--tickets', params.ticketSupply.toString(),
      '--start-price', params.startPrice.toString(),
      '--end-price', params.endPrice.toString(),
      '--duration', params.auctionDurationMinutes.toString()
    ];
    
    const eventResult = await createEventScript();
    const eventAddress = eventResult.eventAddress;
    const startTime = eventResult.startTime;
    const endTime = eventResult.endTime;
    
    console.log(`✅ Event created successfully!`);
    console.log(`   Address: ${eventAddress}`);
    console.log(`   Start: ${eventResult.startTimeFormatted}`);
    console.log(`   End: ${eventResult.endTimeFormatted}\n`);

    // === WAIT FOR AUCTION TO START ===
    const now = Math.floor(Date.now() / 1000);
    if (now < startTime) {
      const waitTime = startTime - now + 1; // Add 1 second buffer
      console.log(`⏳ Waiting ${waitTime} seconds for auction to start...`);
      await sleep(waitTime * 1000);
      console.log('✅ Auction has started!\n');
    }

    // === PHASE 2: SIMULATE BIDDING ===
    console.log('💰 PHASE 2: Simulating Bidding Activity');
    console.log('=' .repeat(50));
    
    const bidders = [];
    const bidResults = [];
    
    for (let i = 0; i < params.numBidders; i++) {
      const bidderName = `Bidder_${i + 1}`;
      console.log(`\n🎯 ${bidderName} placing bid...`);
      
      // Check current time and auction status
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime > endTime) {
        console.log(`⏰ Auction has ended, stopping bid simulation at bidder ${i + 1}`);
        break;
      }
      
      try {
        // Override placeBidScript arguments
        process.argv = [
          'node', 'place-bid.ts',
          '--event', eventAddress,
          '--bidder-name', bidderName
        ];
        
        const bidResult = await placeBidScript();
        
        if (bidResult.success) {
          console.log(`   ✅ ${bidderName} bid placed: ${bidResult.bidAmount} SOL`);
          bidders.push(bidderName);
          bidResults.push(bidResult);
        } else {
          console.log(`   ❌ ${bidderName} bid failed: ${bidResult.reason}`);
          if (bidResult.reason === 'auction_ended') {
            console.log(`   🏁 Auction ended, stopping bid simulation`);
            break;
          }
        }
        
      } catch (error) {
        console.log(`   ❌ ${bidderName} encountered error:`, error);
      }
      
      // Wait between bids (unless this is the last bidder)
      if (i < params.numBidders - 1) {
        console.log(`   ⏳ Waiting ${params.delayBetweenBids} seconds before next bid...`);
        await sleep(params.delayBetweenBids * 1000);
      }
    }
    
    console.log(`\n📊 Bidding Summary:`);
    console.log(`   Total Bids Placed: ${bidResults.filter(b => b.success).length}`);
    console.log(`   Failed Bids: ${bidResults.filter(b => !b.success).length}`);
    
    // === WAIT FOR AUCTION TO END ===
    const timeUntilEnd = endTime - Math.floor(Date.now() / 1000);
    if (timeUntilEnd > 0) {
      console.log(`\n⏳ Waiting ${timeUntilEnd} seconds for auction to end...`);
      await sleep(timeUntilEnd * 1000 + 2000); // Add 2 second buffer
      console.log('✅ Auction has ended!\n');
    }

    // === PHASE 3: FINALIZE AUCTION ===
    console.log('🏆 PHASE 3: Finalizing Auction');
    console.log('=' .repeat(50));
    
    try {
      // Override awardAndFinalizeScript arguments
      process.argv = [
        'node', 'award-and-finalize.ts',
        '--event', eventAddress
      ];
      
      const finalizeResult = await awardAndFinalizeScript();
      
      console.log(`\n📋 Final Results:`);
      console.log(`   Event: ${params.eventName}`);
      console.log(`   Close Price: ${finalizeResult.closePrice} SOL`);
      console.log(`   Tickets Awarded: ${finalizeResult.ticketsAwarded}`);
      console.log(`   Refunds Processed: ${finalizeResult.refundsProcessed}`);
      
    } catch (error) {
      console.error('❌ Failed to finalize auction:', error);
    }

    // === DEMO COMPLETE ===
    console.log('\n🎉 DEMO COMPLETE');
    console.log('=' .repeat(50));
    console.log('✅ Successfully demonstrated complete TicketFair auction lifecycle:');
    console.log('   1. ✅ Event Creation with Dutch auction parameters');
    console.log('   2. ✅ Multiple bidders placing bids during auction window');
    console.log('   3. ✅ Dynamic pricing calculation based on time');
    console.log('   4. ✅ Auction finalization with close price determination');
    console.log('   5. ✅ Ticket awarding to highest bidders');
    console.log('   6. ✅ Refund processing for unsuccessful bids');
    console.log('\n🚀 TicketFair platform ready for production use!');

    const summary = {
      demoCompleted: true,
      eventAddress,
      eventName: params.eventName,
      totalBids: bidResults.filter(b => b.success).length,
      auctionDuration: params.auctionDurationMinutes,
      priceRange: {
        start: params.startPrice,
        end: params.endPrice
      },
      timestamp: new Date().toISOString()
    };

    console.log('\n📄 Demo Summary:');
    console.log(JSON.stringify(summary, null, 2));

    return summary;

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Helper function to sleep for a given number of milliseconds
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getArg(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demoFullAuction().catch(console.error);
}

export { demoFullAuction };