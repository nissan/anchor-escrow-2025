#!/bin/bash

# Script to generate and present the 3-minute demo

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🎬 TicketFair 3-Minute Presentation Setup${NC}"
echo ""

# Check if marp is installed
if ! command -v marp &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Marp CLI for presentation generation...${NC}"
    npm install -g @marp-team/marp-cli
fi

# Generate HTML presentation
echo -e "${BLUE}🎯 Generating presentation slides...${NC}"
cd "$(dirname "$0")/.."

marp presentations/3min-demo-presentation.md \
    --output presentations/3min-demo-presentation.html \
    --html \
    --allow-local-files

echo -e "${GREEN}✅ Presentation generated: demo/presentations/3min-demo-presentation.html${NC}"
echo ""

echo -e "${BLUE}🎪 Presentation Instructions:${NC}"
echo "1. Open: demo/presentations/3min-demo-presentation.html in your browser"
echo "2. Use arrow keys to navigate slides"
echo "3. When you reach the 'Live Demo Time!' slide, run:"
echo "   ${YELLOW}./demo/scripts/demo-3min-presentation.sh${NC}"
echo "4. Continue with presentation after demo completes"
echo ""

echo -e "${GREEN}🚀 Ready for presentation! Opening slides...${NC}"

# Try to open the presentation
if command -v open &> /dev/null; then
    open presentations/3min-demo-presentation.html
elif command -v xdg-open &> /dev/null; then
    xdg-open presentations/3min-demo-presentation.html
else
    echo "Please manually open: demo/presentations/3min-demo-presentation.html"
fi

echo ""
echo -e "${YELLOW}💡 Presentation Tips:${NC}"
echo "• Slide 4: Execute the demo script during 'Live Demo Time!'"
echo "• Demo takes exactly 3 minutes with presenter controls"
echo "• All transactions are real and verifiable on Solana Explorer"
echo "• Demo artifacts will be saved to demo/archived-runs/"