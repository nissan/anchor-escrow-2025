# Phase 1: Foundation

## Overview
See [main plan](../docs/plan-ticketfair-with-switchboard-vrf.md) for context and full roadmap.

**Note:** Ticketing will use Metaplex Bubblegum v2. At event creation, cNFTs are minted for the ticket supply to a PDA holding authority. Asset IDs are tracked for on-chain supply enforcement. Awarding tickets transfers cNFTs from the PDA to winners. Unsold cNFTs are burned at auction close. PDA authority and Merkle Tree management will be planned and reviewed with advisors. See [Bubblegum v2 Docs](https://developers.metaplex.com/bubblegum-v2).

## Tasks
- [ ] Audit and refactor escrow contract for Ticketfair requirements
- [ ] Define and implement core accounts: Event, Ticket, User, Escrow
- [ ] Implement basic instructions: create event, buy ticket, claim refund
- [ ] Integrate Bubblegum v2: mint cNFTs at event creation to PDA, transfer to winners, burn unsold, track asset IDs
- [ ] Plan PDA authority and Merkle Tree management with advisors
- [ ] Document account structures and interactions

## Detailed TODOs
- [ ] Review and refactor escrow logic for Ticketfair
- [ ] Define Event, Ticket, User, Escrow account schemas
- [ ] Implement create_event, buy_ticket, claim_refund instructions
- [ ] Map out account interactions ([Accounts Interactions](../Ticketfair%20-%20Accounts%20Interactions.md))

## Notes
+## Testing Plan & Criteria
+
+We will write comprehensive tests for all core flows implemented in Phase 1. Criteria for passing tests:
+
+- **Event Creation:**
+  - Event is created with correct parameters (auction times, supply, Merkle Tree, PDA authority).
+  - Merkle Tree and cNFTs are initialized as expected.
+- **Bid Placement:**
+  - Bids can be placed at the current auction price.
+  - Bids at incorrect prices, before auction start, or after auction end are rejected.
+- **Ticket Awarding:**
+  - Organizer can award tickets to valid bids, transferring cNFTs from PDA to winner.
+  - Cannot award if not organizer, bid not pending, or tickets sold out.
+- **Refunds:**
+  - Losing bids can be fully refunded.
+  - Winning bids can be partially refunded if overbid.
+  - Already refunded or invalid status bids are rejected.
+- **Bubblegum cNFT Logic:**
+  - cNFTs are minted to PDA at event creation.
+  - cNFTs are transferred to winners on award.
+  - Unsold cNFTs are burned at auction close.
+
+All tests must pass for Phase 1 to be considered complete.

- Keep this file in sync with the main plan.
- Reference: [plan-ticketfair-with-switchboard-vrf.md](../docs/plan-ticketfair-with-switchboard-vrf.md) 