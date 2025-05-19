import { Connection } from "solana-kite";
import * as programClient from "./dist/js-client";
import { type KeyPairSigner, type Address } from "@solana/kit";
import { PublicKey } from "@solana/web3.js";

/**
 * Places a bid on a TicketFair event at the current auction price
 * 
 * @param connection - Solana connection
 * @param params - Bid parameters
 * @returns Object containing bid address and transaction signature
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