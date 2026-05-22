# Puffer x imToken — Staking Mini App

A mobile-first DeFi mini app for the [imToken x Puffer Finance hackathon](https://10.token.im/#cocreation).
Stake ETH/stETH/wstETH to mint pufETH, view live rates, and explore UniFi Vault yield opportunities — all from inside the imToken in-app browser.

---

## Architecture

```
imToken Browser
      │
      ▼
┌─────────────────────┐
│  Next.js 14 Frontend│  ← App Router, Tailwind, ethers.js v6
│  (port 3000)        │  ← @pufferfinance/puffer-sdk
└────────┬────────────┘
         │ /api/* proxy
         ▼
┌─────────────────────┐
│  Express Backend    │  ← TypeScript, in-memory cache
│  (port 8080)        │  ← Proxies Puffer public API
└────────┬────────────┘
         │
         ▼
  api-v2.puffer.fi/imtoken-hackathon
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm or npm

### Frontend
```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local with your RPC URL
npm install
npm run dev
```

### Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

App runs at http://localhost:3000

### Docker (full stack)
```bash
cp .env.example .env
docker compose up --build
```

---

## Environment Variables

| Variable | Service | Description |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Frontend | Optional external backend API base URL (leave unset for Vercel-only mode using built-in `/api` routes) |
| `NEXT_PUBLIC_RPC_URL` | Frontend | RPC endpoint (default: Holesky public RPC) |
| `NEXT_PUBLIC_CHAIN_ID` | Frontend | Target chain id (default: `0x4268` Holesky) |
| `NEXT_PUBLIC_NETWORK_NAME` | Frontend | Target network label (default: `Holesky`) |
| `NEXT_PUBLIC_SIMULATE_STAKE` | Frontend | Demo-only simulated stake mode (`true/false`) |
| `NEXT_PUBLIC_SUBMISSION_MODE` | Frontend | Submission mode (`true` disables simulation automatically) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Frontend | WalletConnect/Reown project id (required for universal WC wallet connection) |
| `NEXT_PUBLIC_TOKENCORE_MODE` | Frontend | Optional switch for Token Core UI surfaces (`true/false`, default `true`) |
| `BACKEND_URL` | Frontend (optional rewrite) | Only set when you want Next.js to proxy `/api/*` to an external backend |
| `PORT` | Backend | Server port (default 8080) |
| `FRONTEND_URL` | Backend | CORS allowed origin |

---

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard — rates, balances, protocol TVL |
| `/stake` | Stake ETH / stETH / wstETH → pufETH |
| `/vaults` | UniFi vault listings with live APY + TVL |
| `/vaults/[id]` | Vault detail page |
| `/swap` | Aggregator quote/swap with optional auto-stake to pufETH |
| `/security` | Security center + challenge coverage checklist |
| `/tokencore` | Token Core workspace (tcx-wasm init + keystore/account demo + CLI-style risk mapping) |
| `/history` | Transaction history (wallet-linked) |

---

## Key Contracts

| Contract | Address |
|---|---|
| pufETH | `0xd9a442856c234a39a81a089c06451ebaa4306a72` |
| stETH | `0xae7ab96520de3a18e5e111b5eaab095312d7fe84` |
| wstETH | `0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0` |

> For submission, use a chain where staking path is supported (default app target is Holesky).

---

## Git Conventions

Conventional Commits: `<type>(<scope>): <description>`

```
feat(stake): add stETH deposit flow with rate preview
fix(api): handle upstream timeout in vault apy proxy
chore(docker): add health check to backend service
```

**Branch model:**
- `main` → production (PR only)
- `develop` → integration
- `feature/*` → individual work, PR into develop

---

## How this meets hackathon requirements

### Base challenge mapping
- ✅ **Connect wallet**: injected EIP-1193 wallet flow optimized for imToken in-app browser
- ✅ **Stake ETH/stETH/wstETH**: `Stake` flow supports all 3 asset paths via `@pufferfinance/puffer-sdk`
- ✅ **Mint/display pufETH balances & rates**: live pufETH rate cards, stake amount preview, and on-chain wallet `pufETH` balance widget
- ✅ **Showcase UniFi Vault opportunities**: vault list + detail pages with APY/TVL and direct vault links
- ✅ **Secure staking UX**: network gating (Ethereum mainnet only), transaction lifecycle states, and explorer verification links

### Advanced challenge status
- ✅ DEX aggregator path implemented on supported routes/networks (`/swap`) with quote → swap execution + optional auto-stake to pufETH
- ℹ️ Availability depends on network liquidity/aggregator support for the selected token pair

## Token Core Materials Used (official hackathon resources)

| Material | Integration in this project |
|---|---|
| `token-core-monorepo` / `tcx-wasm` | Direct runtime integration via `frontend/lib/tokenCore/client.ts` and `frontend/app/tokencore/page.tsx` (`@consenlabs/tcx-wasm`) |
| Token Core CLI demo semantics | Risk mapping implemented in `frontend/lib/risk/tokenCorePolicy.ts` (policy violation / simulation fail / unknown selector / unverified contract → UI severities) |
| `token-ui` security materials | Security UX/checklist reflected in `frontend/app/security/page.tsx` and linked references for judges |
| `token-ui` design guidance | Existing mobile-first wallet UX and risk surfaces follow consistent semantic warning tiers |

## Security and UX safeguards
- Network guardrail enforces configured target network with one-tap switch request
- Graceful backend outage handling (non-blocking live-data warning banner)
- Transaction state machine: prepare → wallet signature → submitted → confirmed/error
- Local + backend-persisted transaction history with Etherscan verification links
- Mobile-first layout tuned for imToken in-app browsing
- Token Core workspace exposes direct wasm initialization + account derivation demo
- Token Core CLI-style risk severity mapping (`Info / Warning / Danger / Block`) for pre-sign assessment

## Demo flow (for judges)
1. Open app in imToken browser and connect wallet
2. Verify dashboard live rates + protocol TVL
3. Open `Stake`, enter ETH/stETH/wstETH amount, and submit
4. Observe transaction lifecycle feedback and Etherscan link
5. Open `Vaults` and inspect APY/TVL + detail pages
6. Open `History` to view persisted transaction timeline (local + backend store)

## Submission Mode (judge-ready)

Use these frontend env values for final judging:

```bash
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com/api
NEXT_PUBLIC_CHAIN_ID=0x4268
NEXT_PUBLIC_NETWORK_NAME=Holesky
NEXT_PUBLIC_RPC_URL=https://ethereum-holesky-rpc.publicnode.com
NEXT_PUBLIC_SIMULATE_STAKE=false
NEXT_PUBLIC_SUBMISSION_MODE=true
NEXT_PUBLIC_SHOW_SUBMISSION_STATUS=false
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=41e2bc351481c4efbc367571270bba50
```

- `NEXT_PUBLIC_SUBMISSION_MODE=true` disables simulation automatically.
- This app now also enforces live-only behavior in UI when `NEXT_PUBLIC_SIMULATE_STAKE=true` is detected.
- Result: no fake/simulated staking confirmations in submission mode.

## Network Capability Matrix (current implementation)

| Network | Stake ETH/stETH/wstETH → pufETH | UniFi Vault Deposit | Any-token one-click (DEX route) |
|---|---:|---:|---:|
| Mainnet | ✅ | ✅ | ✅ |
| Holesky (`0x4268`) | ✅ | ❌ (vault contracts unavailable) | ❌ (aggregator path disabled) |
| Sepolia (`0xaa36a7`) | ❌ (required staking contracts unavailable) | ❌ | ❌ |

The app now shows a live in-app capability panel and blocks unsupported actions with clear reasons.

## Live-only transaction policy

- Simulation paths are removed from staking execution.
- Every submitted transaction is a real on-chain transaction and linked to the active chain explorer.
- Unsupported network flows are blocked before wallet signature prompts.
- Explorer links are chain-aware:
  - Mainnet: `etherscan.io`
  - Holesky: `holesky.etherscan.io`
  - Sepolia: `sepolia.etherscan.io`

## Hackathon API request contract notes

- `GET /gauges/apr` requires `identifier` query param.
- `GET /tokens/prices` requires `addresses` query param.
- For `tokens/prices`, multiple addresses should be joined with `%`.

## Deployment (mobile testing)

### Option A: Vercel-only (single deploy)
This frontend now includes built-in Next.js API routes under `frontend/app/api/*` that replace the Express proxy for deployment.

Vercel settings:
- Framework: Next.js
- Root Directory: `frontend`
- Build command: `npm run build`
- Output: default Next.js

Recommended env for Vercel-only mode:
```bash
NEXT_PUBLIC_CHAIN_ID=0x4268
NEXT_PUBLIC_NETWORK_NAME=Holesky
NEXT_PUBLIC_RPC_URL=https://ethereum-holesky-rpc.publicnode.com
NEXT_PUBLIC_SIMULATE_STAKE=false
NEXT_PUBLIC_SUBMISSION_MODE=true
NEXT_PUBLIC_SHOW_SUBMISSION_STATUS=false
```

Important:
- Leave `NEXT_PUBLIC_BACKEND_URL` unset in Vercel-only mode.
- Leave `BACKEND_URL` unset so local `app/api/*` handlers are used.
- Tx-history API persistence is best-effort in serverless runtime; local wallet history remains available in browser storage.

### Option B: Split deploy (frontend + external backend)
1. Deploy `backend/` to Render/Railway/Fly.
2. Deploy `frontend/` to Vercel (Root Directory = `frontend`).
3. Set `NEXT_PUBLIC_BACKEND_URL` to external backend `/api` URL.
4. (Optional) Set `BACKEND_URL` if you want Next.js rewrite proxy behavior.

### Quick mobile validation checklist
- Open deployed URL on phone/imToken browser.
- Confirm `/api/health` banner is not showing repeated failures.
- Complete one stake flow and verify Etherscan link.
- Complete one swap route (or observe graceful no-liquidity fallback).

## Hackathon Submission

- **Base challenge:** ✅ Complete
- **Advanced challenge:** ✅ Implemented for supported routes/networks (with clear runtime guardrails)

Built for the imToken 10th Anniversary AI Co-Creation Campaign.
