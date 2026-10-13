# MONVEIL implementation outcomes

## 1. Foundation, visual system, responsive shell, and service boundary
- [ ] Build the frontend only in React + TypeScript + Vite with Tailwind, Framer Motion, Lucide icons and Recharts for one simple chart.
- [ ] Put all data behind a typed `src/services/` layer with realistic async mock data, loading/error states and integer-paise money. Implement `connectWithPasskey()`, `parseBillQr()`, `runGuardianChecks(bill)`, `payBill(bill)`, `getActivity()`, `getRules()`, `setRules()`, `explainResult(result)`, and `signBill(items)`.
- [ ] Add `src/services/config.ts` with `passkeyMode`, `chainMode` and `aiMode` set to `"demo"`; show the appropriate current mode badge on sign-in, pay and the AI explanation card, allowing later mode changes without UI changes. Keep the token label generic (`Demo token`).
- [ ] Use status badge system DEMO, TESTNET, LIVE; clearly indicate unconnected modes. Use no fake explorer link; show Proof only for a confirmed mock and label it simulated. State “Testnet demo. Demo token. No real money.”
- [ ] Apply near-black indigo `#0B0B1E`–`#12102B`, restrained violet/lavender, warm bill paper `#F4EFE6`, status colors green `#3DDC97`, amber `#FFB020`, red `#FF5D5D` with icon AND text, Fraunces / Geist-or-Inter-Tight / JetBrains Mono, tabular money, subtle borders/soft depth/minimal gradients, no heavy glassmorphism, spring motion 200–350ms, and full `prefers-reduced-motion` support.
- [ ] Use supplied logo exactly as an image at `public/logo.png` in landing header, sidebar, sign-in and favicon; do not redraw or trace it. Typeset wordmark is only a fallback if image loading fails.
- [ ] At 360–430px show thumb-friendly bottom tabs (Home, Pay, Activity, Rules), 44px targets and full-screen scanner/bill reveal. At tablet/desktop from 768px, show left sidebar, centered max-width content, and useful two-column bill/check layouts. No horizontal scroll, clipped text or overlapping elements at any width.
- [ ] Use semantic HTML, visible focus states, labelled inputs, 4.5:1 contrast, 44px tap targets, loading skeletons, empty states, errors for blocked reasons and reusable components.

## 2. Landing, sign-in, home, and scan
- [ ] Landing has supplied logo, “Know before you approve.”, animated demo card comparing merchant-signed Rs 1,050 with QR-requested Rs 1,250 and visible red Rs 200 gap; animated Request > Bill seal > Guardian checks > Your decision > Proof flow; plain “what stays off-chain” privacy section; FAQ; “Try the demo” CTA; no fake testimonials, stats or sponsor badges.
- [ ] Sign-in uses one-tap “Continue with passkey”, no seed phrase or wallet jargon, mocks success, and shows the passkey mode badge.
- [ ] Home shows Guardian status ring, demo-labelled “Protected this month” amount, Scan and Pay, last three activities and active-rules summary.
- [ ] Scan offers a full-screen viewfinder with lock-on bracket corners, torch toggle, real QR decode from camera feed using jsQR or html5-qrcode, and visible “Load sample bill” plus camera-denied/unavailable fallback. Decoded text is passed into `parseBillQr()`.

## 3. Merchant signing, bill reveal, Guardian verdict, and explanations
- [ ] Merchant console at `/merchant` is labelled DEMO; supports item, quantity, price and tax entry; computes totals in integer paise; Sign produces a compact bill JSON QR containing bill fields plus signature field and paper bill preview; “Tamper QR” makes a genuinely different QR that scans into an amount-mismatch result; “Replay bill” demonstrates duplicate rejection.
- [ ] Bill reveal unfolds a warm paper bill with perforated edge, itemized lines/tax/total, merchant, expiry countdown and “Merchant signed” seal.
- [ ] Guardian verdict sequences five checks: Bill seal, Amount, Expiry, Not paid before, Your rules. Line-item overcharge check for math errors, duplicate lines and tax mismatch is Pass, Review or Unavailable. Show Safe to pay (green), Review (amber) or Blocked (red). On mismatch split “Merchant signed 1,050” vs “QR asks 1,250” and show the Rs 200 red gap. Show one calm, clearly labelled “Explained by AI” sentence; it explains but never decides and never accuses the merchant of fraud. Show current AI mode badge.

## 4. Pay, payment lifecycle, receipt and proof
- [ ] Pay summarizes amount, generic “Demo token” and network; offers accessible hold-to-confirm that fills while pressed; Blocked bills have a disabled payment button and visible reason; current chain mode badge appears.
- [ ] Payment status and Receipt handle pending, submitted, confirmed and failed. Confirmed state animates a wax-seal-style stamp onto a paper receipt, offers Share and a simulated Proof link only where confirmed mock state exists. Hash, contract and network live in collapsed “Details” only; never show those technical details outside it.

## 5. Activity and merchant-spend summary
- [ ] Activity timeline is grouped by day, supports search and All/Paid/Blocked/Review filters, has “Blocked for you” count, a Recharts spending-by-merchant summary chart, and per-item detail that explains why it passed or was blocked. Include loading/empty/error states.

## 6. Rules
- [ ] Rules has per-payment limit and daily cap sliders, blocked merchants add/remove, async save confirmation and errors; the default per-payment limit is Rs 2,000 and pay decisions obey saved rules.

## 7. Settings and five end-to-end demo outcomes
- [ ] Settings supports INR/USD display with labelled demo rate, network status, privacy notes and reset demo data.
- [ ] End-to-end mock outcomes: (1) honest Rs 1,050 bill: all checks pass, hold-to-pay, stamped receipt; (2) tampered QR asks Rs 1,250: blocked with split-amount animation and Rs 200 gap; (3) replayed already-paid bill: blocked as duplicate; (4) payment above Rs 2,000 limit: blocked by Your rules; (5) expired bill: blocked.

## 8. Delivery and documentation
- [ ] README includes run commands. App runs on mock data only. Validate the five outcomes at phone and desktop widths, and fix errors before delivery. Report what works and what remains mocked. Never claim fraud-proof protection, guaranteed savings, real UPI/bank support or “cheapest price” detection.