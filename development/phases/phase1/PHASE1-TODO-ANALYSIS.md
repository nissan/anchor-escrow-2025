# Review of Current Escrow Program Structure & Reusable Modules

## Escrow Program Structure Overview

### Main Program Entrypoint
- **Location:** `programs/escrow/src/lib.rs`
- **Entrypoint Functions:**
  - `make_offer`
  - `take_offer`
  - `refund_offer`
- These call into handler modules for business logic.

### Handlers
- **Location:** `programs/escrow/src/handlers/`
- **Files:**
  - `make_offer.rs` — logic for creating an offer (escrow).
  - `take_offer.rs` — logic for accepting an offer.
  - `refund.rs` — logic for refunding an offer.
  - `shared.rs` — reusable token transfer and account closing logic.
  - `mod.rs` — re-exports all handlers.
- **Reusable Module:**
  - `shared.rs` provides `transfer_tokens` and `close_token_account` functions, which are generic and can be reused for Ticketfair's token movement and account management.

### State (Accounts)
- **Location:** `programs/escrow/src/state/`
- **Files:**
  - `offer.rs` — defines the `Offer` account struct.
  - `mod.rs` — re-exports state modules.
- **Reusable Pattern:**
  - The use of Anchor's `#[account]` macro and the separation of state into its own module is a good pattern for Ticketfair's new accounts (Event, Ticket, User, Escrow).

### Constants
- **Location:** `programs/escrow/src/constants.rs`
- **Note:**
  - Currently empty, but the structure is in place for storing program-wide constants.

### Error Handling
- **Location:** `programs/escrow/src/error.rs`
- **Pattern:**
  - Uses Anchor's `#[error_code]` enum for custom errors. This is reusable for Ticketfair-specific errors.

### Testing
- **Location:**
  - TypeScript tests in `tests/escrow.test.ts` and helpers in `tests/escrow.test-helpers.ts`.
- **Pattern:**
  - Uses helper functions and integration tests for offer lifecycle, which can be adapted for Ticketfair's event/ticket lifecycle.

---

## Reusable Modules & Patterns for Ticketfair

- **Token Transfer & Account Management:**
  - `shared.rs` functions (`transfer_tokens`, `close_token_account`) are generic and can be reused for Ticketfair's token flows.
- **Handler Structure:**
  - The separation of each instruction into its own handler file is clean and maintainable.
- **Account Definition:**
  - The use of Anchor's `#[account]` macro and modular state files is a best practice.
- **Error Handling:**
  - The error pattern is extensible for new business logic.
- **Constants File:**
  - Ready to be populated for Ticketfair-specific values.

---

## Summary Table

| Area         | File/Module                | Reusable? | Notes                                                      |
|--------------|----------------------------|-----------|------------------------------------------------------------|
| Entrypoint   | `lib.rs`                   | Yes       | Add new instructions for Ticketfair                        |
| Handlers     | `handlers/`                | Yes       | Add new files for event/ticket logic, reuse `shared.rs`    |
| State        | `state/`                   | Yes       | Add new account structs for Event, Ticket, User, Escrow    |
| Constants    | `constants.rs`             | Yes       | Populate with Ticketfair constants                         |
| Errors       | `error.rs`                 | Yes       | Extend with Ticketfair-specific errors                     |
| Tests        | `tests/`                   | Yes       | Adapt helpers and tests for new flows                      |

---

## Progress & Next Steps

- Dutch auction modules, state, and handlers are scaffolded and partially implemented.
- Bubblegum v2 integration is planned, documented, and helpers for PDA derivation and authority checks are implemented.
- Event, Bid, and Ticket accounts are updated for cNFT asset tracking and Merkle Tree management.
- Documentation is up-to-date for advisor review.
- **Next Steps:**
  - Complete Bubblegum CPI minting loop and asset ID tracking in event creation handler.
  - Implement/refine refund logic and finalize all handler flows.
  - Begin writing and running unit/integration tests.
  - Continue updating documentation as implementation progresses.

### Updated Bubblegum v2 Integration for Ticketing
- At event creation, mint the full supply of cNFTs (tickets) using Bubblegum v2 to a PDA holding authority.
- Event account stores Merkle Tree and cNFT asset IDs for on-chain supply enforcement.
- Awarding tickets transfers cNFTs from the PDA to winners.
- Unsold cNFTs are burned at auction close.
- PDA authority and Merkle Tree management will be planned and reviewed with advisors.
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