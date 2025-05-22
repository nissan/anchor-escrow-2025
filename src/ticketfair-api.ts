import { Connection } from "solana-kite";
import * as programClient from "../dist/js-client";
import { type KeyPairSigner, type Address } from "@solana/kit";
import { PublicKey } from "@solana/web3.js";

// Helper to calculate the current Dutch auction price
export function calculateCurrentPrice(
  event: {
    startPrice: bigint;
    endPrice: bigint;
    auctionStartTime: bigint;
    auctionEndTime: bigint;
  },
  now: number = Math.floor(Date.now() / 1000)
): bigint {
  if (now <= Number(event.auctionStartTime)) {
    return event.startPrice;
  } else if (now >= Number(event.auctionEndTime)) {
    return event.endPrice;
  } else {
    // Match Rust integer arithmetic exactly to avoid precision errors
    const elapsed = BigInt(now - Number(event.auctionStartTime));
    const duration = BigInt(Number(event.auctionEndTime) - Number(event.auctionStartTime));
    const priceDiff = event.startPrice - event.endPrice;
    
    // Rust calculation: start_price - ((price_diff * elapsed) / duration)
    const reduction = (priceDiff * elapsed) / duration;
    const calculatedPrice = event.startPrice - reduction;
    return calculatedPrice;
  }
}

/**
 * Creates a simple event for testing (simplified version without Bubblegum)
 */
