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
| `NEXT_PUBLIC_BACKEND_URL` | Frontend | Backend API base URL (set this in production; example `https://your-backend.com/api`) |
| `NEXT_PUBLIC_RPC_URL` | Frontend | RPC endpoint (default: Holesky public RPC) |
| `NEXT_PUBLIC_CHAIN_ID` | Frontend | Target chain id (default: `0x4268` Holesky) |
| `NEXT_PUBLIC_NETWORK_NAME` | Frontend | Target network label (default: `Holesky`) |
| `NEXT_PUBLIC_SIMULATE_STAKE` | Frontend | Demo-only simulated stake mode (`true/false`) |
| `NEXT_PUBLIC_SUBMISSION_MODE` | Frontend | Submission mode (`true` disables simulation automatically) |
| `BACKEND_URL` | Frontend (SSR rewrite) | Internal backend URL for Next.js `/api/*` rewrite |
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

## Security and UX safeguards
- Network guardrail enforces configured target network with one-tap switch request
- Graceful backend outage handling (non-blocking live-data warning banner)
- Transaction state machine: prepare → wallet signature → submitted → confirmed/error
- Local + backend-persisted transaction history with Etherscan verification links
- Mobile-first layout tuned for imToken in-app browsing

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
```

- `NEXT_PUBLIC_SUBMISSION_MODE=true` automatically disables simulated staking even if `NEXT_PUBLIC_SIMULATE_STAKE=true` by mistake.
- This ensures real transaction flow on supported networks.

## Deployment (mobile testing)

### Recommended split deploy
1. Deploy `backend/` to Render/Railway/Fly (Express long-running server).
2. Deploy `frontend/` to Vercel (Root Directory = `frontend`).
3. Set frontend env `NEXT_PUBLIC_BACKEND_URL` to your backend `/api` URL.
4. Set backend env `FRONTEND_URL` to your frontend domain for CORS.

### Vercel frontend settings
- Framework: Next.js
- Root Directory: `frontend`
- Build command: `npm run build`
- Output: default Next.js

### Backend minimum env
```bash
PORT=8080
FRONTEND_URL=https://your-frontend.vercel.app
```

### Quick mobile validation checklist
- Open deployed URL on phone/imToken browser.
- Confirm `/api/health` banner is not showing repeated failures.
- Complete one stake flow and verify Etherscan link.
- Complete one swap route (or observe graceful no-liquidity fallback).

## Hackathon Submission

- **Base challenge:** ✅ Complete
- **Advanced challenge:** ✅ Implemented for supported routes/networks (with clear runtime guardrails)

Built for the imToken 10th Anniversary AI Co-Creation Campaign.
