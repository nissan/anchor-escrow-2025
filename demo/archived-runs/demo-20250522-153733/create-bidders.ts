import { connect } from "solana-kite";
import * as fs from "fs";

async function createBidders() {
    const connection = await connect("https://api.devnet.solana.com");
    const bidders = await connection.createWallets(3, { airdropAmount: 2000000000n });
    
    const accounts = JSON.parse(fs.readFileSync("demo-accounts.json", "utf8"));
    accounts.bidders = bidders.map(b => b.address);
    
    fs.writeFileSync("demo-accounts.json", JSON.stringify(accounts, null, 2));
    
    bidders.forEach((bidder, i) => {
        console.log(`BIDDER_${i + 1}_ADDRESS=${bidder.address}`);
    });
}

createBidders().catch(console.error);
