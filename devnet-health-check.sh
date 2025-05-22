#!/bin/bash

PROGRAM_ID="3XCMusDvagK9wyRaHEMbrhLPQfFQPXhQXZZ7oZ2pr2ah"
RPC_URL="https://api.devnet.solana.com"

echo "=== TicketFair Devnet Health Check ==="
echo "Program ID: $PROGRAM_ID"
echo "RPC URL: $RPC_URL"
echo ""

# Configure solana CLI for devnet
echo "Configuring Solana CLI for devnet..."
solana config set --url devnet >/dev/null 2>&1

# Check if program exists
echo "1. Checking program existence..."
if solana program show $PROGRAM_ID >/dev/null 2>&1; then
    echo "✅ Program exists and is accessible"
else
    echo "❌ Program not found or not accessible"
    exit 1
fi

# Check program account details
echo ""
echo "2. Program account details:"
solana account $PROGRAM_ID --output json | jq -r '
  "Account: " + .pubkey,
  "Owner: " + .account.owner,
  "Lamports: " + (.account.lamports | tostring),
  "Executable: " + (.account.executable | tostring),
  "Data Length: " + (.account.data[1] | tostring) + " bytes"
'

# Check for any program-owned accounts
echo ""
echo "3. Checking for program-owned accounts..."

# Use curl to check program accounts
RESPONSE=$(curl -s -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 1,
    \"method\": \"getProgramAccounts\",
    \"params\": [\"$PROGRAM_ID\"]
  }")

ACCOUNT_COUNT=$(echo $RESPONSE | jq '.result | length')

if [ "$ACCOUNT_COUNT" != "null" ] && [ "$ACCOUNT_COUNT" != "" ]; then
    echo "Program-owned accounts: $ACCOUNT_COUNT"
    if [ "$ACCOUNT_COUNT" -gt 0 ]; then
        echo "✅ Program has active accounts (events/bids/tickets created)"
    else
        echo "ℹ️  No program accounts found (no events created yet)"
    fi
else
    echo "⚠️  Could not retrieve program accounts"
fi

# Test RPC connectivity
echo ""
echo "4. Testing RPC connectivity..."
SLOT=$(curl -s -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getSlot"
  }' | jq '.result')

if [ "$SLOT" != "null" ] && [ "$SLOT" != "" ]; then
    echo "✅ RPC connectivity OK (Current slot: $SLOT)"
else
    echo "❌ RPC connectivity failed"
    exit 1
fi

# Check recent program activity
echo ""
echo "5. Checking recent program activity..."
SIGNATURES=$(curl -s -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 1,
    \"method\": \"getSignaturesForAddress\",
    \"params\": [\"$PROGRAM_ID\", {\"limit\": 5}]
  }" | jq '.result | length')

if [ "$SIGNATURES" != "null" ] && [ "$SIGNATURES" != "" ]; then
    echo "Recent transactions: $SIGNATURES"
    if [ "$SIGNATURES" -gt 0 ]; then
        echo "✅ Program has recent activity"
    else
        echo "ℹ️  No recent transactions found"
    fi
else
    echo "⚠️  Could not retrieve transaction history"
fi

echo ""
echo "🎉 Health check completed!"
echo ""
echo "Program Status Summary:"
echo "- Program deployed and accessible: ✅"
echo "- RPC connectivity: ✅" 
echo "- Account count: $ACCOUNT_COUNT"
echo "- Recent transactions: $SIGNATURES"
echo ""
echo "To interact with the program:"
echo "  - Create an event: npx tsx devnet-workflow-test.ts"
echo "  - View in explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo "  - Monitor logs: solana logs $PROGRAM_ID --follow"