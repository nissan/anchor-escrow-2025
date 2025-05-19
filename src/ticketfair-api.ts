import { Connection } from "solana-kite";
import * as programClient from "./dist/js-client";
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
    const elapsed = now - Number(event.auctionStartTime);
    const duration = Number(event.auctionEndTime) - Number(event.auctionStartTime);
    const priceDiff = Number(event.startPrice) - Number(event.endPrice);
    const calculatedPrice = BigInt(Math.floor(Number(event.startPrice) - ((priceDiff * elapsed) / duration)));
    return calculatedPrice;
  }
}

/**
 * Creates and activates a new TicketFair event
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
  const organizerPubkey = new PublicKey(eventData.organizer);
  
  // Derive the event PDA address
  const [eventPdaAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("event"), organizerPubkey.toBuffer()], 
    programIdPubkey
  );

  // Calculate the bid account PDA
  const bidderPubkey = new PublicKey(params.bidder.address);
  const eventPubkey = new PublicKey(params.event);
  
  const [bidAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("bid"), eventPubkey.toBuffer(), bidderPubkey.toBuffer()],
    programIdPubkey
  );

  // Ensure bidAmount is definitely a BigInt
  const bidAmount = typeof params.amount === 'bigint' 
    ? params.amount 
    : BigInt(params.amount.toString());

  // Create the instruction for placing a bid
  // Make sure to use a string for eventPda and a properly converted bigint for bidAmount
  const placeBidIx = await programClient.getPlaceBidInstructionAsync({
    bidder: params.bidder,
    event: params.event,
    eventPda: eventPdaAddress.toString(),
    bidAmount, // Use the validated bidAmount
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