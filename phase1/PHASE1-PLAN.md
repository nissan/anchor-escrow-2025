# Phase 1: Foundation — Deep Dive & Execution Plan

## 1. Project Vision & Requirements (from LOI & User Stories)
- **Goal:** Build a decentralized, fair, and transparent ticketing system on Solana.
- **Key Requirements:**
  - Users can create events, buy tickets, and claim refunds.
  - All actions are on-chain, with clear account structures.
  - Escrow logic ensures funds are held and released fairly.
  - System is ready for future randomness integration (Switchboard VRF).
  - **Future Direction:** Minimize on-chain data for ticketing by storing detailed ticketing information off-chain using [Walrus storage blobs](https://docs.wal.app/usage/web-api.html), accessed via aggregator and publisher API endpoints. (Out of scope for Phase 1, but planned for later phases.)

## 2. Core Accounts & Data Structures
- **Accounts to Implement:**
  - **Event:** Stores event metadata, ticket supply, pricing, status.
  - **Ticket:** Represents ownership, status (sold, claimed, refunded). In future phases, detailed ticket data will be stored off-chain in Walrus blobs, with only a reference (URL or blob ID) stored on-chain.
  - **User:** (Optional) Tracks user activity, purchases.
  - **Escrow:** Holds SOL for ticket sales, manages payouts/refunds.
- **Reference:** See "Accounts Interactions" and "Program Structure" docs for diagrams and field lists.

## 3. Instruction Set
- **Instructions to Implement:**
  - `create_event`: Organizer creates a new event.
  - `buy_ticket`: User purchases a ticket, funds go to escrow.
  - `claim_refund`: User claims refund if event is canceled or not held.
  - (Optional for Phase 1) `finalize_event`: Organizer finalizes event, releases funds.
- **Reference:** "Simple Workflow" and "User Interaction" docs for flows.

## 4. Account Interactions & Workflow
- **Flow:**
  1. Organizer creates event (Event + Escrow accounts initialized).
  2. Users buy tickets (Ticket accounts created, SOL sent to Escrow).
  3. If event is canceled, users claim refunds.
  4. If event is held, funds released to organizer.
- **Reference:** "Accounts Interactions" and "Simple Workflow" docs.

## 5. External Integrations
- **For Phase 1:** No external integrations required, but design with future Switchboard VRF integration in mind (see "External Integrations" doc).
- **Future Integration:** Plan to use [Walrus storage](https://docs.wal.app/usage/web-api.html) for off-chain ticketing data, accessed via aggregator and publisher API endpoints. Only references (URLs/blob IDs) will be stored on-chain to minimize storage costs and maximize scalability. This is out of scope for Phase 1 but should be considered in account and instruction design.

## 6. Development Steps
- [ ] **Audit & Refactor Escrow Contract:** Ensure it matches Ticketfair requirements.
- [ ] **Define Account Schemas:** Use Anchor's `#[account]` macros for Event, Ticket, Escrow. Design schemas to allow for off-chain data references in future phases.
- [ ] **Implement Instructions:** Write handlers for `create_event`, `buy_ticket`, `claim_refund`.
- [ ] **Document Account Structures:** Inline Rust docs and update architecture diagrams.
- [ ] **Anchor Tests:** Write unit and integration tests for all instructions and account flows.

## 7. Testing Plan
- **Unit Tests:** For each instruction, test success and failure cases (e.g., double purchase, refund edge cases).
- **Integration Tests:** Simulate full event lifecycle (create, buy, refund, finalize).
- **Devnet Readiness:** Scripts to deploy and test on Solana devnet.

## 8. Documentation
- Keep `phase1/PHASE1.md` in sync with the main plan.
- Update architecture diagrams and workflow docs as you build.
- **Reference:** [Walrus Storage API Documentation](https://docs.wal.app/usage/web-api.html) for future off-chain data plans.

---

## Next Steps

1. **Refactor and implement the escrow contract and core accounts.**
2. **Write and run Anchor tests for all instructions.**
3. **Document everything in code and update diagrams.**
4. **Prepare scripts for devnet deployment and testing.** 