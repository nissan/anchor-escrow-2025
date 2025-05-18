# Phase 1 TODOs — Ticketfair Escrow Program Implementation

This checklist provides explicit, actionable steps for modifying and extending the existing escrow contract to support Ticketfair's requirements. Each item should be checked off as it is completed.

---

## 1. **Programs & Modules**
- [ ] Review the current escrow program structure and identify reusable modules.
- [ ] Create/rename program modules for Ticketfair (e.g., `ticketfair_event`, `ticketfair_ticket`, `ticketfair_user`).
- [ ] Ensure program entrypoints are documented and ready for new instructions.

## 2. **Handlers (Instructions)**
- [ ] Refactor or implement the following instruction handlers:
    - [ ] `create_event`
    - [ ] `buy_ticket`
    - [ ] `claim_refund`
    - [ ] (Optional) `finalize_event`
- [ ] Ensure each handler validates accounts and enforces business logic.
- [ ] Add/modify instruction context structs as needed.

## 3. **State (Accounts & Data Structures)**
- [ ] Define/modify Anchor `#[account]` structs for:
    - [ ] `Event`
    - [ ] `Ticket`
    - [ ] `User` (optional)
    - [ ] `Escrow`
- [ ] Add fields for future off-chain data references (e.g., Walrus blob URL or ID).
- [ ] Document all fields and relationships in code comments.

## 4. **Constants**
- [ ] Review and update constants (e.g., max ticket supply, price limits, refund windows).
- [ ] Move magic numbers to a `constants.rs` file if not already present.
- [ ] Document all constants for clarity.

## 5. **Error Handling**
- [ ] Review and update the error enum (e.g., `errors.rs`).
- [ ] Add new error codes for Ticketfair-specific logic (e.g., event not found, ticket sold out, refund not allowed).
- [ ] Ensure all handlers return meaningful errors.

## 6. **Testing**
- [ ] Write unit tests for each instruction handler.
- [ ] Write integration tests for event/ticket lifecycle.
- [ ] Prepare scripts for deploying and testing on Solana devnet.

## 7. **Documentation & Diagrams**
- [ ] Update inline Rust docs for all accounts, handlers, and modules.
- [ ] Update or create architecture and workflow diagrams as needed.

---

**Reference:** See [PHASE1-PLAN.md](./PHASE1-PLAN.md) for context and high-level goals. 