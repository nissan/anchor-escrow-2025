# Phase 2: Randomness Integration

## Overview
See [main plan](../docs/plan-ticketfair-with-switchboard-vrf.md) for context and full roadmap.

## Tasks
- [ ] Integrate Switchboard VRF (add `switchboard-on-demand` to Rust/JS)
- [ ] Implement Randomness account and winner selection logic
- [ ] Add commit/reveal or anti-sybil logic as needed
- [ ] Expose randomness-based instructions (e.g., draw winner, auction end decision)
- [ ] Write TypeScript client code for VRF flows
- [ ] Implement handlers for randomness-driven auction end and random winner selection
- [ ] Update Event account to track randomness requests and results
- [ ] Add summary table for randomness use cases (see main plan)

## Detailed TODOs
- [ ] Integrate Switchboard VRF per [tutorial](https://docs.switchboard.xyz/product-documentation/randomness/tutorials/solana-svm)
- [ ] Implement randomness account and winner selection
- [ ] Add commit/reveal or anti-sybil logic if required
- [ ] Expose draw_winner instruction
- [ ] Write TypeScript client for VRF

## Notes
- Keep this file in sync with the main plan.
- Reference: [plan-ticketfair-with-switchboard-vrf.md](../docs/plan-ticketfair-with-switchboard-vrf.md) 