import { connect } from "solana-kite";
import * as programClient from "../dist/js-client/index.js";
import * as fs from "fs";
import { PublicKey } from "@solana/web3.js";

async function placeBid() {
    const connection = await connect("https://api.devnet.solana.com");
    const accounts = JSON.parse(fs.readFileSync("demo-accounts.json", "utf8"));
    
    // Recreate bidder wallet
    const bidder = await connection.createWallet({ airdropAmount: 100000000n });
    
    // Calculate bid PDA
    const programIdPubkey = new PublicKey(programClient.ESCROW_PROGRAM_ADDRESS);
    const bidderPubkey = new PublicKey(bidder.address);
    const eventPubkey = new PublicKey(accounts.event.address);
    
    const [bidAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from("bid"), eventPubkey.toBuffer(), bidderPubkey.toBuffer()],
        programIdPubkey
    );
    
    try {
        const placeBidIx = await programClient.getPlaceBidInstructionAsync({
            bidder: bidder,
            event: accounts.event.address,
            eventPda: accounts.event.address,
            amount: 
        });
        
        const tx = await connection.sendTransactionFromInstructions({
            feePayer: bidder,
            instructions: [placeBidIx]
        });
        
        // Update accounts
        if (!accounts.bids) accounts.bids = {};
        accounts.bids['bidder1'] = {
            address: bidAddress.toString(),
            bidder: bidder.address,
            amount: ,
            time: 15,
            tx: tx
        };
        
        fs.writeFileSync("demo-accounts.json", JSON.stringify(accounts, null, 2));
        
        console.log("BID_TX=" + tx);
        console.log("BID_ADDRESS=" + bidAddress.toString());
        
    } catch (error) {
        console.log("BID_ERROR=" + error.message);
    }
}

placeBid().catch(console.error);
