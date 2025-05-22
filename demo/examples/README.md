# TicketFair Demo Scripts

This directory contains comprehensive demo scripts that demonstrate the complete TicketFair auction lifecycle, from event creation through bidding to finalization and refunds.

## 🚀 Quick Start - Full Demo

Run the complete auction demonstration:

```bash
npm run demo:full-auction
```

This will simulate an entire auction with default parameters:
- Create a "Demo Concert" with 5 tickets
- Price starts at 1.0 SOL, drops to 0.2 SOL over 5 minutes
- Simulate 8 bidders placing bids every 10 seconds
- Automatically finalize the auction and award tickets

## 📋 Individual Demo Scripts

### 1. Create Event (`create-event.ts`)

Creates a new TicketFair event with Dutch auction parameters.

```bash
# Basic usage with defaults
npm run demo:create-event

# Custom parameters
npm run demo:create-event -- --name "Concert" --tickets 100 --start-price 2.0 --end-price 0.5 --duration 60
```

**Parameters:**
- `--name`: Event name (default: "Demo Event")
- `--tickets`: Number of tickets available (default: 10)
- `--start-price`: Starting auction price in SOL (default: 1.0)
- `--end-price`: Ending auction price in SOL (default: 0.1)
- `--duration`: Auction duration in minutes (default: 30)

**Output:** Returns event address, timing details, and price information in JSON format.

### 2. Place Bid (`place-bid.ts`)

Places a bid on an existing event at the current auction price.

```bash
# Place bid at current price
npm run demo:place-bid -- --event EVENT_ADDRESS

# Place bid with custom amount and bidder name
npm run demo:place-bid -- --event EVENT_ADDRESS --bidder-name "Alice" --amount 0.75
```

**Parameters:**
- `--event`: Event address (required)
- `--bidder-name`: Display name for bidder (default: "Anonymous Bidder")
- `--amount`: Custom bid amount in SOL (optional, overrides current price)

**Features:**
- Validates auction timing (checks if auction has started/ended)
- Calculates current Dutch auction price automatically
- Provides detailed feedback on bid status
- Returns bid details in JSON format

### 3. Award and Finalize (`award-and-finalize.ts`)

Finalizes an auction by setting the close price, awarding tickets to winners, and processing refunds.

```bash
# Finalize with current auction price
npm run demo:finalize -- --event EVENT_ADDRESS

# Finalize with custom close price and ticket limit
npm run demo:finalize -- --event EVENT_ADDRESS --close-price 0.3 --max-awards 5
```

**Parameters:**
- `--event`: Event address (required)
- `--close-price`: Final auction price in SOL (optional, uses current price if not specified)
- `--max-awards`: Maximum tickets to award (optional, awards all available by default)

**Process:**
1. Sets the auction close price
2. Identifies winning bids (at or above close price)
3. Awards tickets to winners in bid amount order (highest first)
4. Processes refunds for unsuccessful bids
5. Handles partial refunds for winners (refunds amount paid above close price)

### 4. Full Auction Demo (`demo-full-auction.ts`)

Orchestrates a complete auction lifecycle with timing simulation.

```bash
# Run with defaults
npm run demo:full-auction

# Custom simulation parameters
npm run demo:full-auction -- --name "Rock Concert" --tickets 10 --start-price 2.0 --end-price 0.5 --duration 3 --bidders 12 --bid-delay 5
```

**Parameters:**
- `--name`: Event name (default: "Demo Concert")
- `--tickets`: Ticket supply (default: 5)
- `--start-price`: Starting price in SOL (default: 1.0)
- `--end-price`: Ending price in SOL (default: 0.2)
- `--duration`: Auction duration in minutes (default: 5)
- `--bidders`: Number of simulated bidders (default: 8)
- `--bid-delay`: Seconds between bids (default: 10)

**Demo Flow:**
1. **Phase 1**: Creates event with specified parameters
2. **Phase 2**: Simulates bidding activity with multiple bidders over time
3. **Phase 3**: Finalizes auction and processes awards/refunds
4. **Summary**: Provides complete audit trail and results

## 🎯 Example Use Cases

