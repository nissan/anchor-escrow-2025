// Simple script to create a single event on devnet for testing
import { connect } from "solana-kite";
import * as programClient from "./dist/js-client/index.js";

async function createEventOnDevnet() {
  console.log("=== Create Event on Devnet ===");
  console.log("Program ID:", programClient.ESCROW_PROGRAM_ADDRESS);
  console.log("");
  
  const connection = await connect("https://api.devnet.solana.com");
  console.log("✅ Connected to devnet");
  
  // Create organizer wallet with sufficient funds
  console.log("\n📝 Creating organizer wallet...");
  const organizer = await connection.createWallet({ 
    airdropAmount: 5000000000n // 5 SOL
  });
  
  console.log("   Organizer address:", organizer.address);
  
  // Create dummy accounts for Bubblegum integration (for testing)
  console.log("   Creating dummy accounts for Bubblegum integration...");
  const dummyAccounts = await connection.createWallets(5, { 
    airdropAmount: 100000000n // 0.1 SOL each
  });
  
  const [merkleTree, bubblegumProgram, logWrapper, compressionProgram, noopProgram] = dummyAccounts;
  
  console.log("✅ All accounts created");
  
  // Wait for airdrop confirmation
  console.log("   Waiting for airdrop confirmation...");
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check balance
  const balance = await connection.rpc.getBalance(organizer.address);
  console.log("   Organizer balance:", (Number(balance) / 1e9).toFixed(2), "SOL");
  
  try {
    // Event parameters
    const eventParams = {
      metadataUrl: `https://example.com/devnet-event-${Date.now()}.json`,
      ticketSupply: 10,
      startPrice: 1000000000n, // 1 SOL
      endPrice: 100000000n,    // 0.1 SOL
      auctionStartTime: BigInt(Math.floor(Date.now() / 1000) - 60), // Started 1 minute ago
      auctionEndTime: BigInt(Math.floor(Date.now() / 1000) + 3600)  // Ends in 1 hour
    };
    
    console.log("\n🎫 Creating event with parameters:");
    console.log("   Metadata URL:", eventParams.metadataUrl);
    console.log("   Ticket Supply:", eventParams.ticketSupply);
    console.log("   Start Price:", (Number(eventParams.startPrice) / 1e9).toFixed(2), "SOL");
    console.log("   End Price:", (Number(eventParams.endPrice) / 1e9).toFixed(2), "SOL");
    console.log("   Auction Duration: 1 hour");
    
    // Create event instruction
    const createEventIx = await programClient.getCreateEventInstructionAsync({
      organizer: organizer,
      merkleTree: merkleTree.address,
      bubblegumProgram: bubblegumProgram.address,
      logWrapper: logWrapper.address,
      compressionProgram: compressionProgram.address,
      noopProgram: noopProgram.address,
      ...eventParams
    });
    
    const eventAddress = createEventIx.accounts[1].address;
    console.log("   Event address:", eventAddress);
    
    // Send transaction
    console.log("\n📤 Sending create event transaction...");
    const createTx = await connection.sendTransactionFromInstructions({
      feePayer: organizer,
      instructions: [createEventIx]
    });
    
    console.log("✅ Event creation transaction sent");
    console.log("   Transaction signature:", createTx);
    console.log("   Explorer link:", `https://explorer.solana.com/tx/${createTx}?cluster=devnet`);
    
    // Wait for confirmation
    console.log("   Waiting for confirmation...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Activate the event
    console.log("\n⚡ Activating event...");
    const activateIx = await programClient.getActivateEventInstructionAsync({
      organizer: organizer,
      event: eventAddress
    });
    
    const activateTx = await connection.sendTransactionFromInstructions({
      feePayer: organizer,
      instructions: [activateIx]
    });
    
    console.log("✅ Event activation transaction sent");
    console.log("   Transaction signature:", activateTx);
    console.log("   Explorer link:", `https://explorer.solana.com/tx/${activateTx}?cluster=devnet`);
    
    // Wait for confirmation
    console.log("   Waiting for activation confirmation...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Fetch created event to verify
    console.log("\n📊 Fetching created event data...");
    const eventData = await programClient.fetchEvent(
      connection.rpc, 
      eventAddress
    );
    
    if (eventData) {
      console.log("✅ Event data retrieved successfully:");
      console.log("   Organizer:", eventData.data.organizer);
      console.log("   Status:", eventData.data.status);
      console.log("   Ticket Supply:", eventData.data.ticketSupply);
      console.log("   Tickets Awarded:", eventData.data.ticketsAwarded);
      console.log("   Start Price:", (Number(eventData.data.startPrice) / 1e9).toFixed(2), "SOL");
      console.log("   End Price:", (Number(eventData.data.endPrice) / 1e9).toFixed(2), "SOL");
      console.log("   cNFT Assets:", eventData.data.cnftAssetIds.length);
      
      // Calculate current price
      const now = Math.floor(Date.now() / 1000);
      const auctionStart = Number(eventData.data.auctionStartTime);
      const auctionEnd = Number(eventData.data.auctionEndTime);
      
      if (now < auctionEnd) {
        const elapsed = now - auctionStart;
        const duration = auctionEnd - auctionStart;
        const startPrice = Number(eventData.data.startPrice);
        const endPrice = Number(eventData.data.endPrice);
        const currentPrice = startPrice - (startPrice - endPrice) * elapsed / duration;
        
        console.log("   Current Price:", (currentPrice / 1e9).toFixed(4), "SOL");
        console.log("   Time Remaining:", Math.max(0, auctionEnd - now), "seconds");
      }
      
      console.log("\n🎉 Event created and activated successfully!");
      
      console.log("\n📋 What you can do next:");
      console.log("   1. View event in explorer:", `https://explorer.solana.com/address/${eventAddress}?cluster=devnet`);
      console.log("   2. Place bids on this event using the buyer functionality");
      console.log("   3. Monitor program logs: solana logs", programClient.ESCROW_PROGRAM_ADDRESS, "--follow");
      console.log("   4. Run full workflow test: npx tsx devnet-workflow-test.ts");
      
      console.log("\n📝 Event Details for Reference:");
      console.log("   Event Address:", eventAddress);
      console.log("   Organizer Address:", organizer.address);
      console.log("   Program ID:", programClient.ESCROW_PROGRAM_ADDRESS);
      
    } else {
      console.log("❌ Failed to fetch event data after creation");
    }
    
  } catch (error) {
    console.error("\n❌ Error creating event:", error.message);
    
    console.log("\n🔧 Troubleshooting steps:");
    console.log("   1. Check if you have sufficient SOL:", await connection.rpc.getBalance(organizer.address));
    console.log("   2. Verify program deployment: ./devnet-health-check.sh");
    console.log("   3. Check network connectivity to devnet");
    console.log("   4. Review transaction logs for specific errors");
    
    throw error;
  }
}

// Handle graceful exit
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Script interrupted by user');
  process.exit(0);
});

// Run the script
if (require.main === module) {
  createEventOnDevnet()
    .then(() => {
      console.log("\n✨ Script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Script failed:", error.message);
      process.exit(1);
    });
}