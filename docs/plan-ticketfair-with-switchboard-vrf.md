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

### Dutch Auction Ticketing with Metaplex Bubblegum v2 (Updated)
- At event creation, a Bubblegum Merkle Tree is created (if needed) and the full supply of compressed NFTs (cNFTs) representing tickets is minted using Bubblegum v2's `mintV2` instruction, with the event PDA as the holding authority.
- The event account stores the Merkle Tree address and cNFT asset IDs for tracking and on-chain supply enforcement.
- During the auction, users place bids and escrow funds as before.
- When awarding tickets, cNFTs are transferred from the PDA to winners using Bubblegum's `transferV2` instruction.
- At auction close, any unsold cNFTs are burned using `burnV2`, enforcing the edition's rarity and supply cap.
- PDA authority and Merkle Tree management will be planned and reviewed with advisors.
- See: [Bubblegum v2 Docs](https://developers.metaplex.com/bubblegum-v2)

### PDA Authority and Merkle Tree Management for Bubblegum v2
- The event PDA (derived from [b"event", organizer_pubkey]) acts as the on-chain authority for minting, holding, transferring, and burning cNFTs (tickets).
- Each event uses its own Merkle Tree for clear supply enforcement and separation.
- The event PDA is set as the tree delegate/authority when the Merkle Tree is created (off-chain or via a separate instruction).
- At event creation, the event PDA mints the full supply of cNFTs to itself using Bubblegum's `mintV2` CPI, storing asset IDs in the event account.
- When awarding tickets, the event PDA transfers cNFTs to winners using `transferV2`.
- At auction close, the event PDA burns unsold cNFTs using `burnV2`.
- This approach ensures on-chain, verifiable ticket supply and secure authority management.
- Reference: [Bubblegum v2 Docs](https://developers.metaplex.com/bubblegum-v2)

#### Summary Table
| Step                | Authority/PDA         | Merkle Tree Management         | Notes                                  |
|---------------------|----------------------|-------------------------------|----------------------------------------|
| Event Creation      | Event PDA            | One tree per event            | PDA is tree delegate                   |
| Mint cNFTs (tickets)| Event PDA            | Use event's Merkle Tree       | Store asset IDs in event account       |
| Award/Transfer      | Event PDA            | Use event's Merkle Tree       | Transfer cNFTs from PDA to winners     |
| Burn Unsold         | Event PDA            | Use event's Merkle Tree       | Burn cNFTs from PDA at auction close   |

### Phase 2: Randomness Integration
- [ ] Integrate Switchboard VRF (add `switchboard-on-demand`)
- [ ] Randomness-Driven Auction End:
    - At each price update (or at specified intervals), the program can request randomness from Switchboard VRF to decide whether to end the auction early.
    - The randomness account and slot are stored in the Event account for traceability.
    - When randomness is revealed, the program uses the value (e.g., random % 2 == 0) to determine if the auction should end.
    - This mechanism can be used to introduce unpredictability or to break ties in a fair, verifiable way.
- [ ] Random Winner Selection (if tickets > valid bids):
    - If the number of tickets exceeds the number of valid bids above the closing price, the program requests randomness from Switchboard VRF to select winners from the eligible bidders.
    - The randomness result is used to shuffle or select N winners from the list of eligible bids, ensuring a fair and transparent selection process.
    - The randomness account and slot are stored in the Event account for auditability.
- [ ] Handlers and Accounts:
    - New instructions will be added for requesting and settling randomness for both auction end and winner selection.
    - The Event account will be updated to track the randomness account and slot for each randomness request.
    - A new AuctionRandomness account may be introduced to store randomness request metadata and results.

#### Summary Table (Randomness Integration)

| Use Case                | When Triggered                | Randomness Source         | Outcome/Action                                 |
|-------------------------|-------------------------------|--------------------------|------------------------------------------------|
| Auction End Decision    | On price update/interval      | Switchboard VRF          | May end auction early based on random value    |
| Winner Selection        | At auction close (if needed)  | Switchboard VRF          | Selects N winners from eligible bids           |

### Phase 6: Optimizations (Future)
- Implement robust asset ID tracking for Bubblegum cNFTs:
    - After event creation, parse transaction logs off-chain to extract cNFT asset IDs.
    - Add an on-chain instruction (e.g., `set_asset_ids`) to update the event account with real asset IDs.
    - Optionally, explore on-chain derivation of asset IDs if Bubblegum v2 supports it in the future.
- This phase is deferred for future optimization to keep Phase 1 scope focused.