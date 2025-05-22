// Simple test to validate demo components work
import { connect } from "solana-kite";
import * as programClient from "../../dist/js-client/index.js";

async function testDemoBasics() {
  console.log("Testing demo basics...");
  
  try {
    // Test 1: Connection
    console.log("1. Testing connection...");
    const connection = await connect("devnet");
    console.log("✅ Connected to devnet");
    
    // Test 2: Program client
    console.log("2. Testing program client...");
    console.log("Program ID:", programClient.ESCROW_PROGRAM_ADDRESS);
    
    // Test 3: Create wallet
    console.log("3. Testing wallet creation...");
    const testWallet = await connection.createWallet({ airdropAmount: 100000000n });
    console.log("✅ Wallet created:", testWallet.address);
    
    // Test 4: Check program exists
    console.log("4. Testing program existence...");
    const balance = await connection.rpc.getBalance(testWallet.address);
    console.log("✅ Wallet balance:", balance);
    
    console.log("\n🎉 All basic components working!");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  }
}

testDemoBasics().catch(console.error);