# Phase 1 TODOs — Ticketfair Escrow Program Implementation (Dutch Auction)

This checklist provides explicit, actionable steps for modifying and extending the existing escrow contract to support Ticketfair's Dutch auction requirements. Each item should be checked off as it is completed.

---

## 1. **Programs & Modules**
- [x] Review the current escrow program structure and identify reusable modules.
- [x] Create/rename program modules for Ticketfair (e.g., `ticketfair_event`, `ticketfair_ticket`, `ticketfair_user`).
- [x] Ensure program entrypoints are documented and ready for new instructions.
- [ ] Create new modules for Dutch auction logic (e.g., `ticketfair_bid`).

## 2. **Handlers (Instructions)**
- [ ] Implement the following instruction handlers:
    - [ ] `place_bid` (escrow funds at current auction price)
    - [ ] `award_ticket` (organizer awards ticket to a bid)
    - [ ] `refund_bid` (refund overbid or losing bid)
- [ ] Ensure each handler validates accounts and enforces Dutch auction business logic.
- [ ] Add/modify instruction context structs as needed.

## 3. **State (Accounts & Data Structures)**
- [ ] Define/modify Anchor `#[account]` structs for:
    - [ ] `Event` (with auction parameters)
    - [ ] `Bid` (bidder, amount, status, bump)
    - [ ] `Ticket` (awarded, claimed, refunded, off-chain ref, bump)
    - [ ] `User` (optional)
    - [ ] `Escrow` (if needed for holding funds)
- [ ] Add fields for future off-chain data references (e.g., Walrus blob URL or ID).
- [ ] Document all fields and relationships in code comments.

## 4. **Constants**
- [ ] Review and update constants (e.g., min/max bid, auction timing, refund windows).
- [ ] Move magic numbers to a `constants.rs` file if not already present.
- [ ] Document all constants for clarity.

## 5. **Error Handling**
- [ ] Review and update the error enum (e.g., `errors.rs`).
- [ ] Add new error codes for Dutch auction logic (e.g., bid too low, auction closed, already awarded).
- [ ] Ensure all handlers return meaningful errors.

## 6. **Testing**
- [ ] Write unit tests for each instruction handler.
- [ ] Write integration tests for auction lifecycle (create, bid, award, refund).
- [ ] Prepare scripts for deploying and testing on Solana devnet.

## 7. **Documentation & Diagrams**
- [ ] Update inline Rust docs for all accounts, handlers, and modules.
- [ ] Update or create architecture and workflow diagrams as needed.

## 8. **Metaplex Bubblegum v2 Integration**
- [ ] Integrate Metaplex Bubblegum v2 for ticketing:
    - [ ] At event creation, create Merkle Tree (if needed) and mint cNFTs for ticket supply to a PDA holding authority.
    - [ ] Store Merkle Tree address and cNFT asset IDs in event account for on-chain supply enforcement.
    - [ ] On awarding tickets, transfer cNFTs from the PDA to winners using `transferV2`.
    - [ ] At auction close, burn unsold cNFTs using `burnV2`.
    - [ ] Plan PDA authority and Merkle Tree management with advisors.
    - [ ] Reference: [Bubblegum v2 Docs](https://developers.metaplex.com/bubblegum-v2)

---

**Reference:** See [PHASE1-PLAN.md](./PHASE1-PLAN.md) for context and high-level goals. 