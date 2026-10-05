# Trust Royale

Trust Royale is Trust Electric Heating's full-screen promotional slot game. Vite and TypeScript power the browser client, PixiJS and GSAP render the scene, Howler handles audio after the PLAY gesture, Vercel Functions decide spin outcomes, and Neon Postgres stores server-side sessions and spins.

## Local setup

Requirements: Node.js 22 or later, pnpm 10, Vercel CLI, and access to the linked Vercel project and a development Neon database.

```bash
pnpm install
vercel env pull .env.local
pnpm db:migrate
vercel dev
```

`vercel dev` serves the Vite pages and `/api` functions together. Never point local migrations or tests at the production database.

## Environment variables

Copy `.env.example` for the complete local list:

- `DATABASE_URL`: pooled Neon Postgres connection string.
- `SESSION_SECRET`: at least 32 random bytes used to sign `tr_sid` cookies.
- `IP_HASH_SALT`: secret salt used before visitor IP addresses are hashed.
- `DAILY_SESSIONS_PER_IP`: daily new-session limit per IP hash; `0` disables it.
- `FORCE_REELS`: optional preview-only comma-separated reel result; production ignores it.

`TEST_DATABASE_URL` is optional and test-only. When set, the API integration suite also runs against that disposable database. Tests never read `DATABASE_URL`.

## Tests and checks

```bash
pnpm build
pnpm test
pnpm exec tsc --noEmit
pnpm test:e2e
```

The production build validates the approved asset manifest, type-checks, builds Vite, checks that fallback coupon codes did not enter the client bundle, enforces the 250 KB gzip JavaScript budget, and enforces the 4 MB pre-PLAY transfer budget.

Playwright starts a preview server on port 4173. If Playwright cannot find Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed Chromium executable before running `pnpm test:e2e`.

## Branch convention

Work is delivered in owner-reviewed phase branches. Use `phase-a-*` through `phase-f-*` names for gated deliverables, keep each phase in a logical commit, and merge only after its review gate passes. The current playable work lives on `phase-d-game`; deployment and production configuration are handled separately by the orchestrator.
