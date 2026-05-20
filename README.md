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
| `NEXT_PUBLIC_BACKEND_URL` | Frontend | Backend API base URL |
| `NEXT_PUBLIC_RPC_URL` | Frontend | Ethereum RPC endpoint |
| `BACKEND_URL` | Frontend (SSR) | Internal backend URL |
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
| `/history` | Transaction history (wallet-linked) |

---

## Key Contracts (Ethereum Mainnet)

| Contract | Address |
|---|---|
| PufferVault | `0xD9A442856C234a39a81a089C06451EBAa4306a72` |
| pufETH | `0xd9a442856c234a39a81a089c06451ebaa4306a72` |
| stETH | `0xae7ab96520de3a18e5e111b5eaab095312d7fe84` |
| wstETH | `0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0` |

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
- 🚧 DEX aggregator (any token → ETH → pufETH): beta integrated (`/swap`) with live quote estimation + DEX handoff, seamless one-click execution flow in progress

## Security and UX safeguards
- Mainnet-only staking guardrail with one-tap network switch request
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

## Hackathon Submission

- **Base challenge:** ✅ Complete
- **Advanced challenge:** 🚧 In progress (beta shipped at `/swap`; seamless one-click execution in progress)

Built for the imToken 10th Anniversary AI Co-Creation Campaign.
