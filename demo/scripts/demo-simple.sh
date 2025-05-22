#!/bin/bash

# Simplified demo script for testing
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_status() {
    local color=$1
    local message=$2
    echo -e "${color}$message${NC}"
}

echo "=== Simple TicketFair Demo Test ==="

# Test 1: Basic connection
print_status $BLUE "1. Testing basic connection..."
cat > test-connection.ts << 'EOF'
import { connect } from "solana-kite";
import * as programClient from "./dist/js-client/index.ts";

async function testConnection() {
    const connection = await connect("devnet");
    const wallet = await connection.createWallet({ airdropAmount: 100000000n });
    console.log("SUCCESS: " + wallet.address);
}

testConnection().catch(console.error);
EOF

RESULT=$(npx tsx test-connection.ts 2>&1)
if echo "$RESULT" | grep -q "SUCCESS:"; then
    ADDRESS=$(echo "$RESULT" | grep "SUCCESS:" | cut -d' ' -f2)
    print_status $GREEN "✅ Connection works: $ADDRESS"
else
    print_status $RED "❌ Connection failed:"
    echo "$RESULT"
    exit 1
fi

# Test 2: Program client
print_status $BLUE "2. Testing program client..."
cat > test-program.ts << 'EOF'
import * as programClient from "./dist/js-client/index.ts";

console.log("PROGRAM_ID:" + programClient.ESCROW_PROGRAM_ADDRESS);
EOF

PROGRAM_ID=$(npx tsx test-program.ts | grep "PROGRAM_ID:" | cut -d':' -f2)
print_status $GREEN "✅ Program ID: $PROGRAM_ID"

# Test 3: Create event instruction
print_status $BLUE "3. Testing event creation instruction..."
cat > test-event.ts << 'EOF'
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
EOF

EVENT_RESULT=$(npx tsx test-event.ts 2>&1)
if echo "$EVENT_RESULT" | grep -q "SUCCESS:"; then
    EVENT_ADDRESS=$(echo "$EVENT_RESULT" | grep "SUCCESS:" | cut -d' ' -f2)
    print_status $GREEN "✅ Event instruction works: $EVENT_ADDRESS"
else
    print_status $RED "❌ Event instruction failed:"
    echo "$EVENT_RESULT"
    exit 1
fi

# Cleanup
rm -f test-connection.ts test-program.ts test-event.ts

print_status $GREEN "🎉 All simplified tests passed!"
print_status $BLUE "The main demo script should now work. Try: ./demo-ticketfair-workflow.sh"