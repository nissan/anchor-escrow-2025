# Anchor Escrow 2025

## 🆕 Updated for Solana Kit, Kite, and Codama

[![CI Badge](https://github.com/mikemaccana/anchor-escrow-2025/actions/workflows/tests.yaml/badge.svg)](https://github.com/mikemaccana/anchor-escrow-2025/actions)

**Start here for your first real Solana program.** As the saying goes, "All Solana programs are variations of an escrow." This makes **Anchor Escrow 2025** the perfect starting point for anyone diving into Solana development with a practical, real-world application.

**Anchor Escrow 2025** provides:

- Full compatibility with the latest Rust, Agave CLI, Node.js, Anchor, and Solana Kit.
- Clean builds with zero warnings or errors.
- Testing via npm and Node.js, avoiding third-party package managers or test runners.

## Animated walk through

Check out the **full animated explanation** of the Escrow program from mySolana TURBIN3 video:

[![Full animated explanation of the Escrow program](https://img.youtube.com/vi/ZMB_OqLIeGw/maxresdefault.jpg)](https://www.youtube.com/watch?v=ZMB_OqLIeGw)

This repository is [designed for teaching and learning](CHANGELOG.md).

## Introduction

This Solana program implements an **escrow**, enabling secure token swaps between users. For example, Alice can offer 10 USDC in exchange for 100 WIF.

Without an escrow, users face significant risks:

- **Traditional finance** charges 1-6% in fees, eating into your funds.
- **Manual swaps** are prone to fraud. If Bob takes Alice's 10 USDC but doesn't send the 100 WIF, or if Alice fails to deliver after receiving Bob's tokens, someone gets burned.

The **Anchor Escrow 2025** program acts as a trusted intermediary, releasing tokens only when both parties meet the agreed terms. This ensures Alice and Bob each receive 100% of their desired tokens, securely and without middleman fees.

## Versions

Verify your local environment with:

```bash
bash show-versions.sh
```

This repository was tested with:

```
OS:
  MacOS 15.4.1
Solana CLI:
  solana-cli 2.1.21 (src:8a085eeb; feat:1416569292, client:Agave)
Anchor:
  anchor-cli 0.31.1
Node:
  v22.14.0
Rust:
  rustc 1.86.0 (05f9846f8 2025-03-31)
build-sbf version:
  solana-cargo-build-sbf 2.1.21
```

Using different versions may cause compatibility issues.

## Repository Organization

This repository is now organized for both **development** and **demonstration** purposes:

### 🎬 Demo Materials (`demo/`)
Ready-to-use demonstration suite:
- **Quick Demo**: `npm run demo:full-auction`
- **Complete Guide**: `demo/docs/DEMO.md`
- **Live Scripts**: `demo/scripts/`
- **Code Examples**: `demo/examples/`

### 🛠 Development (`development/`)
Technical documentation and planning:
- **Phase Documentation**: `development/phases/`
- **Deployment Guides**: `development/docs/`
- **Testing Strategies**: `development/docs/TESTING.md`

## Quick Start

### For Demonstrations
```bash
# Check demo prerequisites
./demo/scripts/check-demo-deps.sh

# Run complete demo workflow
npm run demo:full-auction
```

### For Development
```bash
# Install dependencies
npm install

# Build and test
npm run build
RUSTUP_TOOLCHAIN=nightly-2025-04-16 anchor test

# Deploy to devnet
anchor deploy
```

## Changelog and Credits

See the [CHANGELOG](CHANGELOG.md) for updates and contributor credits.

## Planning: Solana Program & Switchboard VRF Integration

See [`/docs/plan-switchboard-vrf.md`](docs/plan-switchboard-vrf.md) for the current plan, TODOs, and integration notes for building out the Solana programs and integrating Switchboard VRF features following [Switchboard's Solana SVM tutorial](https://docs.switchboard.xyz/product-documentation/randomness/tutorials/solana-svm).
