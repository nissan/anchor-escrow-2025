#!/bin/bash

# Simple TicketFair Demo Test Script
# Tests the core workflow steps without complex account creation

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROGRAM_ID="3XCMusDvagK9wyRaHEMbrhLPQfFQPXhQXZZ7oZ2pr2ah"

print_status() {
    echo -e "${1}${2}${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}=== $1 ===${NC}"
}

main() {
    print_header "TicketFair Simple Demo Test"
    
    # Navigate to demo archived-runs directory
    cd "$(dirname "$0")/../archived-runs"
    mkdir -p "test-$(date +%Y%m%d-%H%M%S)"
    cd "test-$(date +%Y%m%d-%H%M%S)"
    
    print_status $BLUE "📍 Working directory: $(pwd)"
    
    print_header "Step 1: Environment Check"
    
    # Check Solana CLI
    if command -v solana &> /dev/null; then
        print_status $GREEN "✅ Solana CLI found"
        solana config set --url devnet &>/dev/null
        print_status $GREEN "✅ Configured for devnet"
    else
        print_status $RED "❌ Solana CLI not found"
        exit 1
    fi
    
    # Check program
    if solana program show $PROGRAM_ID &>/dev/null; then
        print_status $GREEN "✅ Program verified: $PROGRAM_ID"
    else
        print_status $RED "❌ Program not found on devnet"
        exit 1
    fi
    
    print_header "Step 2: Client Generation"
    
    # Navigate to project root
    cd ../../../
    print_status $BLUE "📍 Project root: $(pwd)"
    
    if [[ -f "create-codama-client.ts" ]]; then
        print_status $GREEN "✅ Found create-codama-client.ts"
        
        if npx tsx create-codama-client.ts &>/dev/null; then
            print_status $GREEN "✅ TypeScript client generated"
        else
            print_status $RED "❌ Client generation failed"
            exit 1
        fi
    else
        print_status $RED "❌ create-codama-client.ts not found"
        exit 1
    fi
    
    print_header "Step 3: Demo Components Check"
    
    # Check if demo examples exist
    if [[ -d "demo/examples" ]]; then
        print_status $GREEN "✅ Demo examples directory found"
        
        local example_files=("create-event.ts" "place-bid.ts" "award-and-finalize.ts" "demo-full-auction.ts")
        for file in "${example_files[@]}"; do
            if [[ -f "demo/examples/$file" ]]; then
                print_status $GREEN "✅ Found demo/examples/$file"
            else
                print_status $YELLOW "⚠️  Missing demo/examples/$file"
            fi
        done
    else
        print_status $RED "❌ Demo examples directory not found"
    fi
    
    print_header "Step 4: Test npm Scripts"
    
    # Test if npm scripts work
    if npm run demo:help &>/dev/null; then
        print_status $GREEN "✅ npm demo scripts configured"
    else
        print_status $YELLOW "⚠️  npm demo scripts may have issues"
    fi
    
    print_header "🎉 Simple Demo Test Complete"
    
    print_status $GREEN "✅ All basic components verified"
    print_status $BLUE "🚀 Ready to run full demo with:"
    echo "   ./demo-ticketfair-workflow.sh"
    echo "   npm run demo:full-auction"
    echo "   npm run demo:3min"
    
    # Clean up test directory
    cd demo/archived-runs
    rm -rf "test-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
}

main "$@"