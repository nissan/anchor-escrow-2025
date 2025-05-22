#!/usr/bin/env npx tsx

import { connect } from "solana-kite";
import { createEvent } from "../../src/ticketfair-api";

interface EventParams {
  name: string;
  ticketSupply: number;
  startPrice: number; // in SOL
  endPrice: number; // in SOL
  auctionDurationMinutes: number;
  description?: string;
}

/**
 * Creates a new TicketFair event with specified parameters
 * Usage: npx tsx demo/examples/create-event.ts --name "Concert" --tickets 100 --start-price 0.5 --end-price 0.1 --duration 60
 */
async function createEventScript() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const params: EventParams = {
      name: getArg(args, '--name') || 'Demo Event',
      ticketSupply: parseInt(getArg(args, '--tickets') || '10'),
      startPrice: parseFloat(getArg(args, '--start-price') || '1.0'),
      endPrice: parseFloat(getArg(args, '--end-price') || '0.1'),
      auctionDurationMinutes: parseInt(getArg(args, '--duration') || '30'),
      description: getArg(args, '--description') || undefined
    };

    console.log('Creating event with parameters:');
    console.log(`  Name: ${params.name}`);
    console.log(`  Ticket Supply: ${params.ticketSupply}`);
    console.log(`  Start Price: ${params.startPrice} SOL`);
    console.log(`  End Price: ${params.endPrice} SOL`);
    console.log(`  Auction Duration: ${params.auctionDurationMinutes} minutes`);

    // Connect to Solana (localnet for testing)
    const connection = await connect("localnet");
    console.log("Connected to Solana localnet");

    // Calculate timing
    const now = Math.floor(Date.now() / 1000);
    const startTime = now + 10; // Start in 10 seconds
    const endTime = startTime + (params.auctionDurationMinutes * 60);

    // Convert prices to lamports
    const startPriceLamports = BigInt(Math.floor(params.startPrice * 1e9));
    const endPriceLamports = BigInt(Math.floor(params.endPrice * 1e9));

    // Create the event (organizer will be created automatically)
    const { eventAddress, createTx, activateTx, organizer: organizerAddress } = await createEvent(connection, {
      name: params.name,
      description: params.description || `Auction for ${params.name}`,
      ticketSupply: params.ticketSupply,
      startPrice: startPriceLamports,
      endPrice: endPriceLamports,
      startTime,
      endTime,
    });

    // Output results in JSON format for easy parsing by other scripts
    const result = {
      eventAddress,
      createTransactionId: createTx,
      activateTransactionId: activateTx,
      organizer: organizerAddress,
      name: params.name,
      ticketSupply: params.ticketSupply,
      startPrice: params.startPrice,
      endPrice: params.endPrice,
      startTime,
      endTime,
      startTimeFormatted: new Date(startTime * 1000).toISOString(),
      endTimeFormatted: new Date(endTime * 1000).toISOString(),
      auctionDurationMinutes: params.auctionDurationMinutes,
      currentTime: now,
      timeUntilStart: startTime - now,
      timeUntilEnd: endTime - now
    };

    console.log('\n--- EVENT CREATED SUCCESSFULLY ---');
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error("Error creating event:", error);
    process.exit(1);
  }
}

function getArg(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createEventScript().catch(console.error);
}

export { createEventScript };