export async function createEvent(
  connection: Connection,
  params: {
    organizer?: KeyPairSigner; // Optional - will create unique organizer if not provided
    name: string;
    description: string;
    ticketSupply: number;
    startPrice: bigint;
    endPrice: bigint;
    startTime: number;
    endTime: number;
  }
) {
  // Create a unique organizer if not provided to avoid PDA collisions
  let organizer = params.organizer;
  if (!organizer) {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2)}-${process.pid}`;
    console.log(`Creating unique organizer for event: ${uniqueId}`);
    organizer = await connection.createWallet({ airdropAmount: 3_000_000_000n }); // 3 SOL
    
    // Brief wait to ensure airdrop confirms
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  // Create dummy addresses for the Bubblegum-related parameters
  const merkleTree = PublicKey.unique();
  const bubblegumProgram = "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY";
  const logWrapper = "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV";
  const compressionProgram = "cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK";
  const noopProgram = "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV";

  console.log("Creating event with organizer:", organizer.address);

  // Create the event
  const createEventInstruction = await programClient.getCreateEventInstructionAsync({
    organizer,
    merkleTree,
    bubblegumProgram,
    logWrapper,
    compressionProgram,
    noopProgram,
    metadataUrl: `{"name":"${params.name}","description":"${params.description}"}`,
    ticketSupply: params.ticketSupply,
    startPrice: params.startPrice,
    endPrice: params.endPrice,
    auctionStartTime: BigInt(params.startTime),
    auctionEndTime: BigInt(params.endTime),
  });

  // Get the event address from the instruction
  const eventAddress = createEventInstruction.accounts[1].address;

  // Send the transaction to create the event
  const createTx = await connection.sendTransactionFromInstructions({
    feePayer: organizer,
    instructions: [createEventInstruction],
  });

  // Brief wait for event creation confirmation
  await new Promise(resolve => setTimeout(resolve, 600));

  // Activate the event
  const activateEventIx = await programClient.getActivateEventInstructionAsync({
    organizer,
    event: eventAddress,
  });

  // Send the transaction to activate the event
  const activateTx = await connection.sendTransactionFromInstructions({
    feePayer: organizer,
    instructions: [activateEventIx],
  });

  // Wait for transaction confirmation
  await new Promise(resolve => setTimeout(resolve, 600));

  return {
    eventAddress,
    createTx,
    activateTx,
    organizer: organizer.address // Return organizer address for reference
  };
}

/**
 * Creates and activates a new TicketFair event (full Bubblegum version)
 */
export async function createAndActivateEvent(
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
) {
  // Create the event
  const createEventInstruction = await programClient.getCreateEventInstructionAsync({
    organizer: params.organizer, 
    merkleTree: params.merkleTree,
    bubblegumProgram: params.bubblegumProgram,
    logWrapper: params.logWrapper,
    compressionProgram: params.compressionProgram,
    noopProgram: params.noopProgram,
    metadataUrl: params.metadataUrl,
    ticketSupply: params.ticketSupply,
    startPrice: params.startPrice,
    endPrice: params.endPrice,
    auctionStartTime: params.auctionStartTime,
    auctionEndTime: params.auctionEndTime,
  });

  // Get the event address from the instruction
  const eventAddress = createEventInstruction.accounts[1].address;
  
  // Derive the event authority PDA
  const programIdPubkey = new PublicKey(programClient.ESCROW_PROGRAM_ADDRESS);
  const organizerPubkey = new PublicKey(params.organizer.address);
  
  const [eventPdaAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("event"), organizerPubkey.toBuffer()], 
    programIdPubkey
  );

  // Send the transaction to create the event
  const createTx = await connection.sendTransactionFromInstructions({
    feePayer: params.organizer,
    instructions: [createEventInstruction],
  });

  // Activate the event
  const activateEventIx = await programClient.getActivateEventInstructionAsync({
    organizer: params.organizer,
    event: eventAddress,
  });
  
  // Send the transaction to activate the event
  const activateTx = await connection.sendTransactionFromInstructions({
    feePayer: params.organizer,
    instructions: [activateEventIx],
  });

  // Return the event address, PDA, and transaction signatures
  return { 
    eventAddress, 
    eventPdaAddress: eventPdaAddress.toString(),
    createTx,
    activateTx
  };
}

/**
 * Places a bid on a TicketFair event at the current auction price
 */
export async function placeBid(
  connection: Connection,
  params: {
    bidder: KeyPairSigner;
    event: Address;
    amount: bigint;
  }
) {
  // Calculate the event PDA authority
  const programIdPubkey = new PublicKey(programClient.ESCROW_PROGRAM_ADDRESS);
  
  // Find the organizer from the event address by fetching the event data
  const eventData = await programClient.fetchEvent(connection.rpc, params.event);
  
  // Handle organizer field which might be a string or an object
  let organizerKey: string;
  if (typeof eventData.data.organizer === 'string') {
    organizerKey = eventData.data.organizer;
  } else if (eventData.data.organizer && typeof eventData.data.organizer.toString === 'function') {
    organizerKey = eventData.data.organizer.toString();
  } else {
    throw new Error('Cannot extract organizer key from event data');
  }
  
  const organizerPubkey = new PublicKey(organizerKey);
  
  // Derive the escrow PDA address (different from event PDA)
  const eventPubkey = new PublicKey(params.event);
  const [eventPdaAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), eventPubkey.toBuffer()], 
    programIdPubkey
  );

  // Calculate the bid account PDA
  const bidderPubkey = new PublicKey(params.bidder.address);
  
  const [bidAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("bid"), eventPubkey.toBuffer(), bidderPubkey.toBuffer()],
    programIdPubkey
  );

  // Ensure bidAmount is definitely a BigInt
  const bidAmount = typeof params.amount === 'bigint' 
    ? params.amount 
    : BigInt(params.amount.toString());

  // Create the instruction for placing a bid
  // Make sure to use a string for eventPda and a properly converted bigint for amount
  const placeBidIx = await programClient.getPlaceBidInstructionAsync({
    bidder: params.bidder,
    event: params.event,
    eventPda: eventPdaAddress.toString(),
    amount: bidAmount, // Use the validated bidAmount as 'amount'
  });

  // Send the transaction
  const tx = await connection.sendTransactionFromInstructions({
    feePayer: params.bidder,
    instructions: [placeBidIx],
  });

  return { bidAddress: bidAddress.toString(), tx };
}

/**
 * Awards a ticket to a winning bidder
 */
export async function awardTicket(
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
) {
  // Calculate the ticket account PDA
  const programIdPubkey = new PublicKey(programClient.ESCROW_PROGRAM_ADDRESS);
  const buyerPubkey = new PublicKey(params.buyer);
  const eventPubkey = new PublicKey(params.event);
  
  const [ticketAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("ticket"), eventPubkey.toBuffer(), buyerPubkey.toBuffer()],
    programIdPubkey
  );

  // Create the award ticket instruction
  const awardTicketIx = await programClient.getAwardTicketInstructionAsync({
    organizer: params.organizer,
    event: params.event,
    bid: params.bid,
    ticket: ticketAddress.toString(),
    merkleTree: params.merkleTree,
    bubblegumProgram: params.bubblegumProgram,
    logWrapper: params.logWrapper,
    compressionProgram: params.compressionProgram,
    noopProgram: params.noopProgram,
    cnftAssetId: params.cnftAssetId,
  });

  // Send the transaction
  const tx = await connection.sendTransactionFromInstructions({
    feePayer: params.organizer,
    instructions: [awardTicketIx],
  });

  return { ticketAddress: ticketAddress.toString(), tx };
}

/**
 * Refunds a bid (full or partial refund depending on auction result)
 */
export async function refundBid(
  connection: Connection,
  params: {
    bidder: KeyPairSigner;
    event: Address;
    bid: Address;
    eventPda: Address;
  }
) {
  // Create the refund bid instruction
  const refundBidIx = await programClient.getRefundBidInstructionAsync({
    bidder: params.bidder,
    event: params.event,
    bid: params.bid,
    eventPda: params.eventPda,
  });

  // Send the transaction
  const tx = await connection.sendTransactionFromInstructions({
    feePayer: params.bidder,
    instructions: [refundBidIx],
  });

  return { tx };
}

/**
 * Finalizes an auction with a closing price
 */
export async function finalizeAuction(
  connection: Connection,
  params: {
    organizer: KeyPairSigner;
    event: Address;
    closePrice: bigint;
  }
) {
  // Create the finalize auction instruction
  const finalizeAuctionIx = await programClient.getFinalizeAuctionInstructionAsync({
    organizer: params.organizer,
    event: params.event,
    closePrice: params.closePrice,
  });

  // Send the transaction
  const tx = await connection.sendTransactionFromInstructions({
    feePayer: params.organizer,
    instructions: [finalizeAuctionIx],
  });

  return { tx };
}

// Program-specific event status constants
export const EVENT_STATUS = {
  CREATED: 0,
  ACTIVE: 1,
  FINALIZED: 2,
};

// Program-specific bid status constants
export const BID_STATUS = {
  PENDING: 0,
  TICKET_AWARDED: 1,
  REFUNDED: 2,
};