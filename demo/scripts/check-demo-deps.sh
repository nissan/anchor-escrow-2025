#!/bin/bash

# Check dependencies for TicketFair demo
echo "=== TicketFair Demo Dependencies Check ==="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_command() {
    local cmd=$1
    local name=$2
    local install_hint=$3
    
    if command -v "$cmd" &> /dev/null; then
        echo -e "${GREEN}✅ $name is installed${NC}"
        return 0
    else
        echo -e "${RED}❌ $name is not installed${NC}"
        if [ -n "$install_hint" ]; then
            echo -e "${YELLOW}   Install with: $install_hint${NC}"
        fi
        return 1
    fi
}

# Check all required commands
echo "Checking required dependencies..."
echo ""

missing_deps=0

# Essential tools
check_command "jq" "jq (JSON processor)" "brew install jq" || missing_deps=$((missing_deps + 1))
check_command "bc" "bc (calculator)" "brew install bc" || missing_deps=$((missing_deps + 1))
check_command "solana" "Solana CLI" "sh -c \"\$(curl -sSfL https://release.solana.com/v1.18.0/install)\"" || missing_deps=$((missing_deps + 1))
check_command "anchor" "Anchor CLI" "npm install -g @coral-xyz/anchor-cli" || missing_deps=$((missing_deps + 1))
check_command "npx" "Node.js/npm" "brew install node" || missing_deps=$((missing_deps + 1))

echo ""

# Check if TypeScript files exist
if [ -f "dist/js-client/index.ts" ]; then
    echo -e "${GREEN}✅ TypeScript client is generated${NC}"
else
    echo -e "${YELLOW}⚠️  TypeScript client not found${NC}"
    echo -e "${YELLOW}   Run: npx tsx create-codama-client.ts${NC}"
    missing_deps=$((missing_deps + 1))
fi

# Check if program is deployed
PROGRAM_ID="3XCMusDvagK9wyRaHEMbrhLPQfFQPXhQXZZ7oZ2pr2ah"
if solana program show $PROGRAM_ID &>/dev/null; then
    echo -e "${GREEN}✅ Program is deployed on devnet${NC}"
else
    echo -e "${RED}❌ Program not found on devnet${NC}"
    echo -e "${YELLOW}   Check program deployment status${NC}"
    missing_deps=$((missing_deps + 1))
fi

echo ""

if [ $missing_deps -eq 0 ]; then
    echo -e "${GREEN}🎉 All dependencies are satisfied!${NC}"
    echo -e "${GREEN}You can run the demo with: ./demo-ticketfair-workflow.sh${NC}"
    exit 0
else
    echo -e "${RED}❌ $missing_deps dependencies are missing${NC}"
    echo -e "${YELLOW}Please install the missing dependencies and try again${NC}"
    exit 1
fi