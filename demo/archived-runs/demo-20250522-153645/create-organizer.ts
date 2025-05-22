import { connect } from "solana-kite";
import * as fs from "fs";

async function createOrganizer() {
    const connection = await connect("https://api.devnet.solana.com");
    const organizer = await connection.createWallet({ airdropAmount: 5000000000n });
    
    fs.writeFileSync("demo-accounts.json", JSON.stringify({
        organizer: organizer.address,
        timestamp: Date.now()
    }, null, 2));
    
    console.log("ORGANIZER_ADDRESS=" + organizer.address);
}

createOrganizer().catch(console.error);
