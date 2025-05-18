# Phase 1 TODOs — Ticketfair Escrow Program Implementation (Dutch Auction)

This checklist provides explicit, actionable steps for modifying and extending the existing escrow contract to support Ticketfair's Dutch auction requirements. Each item should be checked off as it is completed.

---

## 1. **Programs & Modules**
- [x] Review the current escrow program structure and identify reusable modules.
- [x] Create/rename program modules for Ticketfair (e.g., `ticketfair_event`, `ticketfair_ticket`, `ticketfair_user`).
- [x] Ensure program entrypoints are documented and ready for new instructions.
- [x] Create new modules for Dutch auction logic (e.g., `ticketfair_bid`).

## 2. **Handlers (Instructions)**
- [x] Scaffold the following instruction handlers:
    - [x] `place_bid` (escrow funds at current auction price)
    - [x] `award_ticket` (organizer awards ticket to a bid)
    - [x] `refund_bid` (refund overbid or losing bid)
- [x] Ensure each handler validates accounts and enforces Dutch auction business logic.
- [x] Add/modify instruction context structs as needed.
- [x] Implement/refine refund logic and finalize all handler flows.
- [ ] Complete Bubblegum CPI minting loop and asset ID tracking in event creation handler (setup done, need dependency resolution).

## 3. **State (Accounts & Data Structures)**
- [x] Define/modify Anchor `#[account]` structs for:
    - [x] `Event` (with auction parameters, Merkle Tree, cNFT asset IDs)
    - [x] `Bid` (bidder, amount, status, bump)
    - [x] `Ticket` (awarded, claimed, refunded, off-chain ref, bump, cNFT asset ID)
    - [x] `User` (optional)
- [x] Add fields for future off-chain data references (e.g., Walrus blob URL or ID).
- [x] Document all fields and relationships in code comments.

## 4. **Constants**
- [ ] Review and update constants (e.g., min/max bid, auction timing, refund windows).
- [ ] Move magic numbers to a `constants.rs` file if not already present.
- [ ] Document all constants for clarity.

## 5. **Error Handling**
- [x] Review and update the error enum (e.g., `errors.rs`).
- [x] Add new error codes for Dutch auction logic (e.g., bid not at current price, auction closed, already awarded).
- [x] Ensure all handlers return meaningful errors.

## 6. **Testing**
- [x] Write basic unit tests for account operations and validation.
- [ ] Complete comprehensive unit tests for each instruction handler.
- [ ] Write TypeScript integration tests for auction lifecycle (create, bid, award, refund).
- [ ] Prepare scripts for deploying and testing on Solana devnet.

## 7. **Documentation & Diagrams**
- [x] Update inline Rust docs for all accounts, handlers, and modules.
- [x] Update or create architecture and workflow diagrams as needed.
- [x] Keep all plans and technical decisions up-to-date for advisor review.

## 8. **Metaplex Bubblegum v2 Integration**
- [x] Plan and document Bubblegum v2 integration for ticketing.
- [x] Implement PDA authority and Merkle Tree management helpers.
- [x] Design and scaffold CPI integration (structure complete, implementation ready)
- [ ] Complete dependency resolution and actual CPI integration:
    - [ ] At event creation, mint cNFTs for ticket supply to a PDA holding authority.
    - [ ] Store Merkle Tree address and cNFT asset IDs in event account for on-chain supply enforcement.
    - [ ] On awarding tickets, transfer cNFTs from the PDA to winners using `transferV2`.
    - [ ] At auction close, burn unsold cNFTs using `burnV2`.

---

**Next Steps (Updated May 18, 2025):**
- Write TypeScript integration tests for TicketFair functionality
- Test deployment on localnet to confirm all instructions work properly
- Resolve Bubblegum dependency issues (evaluate whether to defer to Phase 1.5)
- Complete comprehensive unit tests for all instruction handlers
- Generate and test TypeScript client

**Reference:** See [PHASE1-PLAN.md](./PHASE1-PLAN.md) for context and high-level goals. 