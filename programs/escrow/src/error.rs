use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Custom error message")]
    CustomError,
    #[msg("Auction is not active.")]
    AuctionNotActive,
    #[msg("Auction has not started yet.")]
    AuctionNotStarted,
    #[msg("Auction has already ended.")]
    AuctionEnded,
    #[msg("Bid must be exactly equal to the current auction price.")]
    BidNotAtCurrentPrice,
}
