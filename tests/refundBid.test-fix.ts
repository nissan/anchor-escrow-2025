// Helper module to diagnose and fix the refundBid test issues
import { Connection } from "solana-kite";
import * as programClient from "../dist/js-client";
import { type KeyPairSigner, type Address, lamports } from "@solana/kit";
import { PublicKey, SystemProgram } from "@solana/web3.js";

// This is a modified version of refundBid that includes better error handling
export async function refundBidImproved(
  connection: Connection,
  params: {
    bidder: KeyPairSigner;
    event: Address;
    bid: Address;
    eventOrganizer: Address; // Add organizer to directly compute PDA
  }
) {
  // Calculate the event PDA authority
  const programIdPubkey = new PublicKey(programClient.ESCROW_PROGRAM_ADDRESS);
  const organizerPubkey = new PublicKey(params.eventOrganizer);
  
  const [eventPdaAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("event"), organizerPubkey.toBuffer()], 
    programIdPubkey
  );

  // Add diagnostic checks
  const event = await programClient.fetchEvent(connection.rpc, params.event);
  console.log("Event details for refundBid:", {
    address: params.event,
    organizer: event.data.organizer,
    expectedOrganizer: params.eventOrganizer,
    pdaComputedFrom: organizerPubkey.toString(),
    computedPda: eventPdaAddress.toString(),
    bidAddress: params.bid
  });

  // Create the refund bid instruction
  const refundBidIx = await programClient.getRefundBidInstructionAsync({
    bidder: params.bidder,
    event: params.event,
    bid: params.bid,
    eventPda: eventPdaAddress.toString(),
  });

  // Send the transaction
  const tx = await connection.sendTransactionFromInstructions({
    feePayer: params.bidder,
    instructions: [refundBidIx],
  });

  // Wait for transaction confirmation
  await new Promise(resolve => setTimeout(resolve, 500));

  return { tx };
}