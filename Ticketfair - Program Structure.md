```mermaid
graph TD
  subgraph "TicketFair Programs"
    A[Auction Program] -->|Set Parameters| B[Bidding Program]
    B -->|Submit Bids| A
    A -->|Auction Ends| C[Switchboard VRF Program]
    C -->|Determine Clearing Price| A
    A -->|Finalize Auction| D[Ticket Minting Program]
    D -->|Mint Ticket| E[User Ticket Wallet]
    F[Identity Verification Program] -->|Verify User| B
    G[Solana Blinks Program] -->|User Interaction| B
  end

  style A fill:#f9f,stroke:#333,stroke-width:2px
  style B fill:#bbf,stroke:#333,stroke-width:2px
  style C fill:#fb6,stroke:#333,stroke-width:2px
  style D fill:#8f8,stroke:#333,stroke-width:2px
  style F fill:#f88,stroke:#333,stroke-width:2px
  style G fill:#ff0,stroke:#333,stroke-width:2px
  ```