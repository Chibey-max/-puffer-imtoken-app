# Token Core Materials Integration Evidence

This project integrates official imToken hackathon materials in both runtime code and security UX.

## 1) token-core-monorepo / tcx-wasm

- Source: `https://github.com/consenlabs/token-core-monorepo`
- WASM package: `@consenlabs/tcx-wasm`

### Where used
- `frontend/lib/tokenCore/client.ts`
  - `initTokenCore()`
  - `createDemoKeystore()`
  - `deriveEthereumAccount()`
- `frontend/app/tokencore/page.tsx`
  - in-app Token Core workspace
  - wasm initialization
  - demo keystore creation
  - ETH account derivation

## 2) token-core-cli materials (policy semantics)

- Source: `https://github.com/consenlabs/token-core-monorepo/tree/demo/token-core-cli/token-core/tcx-examples/cli`

### Where used
- `frontend/lib/risk/tokenCorePolicy.ts`
  - Risk mapping modeled after CLI output semantics:
    - policy violation → `block`
    - simulation failure/revert → `danger`
    - unverified contract → `warning`
    - unknown selector → `warning`
    - local-rule-only context → `info`

## 3) token-ui / security materials

- Source: `https://github.com/consenlabs/token-ui`
- Security handbook source: `https://github.com/consenlabs/token-ui/tree/main/security`

### Where used
- `frontend/app/security/page.tsx`
  - Security checklist and challenge coverage
  - Direct references to official material URLs
- `frontend/app/tokencore/page.tsx`
  - explicit demo-only warning and key safety messaging

## 4) Non-breaking integration strategy

To preserve app stability for staking flows, Token Core integration is additive:

- Existing wallet connect, staking, swap, and vault flows remain primary.
- Token Core material usage is surfaced in a dedicated in-app workspace (`/tokencore`).
- Navigation exposure can be controlled with `NEXT_PUBLIC_TOKENCORE_MODE`.

## 5) Validation run

- Command: `npm run build` (in `frontend/`)
- Result: success (includes `/tokencore` route generation)
