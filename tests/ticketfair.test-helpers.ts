// Helper functions for Ticketfair tests
import { Connection } from "solana-kite";
import * as programClient from "../dist/js-client";
import { type KeyPairSigner, type Address, lamports } from "@solana/kit";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { ONE_SOL } from "./escrow.test-helpers";

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
    return BigInt(Number(event.startPrice) - Math.floor((priceDiff * elapsed) / duration));
  }
}

// Helper to create and activate an event
export async function createAndActivateEvent(
  connection: Connection,
  params: {
    organizer: KeyPairSigner;
    merkleTree: KeyPairSigner;
    bubblegumProgram: KeyPairSigner;
    logWrapper: KeyPairSigner;
    compressionProgram: KeyPairSigner;
    noopProgram: KeyPairSigner;
    metadataUrl: string;
    ticketSupply: number;
    startPrice: bigint;
    endPrice: bigint;
    auctionStartTime: bigint;
    auctionEndTime: bigint;
  }
) {
  // Create the event
  console.log("Creating event with organizer:", params.organizer.address);
  
  const createEventInstruction = await programClient.getCreateEventInstructionAsync({
    organizer: params.organizer,
    merkleTree: params.merkleTree.address,
    bubblegumProgram: params.bubblegumProgram.address,
    logWrapper: params.logWrapper.address,
    compressionProgram: params.compressionProgram.address,
    noopProgram: params.noopProgram.address,
    metadataUrl: params.metadataUrl,
    ticketSupply: params.ticketSupply,
    startPrice: params.startPrice,
    endPrice: params.endPrice,
    auctionStartTime: params.auctionStartTime,
    auctionEndTime: params.auctionEndTime,
  });

  // Get the event address from the instruction
  const eventAddress = createEventInstruction.accounts[1].address;
  console.log("Event account address:", eventAddress);
  console.log("Create event instruction accounts:", createEventInstruction.accounts.map(acc => ({ 
    name: acc.name, 
    address: acc.address, 
    signer: acc.signer 
  })));

  // Derive the event authority PDA
  const programIdPubkey = new PublicKey(programClient.ESCROW_PROGRAM_ADDRESS);
  const organizerPubkey = new PublicKey(params.organizer.address);
  
  const [eventPdaAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("event"), organizerPubkey.toBuffer()], 
    programIdPubkey
  );

  // Send the transaction to create the event
  await connection.sendTransactionFromInstructions({
    feePayer: params.organizer,
    instructions: [createEventInstruction],
  });

  // Wait for a moment to make sure the event is created
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Activate the event
  const activateEventIx = await programClient.getActivateEventInstructionAsync({
    organizer: params.organizer,
    event: eventAddress,
  });
  
  // Send the transaction to activate the event
  await connection.sendTransactionFromInstructions({
    feePayer: params.organizer,
    instructions: [activateEventIx],
  });

  // Minimal wait for transaction confirmation
  await new Promise(resolve => setTimeout(resolve, 500));

  return { eventAddress, eventPdaAddress };
}

// Helper to place a bid
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
  
  // Find the organizer from the event address by parsing it
  const eventData = await programClient.fetchEvent(connection.rpc, params.event);
  const organizerPubkey = new PublicKey(eventData.organizer);
  
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

  // Create the instruction for placing a bid
  const placeBidIx = await programClient.getPlaceBidInstructionAsync({
    bidder: params.bidder,
    event: params.event,
    eventPda: eventPdaAddress,
    bidAmount: params.amount,
  });

  // Send the transaction
  const tx = await connection.sendTransactionFromInstructions({
    feePayer: params.bidder,
    instructions: [placeBidIx],
  });

  // Minimal wait for transaction confirmation
  await new Promise(resolve => setTimeout(resolve, 400));

  return { bidAddress, tx };
}

// Helper to award a ticket
export async function awardTicket(
  connection: Connection,
  params: {
    organizer: KeyPairSigner;
    event: Address;
    bid: Address;
    buyer: KeyPairSigner;
    merkleTree: KeyPairSigner;
    bubblegumProgram: KeyPairSigner;
    logWrapper: KeyPairSigner;
    compressionProgram: KeyPairSigner;
    noopProgram: KeyPairSigner;
    cnftAssetId: PublicKey;
  }
) {
  // Calculate the ticket account PDA
  const programIdPubkey = new PublicKey(programClient.ESCROW_PROGRAM_ADDRESS);
  const buyerPubkey = new PublicKey(params.buyer.address);
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
    ticket: ticketAddress,
    merkleTree: params.merkleTree.address,
    bubblegumProgram: params.bubblegumProgram.address,
    logWrapper: params.logWrapper.address,
    compressionProgram: params.compressionProgram.address,
    noopProgram: params.noopProgram.address,
    cnftAssetId: params.cnftAssetId,
  });

  // Send the transaction
  const tx = await connection.sendTransactionFromInstructions({
    feePayer: params.organizer,
    instructions: [awardTicketIx],
  });

  // Minimal wait for transaction confirmation
  await new Promise(resolve => setTimeout(resolve, 400));

  return { ticketAddress, tx };
}

// Helper to refund a bid
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

  // Minimal wait for transaction confirmation
  await new Promise(resolve => setTimeout(resolve, 400));

  return { tx };
}

// Helper to finalize an auction
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

  // Minimal wait for transaction confirmation
  await new Promise(resolve => setTimeout(resolve, 400));

  return { tx };
}

// Error constants mapped from error.rs
export const ERROR_CODES = {
  CUSTOM_ERROR: "CustomError: custom program error: 0x1770",
  AUCTION_NOT_ACTIVE: "AuctionNotActive: custom program error: 0x1771",
  AUCTION_NOT_STARTED: "AuctionNotStarted: custom program error: 0x1772",
  AUCTION_ENDED: "AuctionEnded: custom program error: 0x1773",
  BID_NOT_AT_CURRENT_PRICE: "BidNotAtCurrentPrice: custom program error: 0x1774",
};

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