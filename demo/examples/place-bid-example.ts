import { connect } from "solana-kite";
import { PublicKey } from "@solana/web3.js";
import { 
  placeBid, 
  calculateCurrentPrice 
} from "../../src/ticketfair-api";
import * as programClient from "../../dist/js-client";

/**
 * Example of placing a bid on a TicketFair event
 */
async function placeBidExample() {
  try {
    // 1. Connect to Solana
    const connection = await connect();
    console.log("Connected to Solana");

    // 2. Set up the bidder wallet (in a real app, you would use a real wallet)
    const bidder = await connection.createWallet();
    console.log(`Bidder address: ${bidder.address}`);

    // For demonstration purposes, we need to airdrop SOL to the bidder
    await connection.requestAirdrop(bidder.address, 1_000_000_000); // 1 SOL
    console.log("Airdropped 1 SOL to bidder");

    // 3. Fetch an existing event to bid on (in a real app, you would have the event address)
    // This is just a placeholder - you would need a real event address
    const eventAddress = "EVENT_ADDRESS_HERE"; 
    
    // 4. Get the current event data
    const event = await programClient.fetchEvent(connection.rpc, eventAddress);
    console.log(`Found event organized by: ${event.data.organizer}`);
    console.log(`Event has ${event.data.ticketSupply} tickets, ${event.data.ticketsAwarded} already awarded`);
    
    // 5. Calculate the current auction price with timing correction
    const now = Math.floor(Date.now() / 1000) - 1; // Adjust for program timing
    const currentPrice = calculateCurrentPrice(event.data, now);
    console.log(`Current auction price: ${currentPrice} lamports (${Number(currentPrice) / 1e9} SOL)`);
    
    // 6. Place a bid at the current price
    // Ensure currentPrice is a BigInt
    const bidAmount = typeof currentPrice === 'bigint' 
      ? currentPrice 
      : BigInt(currentPrice.toString());
      
    const { bidAddress, tx } = await placeBid(connection, {
      bidder,
      event: eventAddress,
      amount: bidAmount,
    });
    
    console.log(`Successfully placed bid with transaction: ${tx}`);
    console.log(`Bid address: ${bidAddress}`);
    
    // 7. Wait for possible award or refund (in a real app, you would monitor the bid status)
    console.log("Bid placed successfully. Monitor your bid status for award or refund.");
    
  } catch (error) {
    console.error("Error placing bid:", error);
  }
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  placeBidExample().catch(console.error);
}

// Export for potential use in other examples
export { placeBidExample };