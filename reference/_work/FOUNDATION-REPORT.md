# Foundation Phase Report

Branch: `phase-foundation`

## Task status

- [x] T032 — Added the complete eight-symbol configuration in `src/config/symbols.ts`, including fixed ordering, symbol kinds, display names, and manifest-key frame mappings.
- [x] T033 — Reworked `src/config/paytable.ts` into seven typed `PaytableRule` rows in evaluator precedence order. The approved Gate B carousel keeps its original presentation order and artwork through `PRIZE_CAROUSEL_RULES`.
- [x] T034 — Added `db/migrations/001_init.sql` with the `sessions`, `spins`, and `leads` tables, required checks and unique constraints, the deferred `sessions.won_spin_id` foreign key, and the CRM retry index.
- [ ] T035 — Added the migration runner and confirmed the existing `pnpm db:migrate` command, but did not link Neon or run the migration remotely. The owner must first link an EU-region Neon database through the Vercel Marketplace so `DATABASE_URL` is available in Preview and Development, then run `pnpm db:migrate` against the Neon development branch.
- [x] T036 — Added the lazy Neon HTTP tagged-template client in `api/_lib/db.ts`. No interactive transaction helper was added.
- [x] T037 — Added signed 90-day `tr_sid` cookies, constant-time HMAC verification, IP hashing, UTM capture, and first-visit session creation in `api/_lib/session.ts`.
- [x] T038 — Added JSON and uniform error response helpers in `api/_lib/http.ts`.
- [x] T039 — Added manifest parsing, key lookup, PixiJS bundle registration, eager non-audio loading, and deferred audio loading in `src/assets.ts`.
- [x] T040 — Added the typed game state machine and subscriber API in `src/game/state.ts`, including network-error recovery and direct hydration from every server state.

## SQL validation

Added `@electric-sql/pglite` as a development dependency and applied `001_init.sql` to an in-memory PostgreSQL-compatible database during Vitest. The migration tests verify:

- all three tables and the CRM retry index exist;
- `CHECK` constraints reject invalid spin counts and reel lengths;
- `UNIQUE (session_id, spin_no)` rejects duplicate spin numbers;
- `sessions.won_spin_id` is both deferrable and initially deferred, and permits the session and winning spin to be inserted in one transaction.

No Vercel or Neon account action was attempted. No remote database migration was run because this machine has no `DATABASE_URL`.

## Tests and verification

- `pnpm build` passed, including the 74-entry asset manifest check and TypeScript compilation.
- `pnpm test` passed: 10 files, 37 tests.
- `pnpm exec tsc --noEmit` passed.
- Playwright `layout.spec.ts` and `assets.spec.ts` passed on port 4173 with the required Chromium executable. This covers the approved Gate B layout and Gate C asset-board smoke test.
- `git diff --check` passed.

The development server on port 5173 was not touched. Nothing was pushed or deployed.
