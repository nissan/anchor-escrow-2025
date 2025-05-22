#!/usr/bin/env npx tsx

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as fs from 'fs';

async function testDevnet() {
  try {
    console.log('🌐 Testing TicketFair on Devnet...');
    
    // Setup connection to devnet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    console.log('✅ Connected to devnet');
    
    // Use known wallet address for devnet testing
    const walletPubkey = new PublicKey("GJ6KCD7G759GiVwqYfF5rKuf1WuXxcjEbjb9qK4wJW4S");
    
    console.log(`📔 Wallet: ${walletPubkey.toString()}`);
    
    // Check wallet balance
    const balance = await connection.getBalance(walletPubkey);
    console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < LAMPORTS_PER_SOL) {
      console.log('❌ Insufficient balance for testing. Please airdrop some SOL:');
      console.log(`   solana airdrop 2 ${walletPubkey.toString()} --url devnet`);
      return;
    }
    
    // Load the program
    const programId = new PublicKey("3XCMusDvagK9wyRaHEMbrhLPQfFQPXhQXZZ7oZ2pr2ah");
    
    // Try to fetch the program account to verify deployment
    try {
      const programAccount = await connection.getAccountInfo(programId);
      if (programAccount) {
        console.log('✅ Program deployed and found on devnet');
        console.log(`   Program ID: ${programId.toString()}`);
        console.log(`   Executable: ${programAccount.executable}`);
        console.log(`   Owner: ${programAccount.owner.toString()}`);
        console.log(`   Data length: ${programAccount.data.length} bytes`);
      } else {
        console.log('❌ Program not found on devnet');
        return;
      }
    } catch (error) {
      console.error('❌ Error fetching program account:', error);
      return;
    }
    
    console.log('\n🎉 Devnet verification complete!');
    console.log('✅ Program successfully deployed and accessible on devnet');
    console.log('✅ Ready for production testing');
    
  } catch (error) {
    console.error('❌ Devnet test failed:', error);
  }
}

// Run test
if (import.meta.url === `file://${process.argv[1]}`) {
  testDevnet().catch(console.error);
}

export { testDevnet };