import { connect } from "solana-kite";
import * as programClient from "../dist/js-client/index.js";
import * as fs from "fs";

async function createEvent() {
    const connection = await connect("https://api.devnet.solana.com");
    const accounts = JSON.parse(fs.readFileSync("demo-accounts.json", "utf8"));
    
    // Recreate organizer wallet (in real app this would be from stored keys)
    const organizer = await connection.createWallet({ airdropAmount: 100000000n });
    
    // Create dummy accounts for Bubblegum (simplified for demo)
    const dummyAccounts = await connection.createWallets(5, { airdropAmount: 10000000n });
    
    const createEventIx = await programClient.getCreateEventInstructionAsync({
        organizer: organizer,
        merkleTree: dummyAccounts[0].address,
        bubblegumProgram: dummyAccounts[1].address,
        logWrapper: dummyAccounts[2].address,
        compressionProgram: dummyAccounts[3].address,
        noopProgram: dummyAccounts[4].address,
        metadataUrl: `https://demo.ticketfair.io/event-${Date.now()}.json`,
        ticketSupply: 1,
        startPrice: 1000000000n,  // 1 SOL
        endPrice: 100000000n,     // 0.1 SOL
        auctionStartTime: BigInt(1747892271),
        auctionEndTime: BigInt(1747892331)
    });
    
    const eventAddress = createEventIx.accounts[1].address;
    
    const createTx = await connection.sendTransactionFromInstructions({
        feePayer: organizer,
        instructions: [createEventIx]
    });
    
    // Activate the event
    const activateIx = await programClient.getActivateEventInstructionAsync({
        organizer: organizer,
        event: eventAddress
    });
    
    const activateTx = await connection.sendTransactionFromInstructions({
        feePayer: organizer,
        instructions: [activateIx]
    });
    
    // Update accounts file
    accounts.event = {
        address: eventAddress,
        organizer: organizer.address,
        startTime: 1747892271,
        endTime: 1747892331,
        createTx: createTx,
        activateTx: activateTx
    };
    
    fs.writeFileSync("demo-accounts.json", JSON.stringify(accounts, null, 2));
    
    console.log("EVENT_ADDRESS=" + eventAddress);
    console.log("EVENT_ORGANIZER=" + organizer.address);
    console.log("CREATE_TX=" + createTx);
    console.log("ACTIVATE_TX=" + activateTx);
}

createEvent().catch(console.error);
