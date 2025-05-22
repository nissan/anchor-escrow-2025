// Helper module to diagnose and fix the placeBid test issues
import { Connection } from "solana-kite";
import * as programClient from "../dist/js-client";
import { type KeyPairSigner, type Address, lamports } from "@solana/kit";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { ONE_SOL } from "./escrow.test-helpers";

// This is a diagnostic utility to check the event PDA calculation
export function getEventPda(event: Address, organizer: Address): PublicKey {
  // Derive the event authority PDA
  const programIdPubkey = new PublicKey(programClient.ESCROW_PROGRAM_ADDRESS);
  const organizerPubkey = new PublicKey(organizer);
  
  const [eventPdaAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("event"), organizerPubkey.toBuffer()], 
    programIdPubkey
  );
  
  return eventPdaAddress;
}

// This is a modified version of placeBid that includes better error handling
export async function placeBidImproved(
  connection: Connection,
  params: {
    bidder: KeyPairSigner;
    event: Address;
    eventOrganizer: Address; // Add organizer to directly compute PDA
    amount: bigint;
  }
) {
  // Calculate the event PDA authority
  const programIdPubkey = new PublicKey(programClient.ESCROW_PROGRAM_ADDRESS);
  const organizerPubkey = new PublicKey(params.eventOrganizer);
  
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

  // Add diagnostic checks
  const event = await programClient.fetchEvent(connection.rpc, params.event);
  console.log("Event details for placeBid:", {
    address: params.event,
    organizer: event.data.organizer,
    expectedOrganizer: params.eventOrganizer,
    pdaComputedFrom: organizerPubkey.toString(),
    computedPda: eventPdaAddress.toString(),
    bidAddress: bidAddress.toString(),
    bidAmount: params.amount.toString()
  });

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