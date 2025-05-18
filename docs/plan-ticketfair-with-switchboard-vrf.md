# Ticketfair Solana Program & Switchboard VRF Integration Plan

## Context
- This project is based on a working escrow contract template using Solana and Anchor.
- The goal is to build out the Ticketfair Solana programs, leveraging Switchboard's VRF (Verifiable Random Function) for randomness features.
- Reference: [Switchboard Solana SVM VRF Tutorial](https://docs.switchboard.xyz/product-documentation/randomness/tutorials/solana-svm)
- See also:
  - [Ticketfair - User Story [Draft].md](../Ticketfair%20-%20User%20Story%20[Draft].md)
  - [Ticketfair - User Interaction.md](../Ticketfair%20-%20User%20Interaction.md)
  - [Ticketfair - Simple Workflow.md](../Ticketfair%20-%20Simple%20Workflow.md)
  - [Ticketfair - Architecture Document.md](../Ticketfair%20-%20Architecture%20Document.md)
  - [Ticketfair - Program Structure.md](../Ticketfair%20-%20Program%20Structure.md)
  - [Ticketfair - Solana Architecture.md](../Ticketfair%20-%20Solana%20Architecture.md)
  - [Ticketfair - Accounts Interactions.md](../Ticketfair%20-%20Accounts%20Interactions.md)
  - [TickeFair - Capstone Letter of Intent (LOI)md](../TickeFair%20-%20Capstone%20Letter%20of%20Intent%20(LOI)md)

---

## Phases & Deliverables

### Phase 1: Foundation
- [ ] Audit and refactor escrow contract for Ticketfair requirements
- [ ] Define and implement core accounts: Event, Ticket, User, Escrow
- [ ] Implement basic instructions: create event, buy ticket, claim refund
- [ ] Document account structures and interactions

### Phase 2: Randomness Integration
- [ ] Integrate Switchboard VRF (add `switchboard-on-demand` to Rust/JS)
- [ ] Implement Randomness account and winner selection logic
- [ ] Add commit/reveal or anti-sybil logic as needed
- [ ] Expose randomness-based instructions (e.g., draw winner)
- [ ] Write TypeScript client code for VRF flows

### Phase 3: Advanced Features
- [ ] Multi-winner support, event finalization, edge-case handling
- [ ] Permissioning, admin controls, and event cancellation
- [ ] Additional features as identified in Ticketfair docs

### Phase 4: Testing & Simulation
- [ ] Write unit tests for all instructions and account logic
- [ ] Write integration tests for full event/ticket lifecycle
- [ ] Simulate randomness flows using Switchboard devnet
- [ ] Document test cases and expected outcomes

### Phase 5: Documentation & Examples
- [ ] Update architecture and workflow docs as features are built
- [ ] Add code comments and usage examples
- [ ] Maintain this plan as a living document

---

## Detailed TODOs (by Phase)

- **Foundation:**
  - [ ] Review and refactor escrow logic for Ticketfair
  - [ ] Define Event, Ticket, User, Escrow account schemas
  - [ ] Implement create_event, buy_ticket, claim_refund instructions
  - [ ] Map out account interactions ([Accounts Interactions](../Ticketfair%20-%20Accounts%20Interactions.md))
- **Randomness Integration:**
  - [ ] Integrate Switchboard VRF per [tutorial](https://docs.switchboard.xyz/product-documentation/randomness/tutorials/solana-svm)
  - [ ] Implement randomness account and winner selection
  - [ ] Add commit/reveal or anti-sybil logic if required
  - [ ] Expose draw_winner instruction
  - [ ] Write TypeScript client for VRF
- **Advanced Features:**
  - [ ] Multi-winner, event finalization, admin controls
  - [ ] Edge-case and error handling
- **Testing & Simulation:**
  - [ ] Unit tests for each instruction
  - [ ] Integration tests for event/ticket lifecycle
  - [ ] Simulate VRF flows on devnet
  - [ ] Document all test cases
- **Documentation:**
  - [ ] Update all relevant docs as features are built
  - [ ] Add code comments and usage examples

---

## Testing Plan

- **Unit Tests:**
  - Each instruction (create_event, buy_ticket, claim_refund, draw_winner, etc.)
  - Account initialization and validation
  - Error and edge-case handling
- **Integration Tests:**
  - Full event lifecycle: event creation → ticket sales → winner draw → payout/refund
  - Randomness integration: simulate VRF requests and responses
  - Permissioning and admin flows
- **Simulation:**
  - Use Switchboard devnet for VRF testing
  - Document expected outcomes for all randomness-based flows
- **Test Documentation:**
  - Maintain a list of test cases and outcomes in `/tests/` or `/docs/`
  - Reference test plans in this document

---

## Implementation Notes
- Follow Anchor best practices for Solana program development
- Use Switchboard's example code for VRF integration ([see tutorial](https://docs.switchboard.xyz/product-documentation/randomness/tutorials/solana-svm))
- Ensure all new instructions are covered by tests
- Reference Ticketfair docs for requirements and flows

---

## Contributors
- Please add notes, questions, and progress updates to this document as you work. 