### Small Event Demo (Fast)
```bash
npm run demo:full-auction -- --tickets 3 --duration 2 --bidders 5 --bid-delay 5
```

### Large Event Demo (Realistic)
```bash
npm run demo:full-auction -- --name "Stadium Concert" --tickets 50 --start-price 5.0 --end-price 1.0 --duration 10 --bidders 20 --bid-delay 15
```

### Test Edge Cases
```bash
# More bidders than tickets
npm run demo:full-auction -- --tickets 2 --bidders 10

# High competition scenario
npm run demo:full-auction -- --start-price 0.5 --end-price 0.1 --bidders 15
```

## 📊 Output Format

All scripts output structured JSON for easy parsing and integration:

```json
{
  "success": true,
  "eventAddress": "ABC123...",
  "bidAddress": "DEF456...",
  "transactionId": "GHI789...",
  "bidAmount": 0.75,
  "currentTime": 1678901234,
  "timeRemaining": 300
}
```

## 🔧 Technical Details

### Dutch Auction Mechanics
- Price decreases linearly from start price to end price over auction duration
- Bidders must bid at exact current price (no overbidding)
- First-come-first-served for bids at same price point
- Close price determined at auction end or by organizer

### Escrow System
- Bid funds are escrowed in event PDA until finalization
- Winners pay close price, receive refund for any overpayment
- Losers receive full refund of their bid amount
- All refunds processed automatically during finalization

### Error Handling
- Scripts validate auction timing before placing bids
- Comprehensive error reporting with specific failure reasons
- Graceful handling of network issues and transaction failures
- JSON output format for programmatic error handling

## 🛠 Development Notes

### Prerequisites
- Solana CLI configured for target network (devnet/localnet)
- Anchor framework installed
- Node.js and npm/yarn available
- TicketFair program deployed and client generated

### Testing Approach
- Scripts use temporary wallets with airdropped SOL
- All operations are isolated and don't affect existing data
- Comprehensive logging for debugging and verification
- Results can be verified on-chain using Solana explorers

### Integration
Scripts are designed to be:
- **Modular**: Each script handles one specific operation
- **Composable**: Can be combined to create custom workflows
- **Scriptable**: JSON output enables automation and testing
- **Educational**: Clear logging shows each step of the process

## 📚 Learning Path

1. **Start with individual scripts** to understand each operation
2. **Run the full demo** to see the complete auction lifecycle
3. **Experiment with parameters** to understand auction dynamics
4. **Study the code** to learn integration patterns
5. **Build custom workflows** using the modular scripts

## 🎪 Demo Scenarios

The scripts support various demonstration scenarios:

- **Quick Demo**: 2-minute auction with 3 tickets and 5 bidders
- **Realistic Simulation**: 10-minute auction simulating real event
- **Stress Test**: High bidder volume with limited ticket supply
- **Edge Cases**: Testing auction timing and price boundaries

Run `npm run demo:help` for quick reference of all commands and parameters.

## TicketFair API Reference

The demo scripts use the TicketFair API, which provides high-level functions for interacting with the TicketFair platform:

```typescript
import { 
  createAndActivateEvent,
  placeBid,
  awardTicket,
  refundBid,
  finalizeAuction,
  calculateCurrentPrice,
  EVENT_STATUS,
  BID_STATUS
} from "../src/ticketfair-api";
```

### Key Functions

1. **`createAndActivateEvent`**: Creates and activates a new TicketFair event with Dutch auction
2. **`placeBid`**: Places a bid at the current auction price
3. **`awardTicket`**: Awards a ticket to a winning bidder
4. **`refundBid`**: Processes refunds for bids
5. **`finalizeAuction`**: Finalizes an auction with a closing price
6. **`calculateCurrentPrice`**: Helper to calculate the current Dutch auction price

## Running Examples

To run the examples:

1. Build the project first:
   ```
   npm run build
   ```

2. Generate the TypeScript client:
   ```
   npm run generate-client
   ```

3. Run any demo script:
   ```
   npm run demo:help
   ```

## Notes

- The examples are designed for demonstration and testing
- Always test on devnet before using in production
- Scripts automatically create and fund wallets for testing
- All operations are logged for transparency and debugging