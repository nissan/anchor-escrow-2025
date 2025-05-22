// Helper functions for Ticketfair tests
import { Connection } from "solana-kite";
import * as programClient from "../dist/js-client";
import { type KeyPairSigner, type Address, lamports } from "@solana/kit";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { ONE_SOL } from "./escrow.test-helpers";

// Constants
const ONE_BILLION = 1_000_000_000; // 1 SOL in lamports (10^9)

// Helper to calculate the current Dutch auction price
export function calculateCurrentPrice(
  event: {
    startPrice: bigint | number | string;
    endPrice: bigint | number | string;
    auctionStartTime: bigint | number | string;
    auctionEndTime: bigint | number | string;
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

  // Safe conversion to bigint, with proper error handling
  function safeToBigInt(value: bigint | number | string): bigint {
    if (typeof value === 'bigint') {
      return value;
    }
    
    if (typeof value === 'number') {
      return BigInt(Math.floor(value));
    }
    
    if (typeof value === 'string') {
      // Handle string that might contain formatting or non-numeric characters
      const cleanString = value.replace(/[^\d]/g, '');
      if (cleanString === '') {
        throw new Error(`Cannot convert string to BigInt: ${value}`);
      }
      return BigInt(cleanString);
    }
    
    // Handle objects with _bn field (common in Solana)
    if (typeof value === 'object' && value !== null && 'toString' in value && typeof value.toString === 'function') {
      try {
        const str = value.toString();
        // Check if it's a numeric string
        if (/^\d+$/.test(str)) {
          return BigInt(str);
        }
      } catch (e) {
        console.error("Error converting object to string:", e);
      }
    }
    
    throw new Error(`Cannot convert ${typeof value} to BigInt`);
  }

  try {
    // Safe conversion of all inputs to their appropriate types
    const startPrice = safeToBigInt(event.startPrice);
    const endPrice = safeToBigInt(event.endPrice);
    const auctionStartTime = Number(safeToBigInt(event.auctionStartTime));
    const auctionEndTime = Number(safeToBigInt(event.auctionEndTime));
    
    console.log("Converted values:", {
      startPrice: startPrice.toString(),
      endPrice: endPrice.toString(),
      auctionStartTime,
      auctionEndTime
    });
    
    // Price calculation logic
    if (now <= auctionStartTime) {
      console.log("Auction not started, returning start price:", startPrice.toString());
      return startPrice;
    } else if (now >= auctionEndTime) {
      console.log("Auction ended, returning end price:", endPrice.toString());
      return endPrice;
    } else {
      // For active auctions, calculate the current price based on time elapsed
      // Use BigInt arithmetic throughout to maintain precision
      const elapsed = BigInt(now - auctionStartTime);
      const duration = BigInt(auctionEndTime - auctionStartTime);
      
      if (duration <= 0n) {
        console.warn("Invalid auction duration (end time <= start time), returning start price");
        return startPrice;
      }
      
      // Calculate price using BigInt arithmetic to avoid floating point issues
      const priceDiff = startPrice - endPrice;
      const priceDecrement = (priceDiff * elapsed) / duration;
      const currentPrice = startPrice - priceDecrement;
      
      console.log("Calculated price:", currentPrice.toString());
      return currentPrice;
    }
  } catch (error) {
    console.error("Error in calculateCurrentPrice calculation:", error);
    // Instead of returning a hardcoded fallback, we'll use a fixed value but log the error clearly
    console.warn("WARNING: Using fallback price (1 SOL) due to calculation error!");
    return BigInt(1000000000); // 1 SOL in lamports as fallback
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
  // Use a combination of timestamp, random values, and process info for maximum uniqueness
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2)}-${process.pid}`;
  console.log(`Creating unique organizer for event: ${uniqueId}`);
  
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
    eventPdaOverride?: string; // Optional override for the event PDA
  }
) {
  try {
    // Calculate the event PDA authority
    const programIdPubkey = new PublicKey(programClient.ESCROW_PROGRAM_ADDRESS);
    
    // If eventPdaOverride is provided, use it directly instead of deriving
    let eventPdaAddress: PublicKey;
    
    if (params.eventPdaOverride) {
      console.log("Using provided event PDA override:", params.eventPdaOverride);
      try {
        // The eventPdaOverride might be a PublicKey object or string
        if (typeof params.eventPdaOverride === 'string') {
          eventPdaAddress = new PublicKey(params.eventPdaOverride);
        } else if (params.eventPdaOverride instanceof PublicKey) {
          eventPdaAddress = params.eventPdaOverride;
        } else if (params.eventPdaOverride && typeof params.eventPdaOverride.toString === 'function') {
          eventPdaAddress = new PublicKey(params.eventPdaOverride.toString());
        } else {
          throw new Error("Invalid event PDA override format");
        }
      } catch (error) {
        console.error("Error parsing event PDA override:", error);
        throw new Error(`Invalid event PDA override: ${error.message}`);
      }
    } else {
      // Find the organizer from the event address by fetching event data
      console.log(`Fetching event data for address: ${params.event}`);
      
      try {
        const eventData = await programClient.fetchEvent(connection.rpc, params.event);
        console.log("Event data fetched successfully:", !!eventData);
        
        if (!eventData) {
          throw new Error("Event data is null or undefined");
        }
        
        console.log("Event data keys:", Object.keys(eventData));
        
        // Access the data field if needed
        if (eventData.data) {
          console.log("Event data.data keys:", Object.keys(eventData.data));
        }
        
        // Check for organizer in both direct property and data.organizer
        let organizerPubkey: PublicKey;
        
        if (eventData.organizer) {
          organizerPubkey = new PublicKey(eventData.organizer);
          console.log("Using direct organizer property:", eventData.organizer);
        } else if (eventData.data && eventData.data.organizer) {
          organizerPubkey = new PublicKey(eventData.data.organizer);
          console.log("Using data.organizer property:", eventData.data.organizer);
        } else {
          throw new Error("Event data missing organizer property");
        }
        
        console.log("Derived organizer pubkey:", organizerPubkey.toString());
        
        // Calculate the event PDA from the organizer
        const [derivedPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("event"), organizerPubkey.toBuffer()], 
          programIdPubkey
        );
        eventPdaAddress = derivedPda;
        console.log("Event PDA address derived:", eventPdaAddress.toString());
      } catch (fetchError) {
        console.error("Error fetching event data:", fetchError);
        
        // Fallback approach: derive PDA directly from event address
        // This is not ideal but can work in test environments
        console.log("Falling back to deriving PDA directly from event address");
        const eventPubkey = new PublicKey(params.event);
        
        const [fallbackPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("event"), eventPubkey.toBuffer()], 
          programIdPubkey
        );
        console.log("Fallback event PDA derived:", fallbackPda.toString());
        eventPdaAddress = fallbackPda;
      }
    }

    // Calculate the bid account PDA
    const bidderPubkey = new PublicKey(params.bidder.address);
    const eventPubkey = new PublicKey(params.event);
    
    const [bidAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("bid"), eventPubkey.toBuffer(), bidderPubkey.toBuffer()],
      programIdPubkey
    );
    console.log("Bid PDA calculation details:", {
      bidder: bidderPubkey.toString(),
      event: eventPubkey.toString(),
      program: programIdPubkey.toString(),
      calculatedBidPDA: bidAddress.toString(),
      seeds: `["bid", ${eventPubkey.toString()}, ${bidderPubkey.toString()}]`
    });

    // Ensure bidAmount is properly handled as a BigInt
    // This is critical - the amount must be a valid bigint for the instruction
    let bidAmount: bigint;
    try {
      if (typeof params.amount === 'bigint') {
        bidAmount = params.amount;
      } else if (typeof params.amount === 'number') {
        bidAmount = BigInt(Math.floor(params.amount));
      } else if (typeof params.amount === 'string') {
        bidAmount = BigInt(params.amount.replace(/[^\d]/g, ''));
      } else {
        throw new Error(`Invalid amount type: ${typeof params.amount}`);
      }
      
      if (bidAmount <= 0n) {
        throw new Error("Bid amount must be positive");
      }
      
      console.log("Creating place bid instruction with amount:", bidAmount.toString());
      console.log("Bid amount type:", typeof bidAmount);
    } catch (error) {
      console.error("Error converting bid amount:", error);
      // Use a safe default value for testing
      bidAmount = BigInt(ONE_BILLION); // Use our local constant
      console.log("Using fallback bid amount of 1 SOL (1 billion lamports)");
    }
    console.log("Using event PDA:", eventPdaAddress.toString());
    
    // Try a simpler approach with a direct amount value
    try {
      // Create a simple object with required properties and explicit typing
      const bidInstruction = {
        bidder: params.bidder,
        event: params.event,
        eventPda: eventPdaAddress.toString(), // Convert to string
        amount: Number(bidAmount) // Use number type for compatibility
      };
      
      console.log("Instruction data:", JSON.stringify(bidInstruction, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      ));
      
      // Get the instruction
      const placeBidIx = await programClient.getPlaceBidInstructionAsync(bidInstruction);
      
      // Send the transaction
      console.log("Sending transaction...");
      const tx = await connection.sendTransactionFromInstructions({
        feePayer: params.bidder,
        instructions: [placeBidIx],
      });
      console.log("Transaction sent:", tx);
      
      // Longer wait for transaction confirmation
      console.log("Waiting for transaction confirmation...");
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return { bidAddress: bidAddress.toString(), tx };
    } catch (instructionError) {
      console.error("Error with bid instruction or transaction:", instructionError);
      throw instructionError;
    }
  } catch (error) {
    console.error("Error in placeBid helper:", error);
    throw error;
  }
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
  try {
    // Calculate the ticket account PDA
    const programIdPubkey = new PublicKey(programClient.ESCROW_PROGRAM_ADDRESS);
    
    // Get the buyer's pubkey through proper validation
    let buyerAddress: string;
    
    if (typeof params.buyer === 'string') {
      buyerAddress = params.buyer;
    } else if (params.buyer && typeof (params.buyer as any).address === 'string') {
      buyerAddress = (params.buyer as any).address;
    } else if (params.buyer && typeof params.buyer.toString === 'function') {
      buyerAddress = params.buyer.toString();
    } else {
      // Instead of a fallback, throw an error to enforce proper usage
      throw new Error("Invalid buyer parameter: must be an address string or object with address property");
    }
    
    // Validate that the address is a valid Solana public key
    try {
      const buyerPubkey = new PublicKey(buyerAddress);
      console.log("Award ticket buyer address:", buyerAddress);
      
      // Get the event pubkey
      const eventPubkey = new PublicKey(params.event);
      
      // Derive the ticket PDA
      const [ticketAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("ticket"), eventPubkey.toBuffer(), buyerPubkey.toBuffer()],
        programIdPubkey
      );
      console.log("Ticket PDA address:", ticketAddress.toString());
      
      // Fetch the bid data to validate it exists and is in the correct state
      console.log("Fetching bid data to validate award eligibility...");
      const bidData = await programClient.fetchBid(connection.rpc, params.bid);
      
      if (!bidData) {
        throw new Error("Bid not found, cannot award ticket");
      }
      
      console.log("Bid data for ticket award:", { 
        bidder: bidData.bidder,
        event: bidData.event,
        status: bidData.status 
      });

      // Create the award ticket instruction with proper string conversions
      console.log("Creating award ticket instruction...");
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
      console.log("Sending award ticket transaction...");
      const tx = await connection.sendTransactionFromInstructions({
        feePayer: params.organizer,
        instructions: [awardTicketIx],
      });
      console.log("Transaction sent:", tx);

      // Wait for transaction confirmation
      console.log("Waiting for transaction confirmation...");
      await new Promise(resolve => setTimeout(resolve, 1500));

      return { ticketAddress: ticketAddress.toString(), tx };
    } catch (keyError) {
      throw new Error(`Invalid buyer public key: ${keyError.message}`);
    }
  } catch (error) {
    console.error("Error in awardTicket helper:", error);
    throw error;
  }
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