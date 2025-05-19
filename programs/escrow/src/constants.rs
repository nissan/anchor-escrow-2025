// Constants for the TicketFair Dutch auction program

// Account status constants
pub const EVENT_STATUS_CREATED: u8 = 0;
pub const EVENT_STATUS_ACTIVE: u8 = 1;
pub const EVENT_STATUS_FINALIZED: u8 = 2;
pub const EVENT_STATUS_CANCELLED: u8 = 3;

pub const BID_STATUS_PENDING: u8 = 0;
pub const BID_STATUS_AWARDED: u8 = 1;
pub const BID_STATUS_REFUNDED: u8 = 2;

pub const TICKET_STATUS_OWNED: u8 = 0;
pub const TICKET_STATUS_CLAIMED: u8 = 1;
pub const TICKET_STATUS_REFUNDED: u8 = 2;

// Auction parameter constants
pub const MAX_METADATA_URL_LEN: usize = 200;
pub const MAX_TICKETS_PER_EVENT: u32 = 1000;
pub const MAX_TICKETS_TEST_MODE: u32 = 10; // Reduced for tests

// Time constants (in seconds)
pub const MIN_AUCTION_DURATION: i64 = 300; // 5 minutes
pub const MAX_AUCTION_DURATION: i64 = 2592000; // 30 days

// Price constants (in lamports)
pub const MIN_TICKET_PRICE: u64 = 1_000_000; // 0.001 SOL