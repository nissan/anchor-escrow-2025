import { connect } from "solana-kite";
import * as programClient from "./dist/js-client/index.ts";

async function testConnection() {
    const connection = await connect("devnet");
    const wallet = await connection.createWallet({ airdropAmount: 100000000n });
    console.log("SUCCESS: " + wallet.address);
}

testConnection().catch(console.error);
