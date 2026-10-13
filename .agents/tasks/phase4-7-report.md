# Monveil Phase 4–7 Implementation Report

**Date:** October 14, 2026  
**Phases:** 4 (Kimi), 5 (Blockchain), 6 (Passkey), 7 (Envio)

---

## Quality Gates

| Gate | Result | Detail |
|------|--------|--------|
| TypeScript `tsc --noEmit` | ✅ PASS | 0 errors |
| Vitest test suite | ✅ PASS | **43/43 tests** (30 pre-existing + 13 new) |
| Vite production build | ✅ PASS | Built in 5.07s, 3144 modules |
| `.env` diff | ✅ CLEAN | No secrets added or modified |

---

## Files Changed (13 source files)

| File | Change |
|------|--------|
| `src/services/kimiExplanation.ts` | Expanded `AiExplanationResponse` docs; added HTTP 402 → `quota-exhausted` mapping; full `statusReason` union type |
| `src/services/blockchain.ts` | `executeMonadSettlement` now sets explicit `isSimulated`/`txHash`/`explorerUrl` fields; added `getOnChainTxStatus()` for real tx polling |
| `src/services/passkey.ts` | `EncryptedReceiptVault.keySource: 'prf'|'fallback'`; `encryptReceiptWithPrf` sets it correctly; propagates `NotAllowedError`/`NotSupportedError`/`SecurityError` instead of silently falling back |
| `src/services/envio.ts` | Completely rewritten with `EnvioSource` type: `envio-live` / `envio-live-empty` / `indexer-unavailable` / `graphql-error` |
| `src/domain/types.ts` | `PaymentStatus` + `'rejected'`; `PaymentReceipt` gains `isSimulated`, `txHash`, `explorerUrl`, `networkLabel`, `registryContract` (deprecated fields kept for compat) |
| `src/app/DemoContext.tsx` | Imports `getOnChainTxStatus`; `submitPayment` polls RPC for real tx confirmation; failed receipt carries `isSimulated:true` |
| `src/pages/ReceiptPage.tsx` | Fully rewritten `SettlementModeBanner` uses `isSimulated`/`txHash`/`status`; handles all 5 states (pending/submitted/confirmed/rejected/simulated); simulated receipt explicitly labeled in stamp and details |
| `src/pages/VerdictPage.tsx` | `AiBadge` + `fallbackNote` + `reasonBadgeLabel` cover all `statusReason` values including `http-NNN` passthrough; never shows `KIMI · LIVE` for fallback |
| `src/pages/SignInPage.tsx` | Error handling distinguishes cancel/security/support errors; added PRF vault transparency note after sign-in |
| `src/pages/ActivityPage.tsx` | Envio card handles all 4 `EnvioSource` values: green/amber/muted pills; `ENVIO · LIVE` only when `envio-live` |
| `src/styles/extra.css` | Added `.settlement-mode-banner--pending` (amber) and `.settlement-mode-banner--rejected` (red) |
| `src/services/transparency.test.ts` | **New** — 13 tests covering all four integrations |
| `src/services/verification.test.ts` | Pre-existing 22 tests — untouched, all pass |

---

## New Tests (transparency.test.ts — 13 tests)

### Kimi AI (5 tests)
- `getDeterministicFallbackExplanation` returns non-empty for all 5 reason codes
- `generateKimiExplanationServer` → `api-key-missing` when no env key
- HTTP 429 → `quota-exhausted`
- HTTP 402 → `quota-exhausted`
- AbortError → `timeout-or-network`

### Envio Indexer (4 tests)
- Mock records returned → `source='envio-live'`
- Mock empty array (HTTP 200) → `source='envio-live-empty'`
- Fetch throws → `source='indexer-unavailable'`
- `errors` field in response → `source='graphql-error'`

### Passkey Encryption (2 tests)
- No key → `keySource='fallback'`
- Real `CryptoKey` → `keySource='prf'`

### Blockchain (2 tests)
- `getOnChainTxStatus` callable, returns `'confirmed'` (mocked)
- `PaymentReceipt.isSimulated` type contract verified

---

## Integration Status Table

| Integration | Status | Evidence |
|-------------|--------|----------|
| **Kimi AI** | 🟡 FALLBACK (balance exhausted) | `statusReason='quota-exhausted'` on HTTP 429/402; UI shows `RULE-BASED · QUOTA EXCEEDED`; fallback explanations are clearly labelled — never shown as live AI |
| **Monad Blockchain** | 🟡 SIMULATED (no wallet connected in demo) | `isSimulated=true` on all demo receipts; `SettlementModeBanner` shows "Simulated receipt — no transaction was broadcast"; real wallet path sets `isSimulated=false` + `txHash` + explorer link + polls RPC for `confirmed`/`rejected` status |
| **Passkey (WebAuthn)** | 🟡 DEPENDS ON BROWSER | `isPasskeySupported()` shown on sign-in page; real auth → `method='passkey'`; simulated → `method='demo-passkey'` with amber warning; PRF vault shows `keySource='prf'` or `'fallback'` explicitly |
| **Envio HyperIndex** | 🔴 INDEXER UNAVAILABLE | Endpoint `https://indexer.bigdevenergy.link/monveil-indexer/v1/graphql` returns no data; UI shows `ENVIO · OFFLINE` pill with reason; schema + event handlers configured and ready; will show `ENVIO · LIVE` only when a real indexed response arrives |

---

## Honest Assessment

**What is genuinely live:**
- Guardian verification (5 deterministic checks) — fully functional, all tests pass
- EIP-712 merchant signature verification — functional
- PRF receipt vault encryption — functional when browser/authenticator supports PRF; fallback clearly labelled
- Production build — passes, deployed to Vercel

**What is simulated/unavailable and clearly labelled as such:**
- Kimi AI explanations — fallback to deterministic engine; badge says `RULE-BASED · QUOTA EXCEEDED`
- Blockchain settlement — requires wallet connection; without one, receipt stamp says `SIMULATED DEMO RECEIPT · NOT ON-CHAIN`
- Envio indexer — endpoint unavailable; `ENVIO · OFFLINE` with reason shown; no fake "live" label

**No API keys or secrets were added or exposed in any file.**
