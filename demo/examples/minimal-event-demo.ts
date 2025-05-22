import { connect } from "solana-kite";
import * as programClient from "../../dist/js-client/index.js";

async function createMinimalEvent() {
    try {
        console.log("📝 Connecting to devnet...");
        const connection = await connect("devnet");
        
        console.log("👤 Creating organizer wallet...");
        const organizer = await connection.createWallet({ airdropAmount: 2000000000n });
        console.log("Organizer: " + organizer.address);
        
        // Wait to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log("🏗️ Creating support accounts...");
        const supportAccounts = await connection.createWallets(5, { airdropAmount: 10000000n });
        
        console.log("🎫 Creating event instruction...");
        const startTime = Math.floor(Date.now() / 1000) + 10;
        const endTime = startTime + 60;
        
        const createEventIx = await programClient.getCreateEventInstructionAsync({
            organizer: organizer,
            merkleTree: supportAccounts[0].address,
            bubblegumProgram: supportAccounts[1].address,
            logWrapper: supportAccounts[2].address,
            compressionProgram: supportAccounts[3].address,
            noopProgram: supportAccounts[4].address,
            metadataUrl: `https://demo.ticketfair.io/event-${Date.now()}.json`,
            ticketSupply: 1,
            startPrice: 1000000000n,  // 1 SOL
            endPrice: 100000000n,     // 0.1 SOL
            auctionStartTime: BigInt(startTime),
            auctionEndTime: BigInt(endTime)
        });
        
        const eventAddress = createEventIx.accounts[1].address;
        console.log("🎯 Event address: " + eventAddress);
        
        console.log("📤 Sending create transaction...");
        const createTx = await connection.sendTransactionFromInstructions({
            feePayer: organizer,
            instructions: [createEventIx]
        });
        
        console.log("✅ Create TX: " + createTx);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log("⚡ Activating event...");
        const activateIx = await programClient.getActivateEventInstructionAsync({
            organizer: organizer,
            event: eventAddress
        });
        
        const activateTx = await connection.sendTransactionFromInstructions({
            feePayer: organizer,
            instructions: [activateIx]
        });
        
        console.log("✅ Activate TX: " + activateTx);
        
        console.log("SUCCESS: Event created and activated!");
        console.log("Event: " + eventAddress);
        console.log("Create TX: https://explorer.solana.com/tx/" + createTx + "?cluster=devnet");
        console.log("Activate TX: https://explorer.solana.com/tx/" + activateTx + "?cluster=devnet");
        
    } catch (error) {
        console.log("ERROR: " + error.message);
    }
}

createMinimalEvent();
