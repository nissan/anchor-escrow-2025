```mermaid
flowchart LR
 subgraph subGraph0["Accounts & Data Stores"]
        A1["User Account<br>Owner: User<br>Data: User Info, Bid History<br>Type: Standard Account"]
        A2["Auction Account<br>Owner: Auction Program<br>Data: Auction Parameters, Status<br>Type: PDA"]
        A3["Bidding Account<br>Owner: Bidding Program<br>Data: Active Bids, Max Price<br>Type: PDA"]
        A4["VRF Result Account<br>Owner: VRF Program<br>Data: Randomness Results<br>Type: PDA"]
        A5["Ticket Account<br>Owner: Ticket Minting Program<br>Data: Ticket Metadata, Ownership<br>Type: Token Account"]
        A6["Identity Account<br>Owner: Identity Verification<br>Data: User Identity Info<br>Type: Standard Account"]
  end
    A1 --> A3
    A3 --> A2
    A4 --> A2
    A2 --> A5
    A5 --> A1
    A6 --> A3