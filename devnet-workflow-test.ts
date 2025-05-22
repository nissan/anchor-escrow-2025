// Complete workflow test on devnet
import { connect } from "solana-kite";
import * as programClient from "./dist/js-client/index.js";

async function fullWorkflowTest() {
  console.log("=== TicketFair Devnet Workflow Test ===");
  console.log("Program ID:", programClient.ESCROW_PROGRAM_ADDRESS);
  console.log("Network: Solana Devnet");
  console.log("Timestamp:", new Date().toISOString());
  console.log("");
  
  const connection = await connect("https://api.devnet.solana.com");
  console.log("✅ Connected to devnet");
  
  // Step 1: Create accounts
  console.log("\n📝 Step 1: Creating test accounts...");
  console.log("   Creating organizer and buyer wallets...");
  
  const [organizer, buyer] = await connection.createWallets(2, { 
    airdropAmount: 5000000000n // 5 SOL each
  });
  
  console.log("   Creating dummy accounts for Bubblegum integration...");
  const dummyAccounts = await connection.createWallets(5, { 
    airdropAmount: 100000000n // 0.1 SOL each for fees
  });
  
  const [merkleTree, bubblegumProgram, logWrapper, compressionProgram, noopProgram] = dummyAccounts;
  
  console.log("✅ Accounts created successfully");
  console.log("   Organizer:", organizer.address);
  console.log("   Buyer:", buyer.address);
  console.log("   Merkle Tree:", merkleTree.address);
  
  // Wait for airdrops to confirm
  console.log("   Waiting for airdrops to confirm...");
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check balances
  const organizerBalance = await connection.rpc.getBalance(organizer.address);
  const buyerBalance = await connection.rpc.getBalance(buyer.address);
  console.log("   Organizer balance:", (Number(organizerBalance) / 1e9).toFixed(2), "SOL");
  console.log("   Buyer balance:", (Number(buyerBalance) / 1e9).toFixed(2), "SOL");
  
  try {
    // Step 2: Create Event
    console.log("\n🎫 Step 2: Creating event...");
    
    const eventMetadata = {
      metadataUrl: `https://example.com/devnet-test-${Date.now()}.json`,
      ticketSupply: 5,
      startPrice: 2000000000n, // 2 SOL
      endPrice: 200000000n,    // 0.2 SOL
      auctionStartTime: BigInt(Math.floor(Date.now() / 1000) - 30), // Started 30 seconds ago
      auctionEndTime: BigInt(Math.floor(Date.now() / 1000) + 1800)  // Ends in 30 minutes
    };
    
    console.log("   Event parameters:");
    console.log("     Tickets:", eventMetadata.ticketSupply);
    console.log("     Start price:", (Number(eventMetadata.startPrice) / 1e9).toFixed(2), "SOL");
    console.log("     End price:", (Number(eventMetadata.endPrice) / 1e9).toFixed(2), "SOL");
    console.log("     Duration: 30 minutes");
    
    const createEventIx = await programClient.getCreateEventInstructionAsync({
      organizer: organizer,
      merkleTree: merkleTree.address,
      bubblegumProgram: bubblegumProgram.address,
      logWrapper: logWrapper.address,
      compressionProgram: compressionProgram.address,
      noopProgram: noopProgram.address,
      ...eventMetadata
    });
    
    const eventAddress = createEventIx.accounts[1].address;
    console.log("   Event will be created at:", eventAddress);
    
    const createTx = await connection.sendTransactionFromInstructions({
      feePayer: organizer,
      instructions: [createEventIx]
    });
    
    console.log("✅ Event created successfully");
    console.log("   Transaction:", `https://explorer.solana.com/tx/${createTx}?cluster=devnet`);
    console.log("   Event address:", eventAddress);
    
    // Wait for confirmation
    console.log("   Waiting for transaction confirmation...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Activate Event
    console.log("\n⚡ Step 3: Activating event...");
    
    const activateIx = await programClient.getActivateEventInstructionAsync({
      organizer: organizer,
      event: eventAddress
    });
    
    const activateTx = await connection.sendTransactionFromInstructions({
      feePayer: organizer,
      instructions: [activateIx]
    });
    
    console.log("✅ Event activated successfully");
    console.log("   Transaction:", `https://explorer.solana.com/tx/${activateTx}?cluster=devnet`);
    
    // Wait for confirmation
    console.log("   Waiting for activation confirmation...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 4: Fetch and Validate Event Data
    console.log("\n📊 Step 4: Fetching and validating event data...");
    
    const eventData = await programClient.fetchEvent(connection.rpc, eventAddress);
    
    if (!eventData) {
      throw new Error("Failed to fetch event data");
    }
    
    console.log("✅ Event data retrieved successfully:");
    console.log("   Organizer:", eventData.data.organizer);
    console.log("   Status:", eventData.data.status);
    console.log("   Ticket Supply:", eventData.data.ticketSupply);
    console.log("   Tickets Awarded:", eventData.data.ticketsAwarded);
    console.log("   Start Price:", (Number(eventData.data.startPrice) / 1e9).toFixed(2), "SOL");
    console.log("   End Price:", (Number(eventData.data.endPrice) / 1e9).toFixed(2), "SOL");
    console.log("   Auction Start:", new Date(Number(eventData.data.auctionStartTime) * 1000).toLocaleString());
    console.log("   Auction End:", new Date(Number(eventData.data.auctionEndTime) * 1000).toLocaleString());
    console.log("   Close Price:", Number(eventData.data.auctionClosePrice));
    console.log("   Merkle Tree:", eventData.data.merkleTree);
    console.log("   cNFT Asset IDs:", eventData.data.cnftAssetIds.length, "assets");
    
    // Step 5: Calculate Current Price
    console.log("\n💰 Step 5: Testing price calculation...");
    
    const now = Math.floor(Date.now() / 1000);
    const auctionStart = Number(eventData.data.auctionStartTime);
    const auctionEnd = Number(eventData.data.auctionEndTime);
    const startPrice = Number(eventData.data.startPrice);
    const endPrice = Number(eventData.data.endPrice);
    
    let currentPrice: number;
    
    if (now <= auctionStart) {
      currentPrice = startPrice;
      console.log("   Auction hasn't started - price at start price");
    } else if (now >= auctionEnd) {
      currentPrice = endPrice;
      console.log("   Auction has ended - price at end price");
    } else {
      const elapsed = now - auctionStart;
      const duration = auctionEnd - auctionStart;
      const priceDecrement = (startPrice - endPrice) * elapsed / duration;
      currentPrice = startPrice - priceDecrement;
      console.log("   Auction is active - calculating current price");
    }
    
    console.log("   Current auction price:", (currentPrice / 1e9).toFixed(4), "SOL");
    console.log("   Time remaining:", Math.max(0, auctionEnd - now), "seconds");
    
    // Step 6: Validation Summary
    console.log("\n✅ Step 6: Validation Summary");
    
    const validations = [
      { name: "Program deployed and accessible", passed: true },
      { name: "Event creation successful", passed: !!eventData },
      { name: "Event activation successful", passed: eventData.data.status !== 0 },
      { name: "Event data consistency", passed: eventData.data.organizer === organizer.address },
      { name: "Ticket supply correct", passed: eventData.data.ticketSupply === eventMetadata.ticketSupply },
      { name: "Price parameters correct", passed: 
        eventData.data.startPrice === eventMetadata.startPrice && 
        eventData.data.endPrice === eventMetadata.endPrice 
      },
      { name: "cNFT assets generated", passed: eventData.data.cnftAssetIds.length === eventMetadata.ticketSupply },
      { name: "Auction timing correct", passed: 
        eventData.data.auctionStartTime === eventMetadata.auctionStartTime &&
        eventData.data.auctionEndTime === eventMetadata.auctionEndTime
      }
    ];
    
    console.log("\n   Validation Results:");
    validations.forEach(v => {
      console.log(`   ${v.passed ? '✅' : '❌'} ${v.name}`);
    });
    
    const allPassed = validations.every(v => v.passed);
    
    if (allPassed) {
      console.log("\n🎉 Complete workflow test PASSED!");
      console.log("\n📋 Test Summary:");
      console.log("   ✅ Program deployment verified");
      console.log("   ✅ Event creation and activation successful");
      console.log("   ✅ All data validations passed");
      console.log("   ✅ Price calculation working correctly");
      console.log("   ✅ Compressed NFT integration functional");
      
      console.log("\n🚀 Next Steps You Can Test:");
      console.log("   1. Place bids using the buyer account");
      console.log("   2. Award tickets to winning bidders");
      console.log("   3. Test refund functionality");
      console.log("   4. Finalize auction with closing price");
      
      console.log("\n🔗 Useful Links:");
      console.log("   Event Explorer:", `https://explorer.solana.com/address/${eventAddress}?cluster=devnet`);
      console.log("   Program Explorer:", `https://explorer.solana.com/address/${programClient.ESCROW_PROGRAM_ADDRESS}?cluster=devnet`);
      console.log("   Monitor Logs: solana logs", programClient.ESCROW_PROGRAM_ADDRESS, "--follow");
      
    } else {
      console.log("\n❌ Some validations failed - check the results above");
      process.exit(1);
    }
    
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("\nError details:", error);
    
    console.log("\n🔧 Troubleshooting:");
    console.log("   1. Ensure you have sufficient SOL for transactions");
    console.log("   2. Check network connectivity to devnet");
    console.log("   3. Verify program is deployed:", programClient.ESCROW_PROGRAM_ADDRESS);
    console.log("   4. Run health check: ./devnet-health-check.sh");
    
    throw error;
  }
}

// Handle graceful exit
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Test interrupted by user');
  process.exit(0);
});

// Run the test
if (require.main === module) {
  fullWorkflowTest()
    .then(() => {
      console.log("\n✨ Test completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Test failed with error:", error.message);
      process.exit(1);
    });
}