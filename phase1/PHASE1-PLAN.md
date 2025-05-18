# Phase 1: Foundation — Deep Dive & Execution Plan (Dutch Auction Model)

## 1. Project Vision & Requirements (from LOI & User Stories)
- **Goal:** Build a decentralized, fair, and transparent ticketing system on Solana using a Dutch auction for ticket sales.
- **Key Requirements:**
  - Users can place bids (escrow funds) for tickets at the current auction price.
  - Organizers can award tickets to the highest (or earliest valid) bidders.
  - Refunds are processed for any overbid amount or for losing bids.
  - All actions are on-chain, with clear account structures.
  - Escrow logic ensures funds are held and released fairly.
  - System is ready for future randomness integration (Switchboard VRF).
  - **Future Direction:** Minimize on-chain data for ticketing by storing detailed ticketing information off-chain using [Walrus storage blobs](https://docs.wal.app/usage/web-api.html), accessed via aggregator and publisher API endpoints. (Out of scope for Phase 1, but planned for later phases.)

## 2. Core Accounts & Data Structures
- **Accounts to Implement:**
  - **Event:** Stores event metadata, auction parameters, ticket supply, pricing, status.
  - **Bid:** Represents a user's bid, amount, status (pending, awarded, refunded).
  - **Ticket:** Represents ownership, status (awarded, claimed, refunded), off-chain reference.
  - **User:** (Optional) Tracks user activity, purchases.
  - **Escrow:** Holds SOL for bids, manages payouts/refunds.
- **Reference:** See TODO-ANALYSIS for reusable patterns and new logic needs.

## 3. Instruction Set
- **Instructions to Implement:**
  - `place_bid`: User places a bid at the current auction price (escrow funds).
  - `award_ticket`: Organizer awards a ticket to a valid bid, transferring funds and issuing a ticket.
  - `refund_bid`: Refunds any overbid amount or full bid for losing bids.
- **Reference:** See TODO-ANALYSIS for handler structure and account constraints.

## 4. Account Interactions & Workflow
- **Flow:**
  1. Organizer creates event (Event + Escrow accounts initialized, auction parameters set).
  2. Users place bids (Bid accounts created, SOL sent to Escrow).
  3. Organizer awards tickets (Ticket accounts created, funds transferred, overbids refunded).
  4. Losing bids are refunded in full.
- **Reference:** See TODO-ANALYSIS for modular handler and state patterns.

## 5. External Integrations
- **For Phase 1:** No external integrations required, but design with future Switchboard VRF integration in mind (see "External Integrations" doc).
- **Future Integration:** Plan to use [Walrus storage](https://docs.wal.app/usage/web-api.html) for off-chain ticketing data, accessed via aggregator and publisher API endpoints. Only references (URLs/blob IDs) will be stored on-chain to minimize storage costs and maximize scalability. This is out of scope for Phase 1 but should be considered in account and instruction design.

## 6. Development Steps
- [ ] **Audit & Refactor Escrow Contract:** Ensure it matches Dutch auction requirements.
- [ ] **Define Account Schemas:** Use Anchor's `#[account]` macros for Event, Bid, Ticket, Escrow. Design schemas to allow for off-chain data references in future phases.
- [ ] **Implement Instructions:** Write handlers for `place_bid`, `award_ticket`, `refund_bid`.
- [ ] **Document Account Structures:** Inline Rust docs and update architecture diagrams.
- [ ] **Anchor Tests:** Write unit and integration tests for all instructions and account flows.

## 7. Testing Plan
- **Unit Tests:** For each instruction, test success and failure cases (e.g., overbid, double award, refund edge cases).
- **Integration Tests:** Simulate full auction lifecycle (create, bid, award, refund).
- **Devnet Readiness:** Scripts to deploy and test on Solana devnet.

## 8. Documentation
- Keep `phase1/PHASE1.md` in sync with the main plan.
- Update architecture diagrams and workflow docs as you build.
- **Reference:** [Walrus Storage API Documentation](https://docs.wal.app/usage/web-api.html) for future off-chain data plans.

### Ticket Minting with Metaplex Bubblegum v2
- At event creation, mint the full supply of cNFTs (tickets) using Bubblegum v2.
- The event account stores the Merkle Tree address and cNFT asset IDs.
- Awarding tickets transfers cNFTs to winners using Bubblegum's `transferV2`.
- Unsold cNFTs are burned at auction close using `burnV2`.
- Reference: [Bubblegum v2 Docs](https://developers.metaplex.com/bubblegum-v2)

### PDA Authority and Merkle Tree Management for Bubblegum v2
- The event PDA (derived from [b"event", organizer_pubkey]) is the authority for minting, holding, transferring, and burning cNFTs.
- Each event uses its own Merkle Tree for supply enforcement.
- The event PDA is set as the tree delegate/authority.
- At event creation, the event PDA mints the full supply of cNFTs to itself, storing asset IDs in the event account.
- Awarding tickets transfers cNFTs from the PDA to winners.
- Unsold cNFTs are burned at auction close.
- This ensures on-chain, verifiable ticket supply and secure authority management.
- Reference: [Bubblegum v2 Docs](https://developers.metaplex.com/bubblegum-v2)

---

## Next Steps

1. **Refactor and implement the escrow contract and core accounts for Dutch auction.**
2. **Write and run Anchor tests for all instructions.**
3. **Document everything in code and update diagrams.**
4. **Prepare scripts for devnet deployment and testing.** 