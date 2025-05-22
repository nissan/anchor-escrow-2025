import { connect } from "solana-kite";
import * as programClient from "./dist/js-client/index.ts";

async function testEventInstruction() {
    try {
        const connection = await connect("devnet");
        const organizer = await connection.createWallet({ airdropAmount: 1000000000n });
        const dummyAccounts = await connection.createWallets(5, { airdropAmount: 10000000n });
        
        const createEventIx = await programClient.getCreateEventInstructionAsync({
            organizer: organizer,
            merkleTree: dummyAccounts[0].address,
            bubblegumProgram: dummyAccounts[1].address,
            logWrapper: dummyAccounts[2].address,
            compressionProgram: dummyAccounts[3].address,
            noopProgram: dummyAccounts[4].address,
            metadataUrl: "https://example.com/test.json",
            ticketSupply: 1,
            startPrice: 1000000000n,
            endPrice: 100000000n,
            auctionStartTime: BigInt(Math.floor(Date.now() / 1000)),
            auctionEndTime: BigInt(Math.floor(Date.now() / 1000) + 60)
        });
        
        console.log("SUCCESS: " + createEventIx.accounts[1].address);
    } catch (error) {
        console.log("ERROR: " + error.message);
    }
}

testEventInstruction();
