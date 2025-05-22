```mermaid
graph TD
  subgraph "User Interface - Frontend on Vercel"
    UI[Web App - React/Next.js]
    Wallet[Solana Wallet - Phantom, Backpack]
    Blink[Blinks & Actions]
  end

  subgraph "Off-chain Backend - Supabase"
    SBDB[(Supabase DB)]
    SupaAuth[Supabase Auth]
    SupaFuncs[Supabase Edge Functions]
  end

  subgraph "On-chain Programs - Solana"
    AuctionProgram[Solana Program: Dutch Auction]
    VRF[Switchboard VRF]
    NFTTicket[Ticket NFT Mint]
    SolPay[Solana Pay Payment Handler]
  end

  UI -->|Wallet Connect| Wallet
  UI -->|Bidding UI| AuctionProgram
  UI -->|Claim Ticket| NFTTicket
  UI -->|Track Status| SBDB

  Wallet -->|Trigger Solana Pay| SolPay
  SolPay -->|Payment Confirmed| AuctionProgram

  AuctionProgram -->|Request Randomness| VRF
  VRF -->|Returns VRF Proof| AuctionProgram

  AuctionProgram -->|Mint NFT| NFTTicket
  AuctionProgram -->|Log Metadata| SupaFuncs

  SupaFuncs --> SBDB
  SupaAuth --> UI
  Blink --> UI