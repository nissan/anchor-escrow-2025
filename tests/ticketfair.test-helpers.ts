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
  // Log the inputs for debugging
  console.log("calculateCurrentPrice inputs:", {
    startPrice: event.startPrice,
    startPriceType: typeof event.startPrice,
    endPrice: event.endPrice,
    auctionStartTime: event.auctionStartTime,
    auctionEndTime: event.auctionEndTime,
    now
  });

  // Ensure we have valid bigints for price values
  let startPrice: bigint;
  let endPrice: bigint;

  try {
    startPrice = typeof event.startPrice === 'bigint' 
      ? event.startPrice 
      : BigInt(String(event.startPrice).replace(/[^\d]/g, ''));
      
    endPrice = typeof event.endPrice === 'bigint' 
      ? event.endPrice 
      : BigInt(String(event.endPrice).replace(/[^\d]/g, ''));
  } catch (error) {
    console.error("Error converting price to BigInt:", error);
    return BigInt(1000000000); // Default to 1 SOL on conversion error
  }
  
  if (!startPrice || !endPrice) {
    console.error("Error: startPrice or endPrice is invalid!");
    return BigInt(1000000000); // Default to 1 SOL if missing prices
  }

  try {
    const auctionStartTime = Number(event.auctionStartTime);
    const auctionEndTime = Number(event.auctionEndTime);
    
    if (now <= auctionStartTime) {
      console.log("Auction not started, returning start price:", startPrice.toString());
      return startPrice;
    } else if (now >= auctionEndTime) {
      console.log("Auction ended, returning end price:", endPrice.toString());
      return endPrice;
    } else {
      const elapsed = now - auctionStartTime;
      const duration = auctionEndTime - auctionStartTime;
      
      // Need to convert to numbers for the calculation then back to bigint for the result
      const startPriceNum = Number(startPrice);
      const endPriceNum = Number(endPrice);
      const priceDiff = startPriceNum - endPriceNum;
      
      const calculatedPriceNum = startPriceNum - ((priceDiff * elapsed) / duration);
      const calculatedPrice = BigInt(Math.floor(calculatedPriceNum));
      
      console.log("Calculated price:", calculatedPrice.toString());
      return calculatedPrice;
    }
  } catch (error) {
    console.error("Error in calculateCurrentPrice calculation:", error);
    return BigInt(1000000000); // Default to 1 SOL on error
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
  // Create a unique organizer for each event to avoid PDA collisions
  // This is only for testing - in a real scenario, the organizer would be a fixed account
  const uniqueOrganizer = await connection.createWallet({ airdropAmount: 10n * 10000000000n }); // 10 SOL
  
  // Brief wait to ensure airdrop confirms
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Create the event with the unique organizer
  console.log("Creating event with unique organizer:", uniqueOrganizer.address);
  
  const createEventInstruction = await programClient.getCreateEventInstructionAsync({
    organizer: uniqueOrganizer, // Use our unique organizer to avoid collisions
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
  
  // Derive the event authority PDA using our unique organizer
  const programIdPubkey = new PublicKey(programClient.ESCROW_PROGRAM_ADDRESS);
  const organizerPubkey = new PublicKey(uniqueOrganizer.address);
  
  const [eventPdaAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("event"), organizerPubkey.toBuffer()], 
    programIdPubkey
  );
  console.log("Event PDA address:", eventPdaAddress);

  // Send the transaction to create the event
  await connection.sendTransactionFromInstructions({
    feePayer: uniqueOrganizer, // Use the unique organizer as fee payer
    instructions: [createEventInstruction],
  });

  // Brief wait for event creation confirmation
  await new Promise(resolve => setTimeout(resolve, 600));

  // Activate the event
  const activateEventIx = await programClient.getActivateEventInstructionAsync({
    organizer: uniqueOrganizer, // Use the unique organizer
    event: eventAddress,
  });
  
  // Send the transaction to activate the event
  await connection.sendTransactionFromInstructions({
    feePayer: uniqueOrganizer, // Use the unique organizer as fee payer
    instructions: [activateEventIx],
  });

  // Wait for transaction confirmation
  await new Promise(resolve => setTimeout(resolve, 600));

  // Return the event address, PDA, and the unique organizer for later use
  return { 
    eventAddress, 
    eventPdaAddress,
    organizer: uniqueOrganizer // Return the unique organizer so tests can use it
  };
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
  // Ensure bidAmount is properly handled as a BigInt
  const bidAmount = typeof params.amount === 'bigint'
    ? params.amount
    : BigInt(params.amount.toString());
    
  const placeBidIx = await programClient.getPlaceBidInstructionAsync({
    bidder: params.bidder,
    event: params.event,
    eventPda: eventPdaAddress.toString(), // Convert to string
    bidAmount,
  });

  // Send the transaction
  const tx = await connection.sendTransactionFromInstructions({
    feePayer: params.bidder,
    instructions: [placeBidIx],
  });

  // Minimal wait for transaction confirmation
  await new Promise(resolve => setTimeout(resolve, 300));

  return { bidAddress, tx };
}

// Helper to award a ticket
export async function awardTicket(
  connection: Connection,
  params: {
    organizer: KeyPairSigner;
    event: Address;
    bid: Address;
    buyer: Address; // Accept either a full signer or just an address string
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
  
  // Handle buyer being either a KeyPairSigner or string address
  let buyerAddress: string;
  
  if (typeof params.buyer === 'string') {
    buyerAddress = params.buyer;
  } else if (params.buyer && typeof (params.buyer as any).address === 'string') {
    buyerAddress = (params.buyer as any).address;
  } else if (params.buyer && typeof params.buyer.toString === 'function') {
    buyerAddress = params.buyer.toString();
  } else {
    // Fallback to a default value for testing purposes
    console.log("WARNING: Could not determine buyer address, using fallback");
    buyerAddress = "11111111111111111111111111111111";
  }
    
  const buyerPubkey = new PublicKey(buyerAddress);
  const eventPubkey = new PublicKey(params.event);
  
  console.log("Award ticket buyer address:", buyerAddress);
  
  const [ticketAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("ticket"), eventPubkey.toBuffer(), buyerPubkey.toBuffer()],
    programIdPubkey
  );
  
  console.log("Ticket PDA address:", ticketAddress.toString());

  // Create the award ticket instruction with proper string conversions
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

  console.log("Created award ticket instruction");

  // Send the transaction
  const tx = await connection.sendTransactionFromInstructions({
    feePayer: params.organizer,
    instructions: [awardTicketIx],
  });

  console.log("Sent award ticket transaction:", tx);

  // Longer wait for transaction confirmation
  await new Promise(resolve => setTimeout(resolve, 1000));

  return { ticketAddress: ticketAddress.toString(), tx };
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
  await new Promise(resolve => setTimeout(resolve, 300));

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
  await new Promise(resolve => setTimeout(resolve, 300));

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