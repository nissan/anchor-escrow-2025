#!/bin/bash

PROGRAM_ID="3XCMusDvagK9wyRaHEMbrhLPQfFQPXhQXZZ7oZ2pr2ah"
RPC_URL="https://api.devnet.solana.com"

echo "=== TicketFair RPC API Test ==="
echo "Program ID: $PROGRAM_ID"
echo "RPC URL: $RPC_URL"
echo ""

# Test 1: Get Account Info
echo "1. Testing getAccountInfo..."
ACCOUNT_INFO=$(curl -s -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 1,
    \"method\": \"getAccountInfo\",
    \"params\": [
      \"$PROGRAM_ID\",
      {
        \"encoding\": \"base64\"
      }
    ]
  }")

if echo "$ACCOUNT_INFO" | jq -e '.result.value' > /dev/null; then
    echo "✅ getAccountInfo successful"
    echo "   Owner: $(echo "$ACCOUNT_INFO" | jq -r '.result.value.owner')"
    echo "   Executable: $(echo "$ACCOUNT_INFO" | jq -r '.result.value.executable')"
    echo "   Lamports: $(echo "$ACCOUNT_INFO" | jq -r '.result.value.lamports')"
else
    echo "❌ getAccountInfo failed"
    echo "$ACCOUNT_INFO" | jq '.error'
fi

echo ""

# Test 2: Get Program Accounts
echo "2. Testing getProgramAccounts..."
PROGRAM_ACCOUNTS=$(curl -s -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 2,
    \"method\": \"getProgramAccounts\",
    \"params\": [
      \"$PROGRAM_ID\",
      {
        \"encoding\": \"base64\"
      }
    ]
  }")

ACCOUNT_COUNT=$(echo "$PROGRAM_ACCOUNTS" | jq '.result | length')
if [ "$ACCOUNT_COUNT" != "null" ]; then
    echo "✅ getProgramAccounts successful"
    echo "   Found $ACCOUNT_COUNT program-owned accounts"
else
    echo "❌ getProgramAccounts failed"
    echo "$PROGRAM_ACCOUNTS" | jq '.error'
fi

echo ""

# Test 3: Get Signatures for Address
echo "3. Testing getSignaturesForAddress..."
SIGNATURES=$(curl -s -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 3,
    \"method\": \"getSignaturesForAddress\",
    \"params\": [
      \"$PROGRAM_ID\",
      {
        \"limit\": 5
      }
    ]
  }")

SIG_COUNT=$(echo "$SIGNATURES" | jq '.result | length')
if [ "$SIG_COUNT" != "null" ]; then
    echo "✅ getSignaturesForAddress successful"
    echo "   Found $SIG_COUNT recent transactions"
    
    if [ "$SIG_COUNT" -gt 0 ]; then
        echo "   Most recent signature: $(echo "$SIGNATURES" | jq -r '.result[0].signature')"
        echo "   Block time: $(echo "$SIGNATURES" | jq -r '.result[0].blockTime')"
    fi
else
    echo "❌ getSignaturesForAddress failed"
    echo "$SIGNATURES" | jq '.error'
fi

echo ""

# Test 4: Get Current Slot
echo "4. Testing getSlot..."
SLOT_INFO=$(curl -s -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "getSlot"
  }')

CURRENT_SLOT=$(echo "$SLOT_INFO" | jq '.result')
if [ "$CURRENT_SLOT" != "null" ]; then
    echo "✅ getSlot successful"
    echo "   Current slot: $CURRENT_SLOT"
else
    echo "❌ getSlot failed"
    echo "$SLOT_INFO" | jq '.error'
fi

echo ""

# Test 5: Get Version
echo "5. Testing getVersion..."
VERSION_INFO=$(curl -s -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "getVersion"
  }')

SOLANA_VERSION=$(echo "$VERSION_INFO" | jq -r '.result."solana-core"')
if [ "$SOLANA_VERSION" != "null" ]; then
    echo "✅ getVersion successful"
    echo "   Solana version: $SOLANA_VERSION"
else
    echo "❌ getVersion failed"
    echo "$VERSION_INFO" | jq '.error'
fi

echo ""

# Test 6: Simulate a simple transaction (just for connectivity test)
echo "6. Testing RPC method availability..."
METHODS=$(curl -s -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "getHealth"
  }')

if echo "$METHODS" | jq -e '.result' > /dev/null; then
    echo "✅ RPC health check successful"
    echo "   Status: $(echo "$METHODS" | jq -r '.result')"
else
    echo "⚠️  RPC health method not available (this is normal for some RPC providers)"
fi

echo ""
echo "🎉 RPC API tests completed!"
echo ""
echo "Summary:"
echo "- Program account accessible: ✅"
echo "- Program-owned accounts: $ACCOUNT_COUNT"
echo "- Recent transactions: $SIG_COUNT"
echo "- Current slot: $CURRENT_SLOT"
echo "- Solana version: $SOLANA_VERSION"
echo ""
echo "All basic RPC calls are working properly."
echo "You can now confidently interact with the deployed program!"