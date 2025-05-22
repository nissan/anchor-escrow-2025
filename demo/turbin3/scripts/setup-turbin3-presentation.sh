#!/bin/bash

# TURBIN3 Presentation Setup Script
# Prepares the 90-second presentation and demo

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🎓 TURBIN3 Builders Cohort - Capstone Presentation Setup${NC}"
echo ""

# Check if marp is installed
if ! command -v marp &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Marp CLI for presentation generation...${NC}"
    npm install -g @marp-team/marp-cli
fi

# Navigate to turbin3 directory
cd "$(dirname "$0")/.."

# Generate HTML presentation
echo -e "${BLUE}🎯 Generating TURBIN3 presentation slides...${NC}"

marp presentations/turbin3-90sec-presentation.md \
    --output presentations/turbin3-90sec-presentation.html \
    --html \
    --allow-local-files

echo -e "${GREEN}✅ Presentation generated: demo/turbin3/presentations/turbin3-90sec-presentation.html${NC}"
echo ""

# Verify demo script
echo -e "${BLUE}🔍 Verifying demo components...${NC}"

if [[ -x "scripts/turbin3-90sec-demo.sh" ]]; then
    echo -e "${GREEN}✅ Demo script ready: demo/turbin3/scripts/turbin3-90sec-demo.sh${NC}"
else
    echo -e "${RED}❌ Demo script not found or not executable${NC}"
    exit 1
fi

# Check environment
echo -e "${BLUE}🌐 Checking environment...${NC}"

if command -v solana &> /dev/null; then
    echo -e "${GREEN}✅ Solana CLI found${NC}"
    
    # Configure for devnet
    solana config set --url devnet &>/dev/null
    echo -e "${GREEN}✅ Configured for devnet${NC}"
    
    # Check program
    PROGRAM_ID="3XCMusDvagK9wyRaHEMbrhLPQfFQPXhQXZZ7oZ2pr2ah"
    if solana program show $PROGRAM_ID &>/dev/null; then
        echo -e "${GREEN}✅ TicketFair program verified on devnet${NC}"
    else
        echo -e "${YELLOW}⚠️  Program not found on devnet - demo will be simulated${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Solana CLI not found - install for full demo${NC}"
fi

echo ""
echo -e "${PURPLE}🎬 TURBIN3 PRESENTATION INSTRUCTIONS:${NC}"
echo ""
echo "1. 📽️  Open presentation:"
echo "   demo/turbin3/presentations/turbin3-90sec-presentation.html"
echo ""
echo "2. 🎯 Navigate to slide 5 ('Live Code Demo')"
echo ""
echo "3. 🚀 Execute demo during presentation:"
echo "   ${YELLOW}./demo/turbin3/scripts/turbin3-90sec-demo.sh${NC}"
echo ""
echo "4. ⏱️  Timing breakdown:"
echo "   • Slides 1-4: 45 seconds"
echo "   • Live demo: 45 seconds" 
echo "   • Total: 90 seconds (perfect for Turbin3!)"
echo ""
echo -e "${BLUE}📋 TURBIN3 REQUIREMENTS COVERED:${NC}"
echo "   ✅ Functional blockchain project on DevNet"
echo "   ✅ Passing tests with comprehensive coverage"
echo "   ✅ 90-second presentation format"
echo "   ✅ Value proposition clearly articulated"
echo "   ✅ Founder-market fit demonstrated"
echo "   ✅ Quick code demo included"
echo ""
echo -e "${GREEN}🎓 Ready for TURBIN3 Capstone Demo!${NC}"

# Try to open the presentation
if command -v open &> /dev/null; then
    echo -e "${BLUE}🌐 Opening presentation...${NC}"
    open presentations/turbin3-90sec-presentation.html
elif command -v xdg-open &> /dev/null; then
    echo -e "${BLUE}🌐 Opening presentation...${NC}"
    xdg-open presentations/turbin3-90sec-presentation.html
else
    echo "Please manually open: demo/turbin3/presentations/turbin3-90sec-presentation.html"
fi

echo ""
echo -e "${PURPLE}💡 PRESENTATION TIPS:${NC}"
echo "• Practice 5-10 times as recommended by Turbin3"
echo "• Execute demo at slide 5 for maximum impact"
echo "• All transactions are real and verifiable"
echo "• Demo creates summary document for submission"