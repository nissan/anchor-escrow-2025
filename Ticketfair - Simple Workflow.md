```mermaid
graph TD
    A[Event Organizer Sets Auction Parameters] --> B[Start Dutch Auction]
    B --> C[Users Place Bids]
    C --> D[Auction Ends]
    D --> E[VRF Determines Clearing Price]
    E --> F[Filter Winners: Bids >= Clearing Price]
    F --> G{Too Many Winners?}
    G -- No --> H[All Winners Mint Tickets at Clearing Price]
    G -- Yes --> I[Sort High to Low Bids]
    I --> J[Top Winners Assigned Until Tie Group]
    J --> K[VRF Selects Random Winners From Tie Group]
    K --> L[All Selected Winners Mint Tickets at Clearing Price]
    H --> M[Refund Excess Bid to High Bidders]
    L --> M
    M --> N[Event Ends]
    N --> O[Unsold Tickets?]
    O -- Yes --> P[New Auction Starts with New Floor Price]
    O -- No --> Q[Close Event]
    