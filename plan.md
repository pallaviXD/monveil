# MONVEIL — approved implementation and design plan

## Product and implementation

Build a frontend-only React + TypeScript + Vite application styled with Tailwind, animated with Framer Motion, using Lucide icons and Recharts for the merchant-spend summary. No real payment, wallet, passkey, chain, merchant, or server connection will be represented as live: the visible app is an explicit Testnet demo with demo token and no real money. A typed service boundary in `src/services/` owns every mock read and write, with realistic asynchronous latency, integer-paise money, and service loading/error feedback. `src/services/config.ts` will hold `passkeyMode`, `chainMode` and `aiMode`, each initially `