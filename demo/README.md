# TicketFair Demo Suite

This directory contains everything needed to demonstrate and showcase the TicketFair platform. The demo suite is organized to be "demo-ready" at all times, with all necessary scripts, documentation, and examples in one place.

## 📁 Directory Structure

```
demo/
├── README.md                    # This file - demo overview
├── scripts/                    # Demo execution scripts
│   ├── demo-ticketfair-workflow.sh  # Complete workflow demo
│   ├── demo-presentation.sh         # Presentation mode demo
│   ├── demo-simple.sh              # Simple quick demo
│   ├── demo-minimal.sh             # Minimal feature demo
│   └── check-demo-deps.sh          # Verify demo prerequisites
├── examples/                   # Code examples and samples
│   ├── README.md               # Examples documentation
│   ├── create-event.ts         # Event creation example
│   ├── place-bid.ts           # Bid placement example
│   ├── award-and-finalize.ts  # Award and finalization
│   ├── demo-full-auction.ts   # Complete auction simulation
│   ├── place-bid-example.ts   # Interactive bid example
│   ├── minimal-event-demo.ts  # Minimal demo script
│   └── test-demo-basic.ts     # Basic demo testing
├── docs/                      # Demo-related documentation
│   ├── DEMO.md                # Comprehensive demo guide
│   ├── DEVNET-INTERACTION.md  # Devnet interaction guide
│   ├── presentation.md        # Marp presentation slides
│   ├── TickeFair - Capstone Letter of Intent (LOI)md
│   └── Ticketfair - *.md      # TicketFair architecture docs
├── presentations/             # Presentation materials
├── assets/                    # Demo assets (images, videos, etc.)
└── archived-runs/            # Historical demo execution logs
    ├── demo-20250522-153645/ # Timestamp-based demo runs
    └── demo-20250522-153733/
```

## 🚀 Quick Demo Commands

### 🎬 3-Minute Presentation Demo
```bash
# Setup and view presentation slides
npm run demo:present

# Execute live demo during presentation
npm run demo:3min
```

### Complete Workflow Demo
```bash
# Test environment first
./demo/scripts/demo-simple-test.sh

# Run full workflow demo
./demo/scripts/demo-ticketfair-workflow.sh
```

### Individual Component Demos
```bash
# Quick dependency check
./demo/scripts/check-demo-deps.sh

# Simple demo for quick testing
./demo/scripts/demo-simple.sh

# Minimal feature demonstration
./demo/scripts/demo-minimal.sh

# Original presentation mode
./demo/scripts/demo-presentation.sh
```

### Using npm Scripts (from project root)
```bash
# Full auction simulation
npm run demo:full-auction

# Create event with custom parameters
npm run demo:create-event -- --name "Concert" --tickets 100

# Place a bid on existing event
npm run demo:place-bid -- --event EVENT_ADDRESS

# Finalize auction and process awards/refunds
npm run demo:finalize -- --event EVENT_ADDRESS

# Get help with demo commands
npm run demo:help
```

## 🎯 Demo Scenarios

### 1. Quick 2-Minute Demo
Perfect for brief presentations or proof-of-concept:
```bash
npm run demo:full-auction -- --tickets 3 --duration 2 --bidders 5
```

### 2. Realistic 10-Minute Demo
Comprehensive demonstration with realistic parameters:
```bash
npm run demo:full-auction -- --name "Stadium Concert" --tickets 50 --duration 10 --bidders 20
```

### 3. Live Presentation Demo
Interactive demo with presentation timing:
```bash
./demo/scripts/demo-presentation.sh
```

## 📚 Documentation

### For Presenters
- **[DEMO.md](docs/DEMO.md)** - Complete demo execution guide
- **[presentation.md](docs/presentation.md)** - Marp presentation slides
- **[DEVNET-INTERACTION.md](docs/DEVNET-INTERACTION.md)** - Manual devnet interaction guide

### For Developers
- **[examples/README.md](examples/README.md)** - Code examples documentation
- **TicketFair Architecture docs** - Complete platform documentation

### For Stakeholders
- **Letter of Intent** - Project overview and goals
- **User Story documents** - Use cases and workflows

## 🎬 Demo Features

### What the Demo Shows
- ✅ **Real Blockchain Transactions** - All operations on Solana devnet
- ✅ **Dutch Auction Mechanics** - Linear price decline over time
- ✅ **Multiple Bidder Support** - Concurrent bidding scenarios
- ✅ **Winner Selection** - Fair and transparent winner determination
- ✅ **Automatic Refunds** - Partial and full refund processing
- ✅ **Complete Transparency** - All transactions viewable on Explorer

### Demo Outputs
- **Real-time Progress** - Colored terminal output with status updates
- **Explorer Links** - Direct links to all transactions
- **JSON Results** - Structured data for integration
- **Demo Logs** - Complete execution history in `archived-runs/`
- **Summary Reports** - Markdown summaries with key metrics

## 🔧 Prerequisites

Run the dependency checker to ensure your environment is demo-ready:
```bash
./demo/scripts/check-demo-deps.sh
```

### Required Tools
- Solana CLI (configured for devnet)
- Node.js and npm
- Anchor framework
- TicketFair program deployed on devnet

### Optional Tools
- Marp CLI for presentation generation
- Solana Explorer for transaction verification

## 🎪 Demo Customization

All demo scripts support customization via command-line parameters:

### Event Parameters
- `--name` - Event name
- `--tickets` - Number of tickets available
- `--start-price` - Starting auction price (SOL)
- `--end-price` - Ending auction price (SOL)
- `--duration` - Auction duration (minutes)

### Simulation Parameters
- `--bidders` - Number of simulated bidders
- `--bid-delay` - Seconds between bids
- `--max-awards` - Maximum tickets to award

### Example Customizations
```bash
# High-demand concert
npm run demo:full-auction -- --name "Taylor Swift" --tickets 2 --bidders 50 --start-price 5.0

# Corporate event
npm run demo:full-auction -- --name "Tech Conference" --tickets 100 --bidders 80 --duration 30

# Testing edge cases
npm run demo:full-auction -- --tickets 1 --bidders 10 --duration 1
```

## 📊 Success Criteria

A successful demo will show:
- ✅ All transactions confirmed on Solana devnet
- ✅ Dutch auction price calculations correct
- ✅ Winner selection logic working properly
- ✅ Refund amounts precisely calculated
- ✅ All Explorer links functional and verifiable
- ✅ Complete demo summary generated

## 🚀 Next Steps After Demo

1. **Review Results** - Check the generated summary in `archived-runs/`
2. **Verify on Explorer** - Confirm all transactions using provided links
3. **Discuss Implementation** - Use demo artifacts to explain technical details
4. **Provide Access** - Share repository for further exploration
5. **Plan Integration** - Discuss deployment and customization options

## 📞 Support

For demo issues or questions:
- Check the troubleshooting section in [DEMO.md](docs/DEMO.md)
- Review recent demo logs in `archived-runs/`
- Verify environment with `check-demo-deps.sh`
- Consult the main project documentation in `../development/docs/`

The demo suite is designed to be self-contained and reliable, providing a professional showcase of the TicketFair platform's capabilities.