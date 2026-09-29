# Phase D — User Story 1 Report

Branch: `phase-d-game`

## Delivery status

Tasks T041–T058 are complete. T059 remains unticked because deployment, preview environment changes, and manual preview validation are assigned to the orchestrator.

The game now uses server-authoritative outcomes from `POST /api/spin`. The browser displays and animates the returned 3×3 strip, but cannot choose or upgrade an outcome. Three regular losing spins unlock one Last Chance spin. A win immediately locks the session. Returning sessions restore idle, Last Chance, won, claimed, or game-over state from `GET /api/session`.

## API contract implemented

`GET /api/session` gets or creates the signed-cookie session and returns:

```json
{
  "spinsLeft": 3,
  "bonusAvailable": false,
  "state": "idle",
  "win": null
}
```

Won and claimed sessions include the server-recorded `spinId`, `winRef`, `ruleId`, `discount`, and reels. A lead linked to the winning spin changes the restored state from `won` to `claimed`.

`POST /api/spin` returns the full recorded result: `spinId`, `spinNo`, `reels`, 3×3 `strip`, `outcome`, `ruleId`, `discount`, `winRef`, `nearMiss`, `spinsLeft`, `bonusAvailable`, and `isBonus`. Its errors follow the contract:

- `403 no_spins_left` includes `state: "won" | "game_over"`.
- `429 rate_limited` enforces the configurable same-IP daily session cap; `DAILY_SESSIONS_PER_IP=0` disables it.
- `500 server_error` never reports a win and does not consume a spin.

The production write path uses one SQL statement: an `UPDATE sessions ... RETURNING` CTE feeds `INSERT INTO spins ... SELECT ... FROM s`. The row lock serialises concurrent requests, the statement atomically increments the counter and records the result, and a failed insert rolls the counter change back. A `win_ref` uniqueness collision regenerates the reference and retries the complete statement, with at most three attempts.

## Paytable and RNG evidence

The exhaustive evaluator test checks all 512 ordered combinations. Exactly 53 are wins, assigned once under precedence:

- Three-of-a-kind face rules: one combination each for Scott, Fiona, Gia, and Keith.
- `keith-2-any`: 21 ordered combinations.
- `people-2-plus-1`: 27 ordered combinations after Keith precedence.
- `neos-3`: one ordered combination.

The required 100,000-spin test checks total win rate against 10.35% ± 0.3%, per-reel symbol frequencies near 1/8, production rejection of `FORCE_REELS`, and the invariant `strip[1] === reels`. One additional 100,000-spin sample observed 10.259% wins: 194 Scott triples, 208 Fiona triples, 223 Gia triples, 202 Keith triples, 4,072 Keith-two-any wins, 5,175 two-plus-one face wins, 185 Neos triples, and 89,741 losses.

## Client flow

The client state path is:

```text
LANDING → IDLE → SPINNING → RESOLVING
                         ├─ win → WON
                         ├─ retry → IDLE
                         ├─ third loss → LAST_CHANCE → SPINNING
                         └─ bonus loss → GAME_OVER
```

The approved Monte Carlo Velvet scene remains intact. The live PixiJS reel layer uses the approved reel-window mask, three visible rows, middle-row payline, cylinder shading, blur, and staggered GSAP stops. Face triples blink through the approved frames and finish on the win frame; Neos uses pulse rings and a warm glow; mixed rules highlight contributing symbols. The DOM controls provide PLAY, SPIN, disabled states, Space/Enter activation, a live spins-left counter, accessible result dialogs, near-miss copy, Last Chance, game over, server error, and rate-limit messages. A display-only copy of the current win is stored in `localStorage`; server state remains authoritative.

## Database test strategy

The API suites use a fresh PGlite database with `db/migrations/001_init.sql` applied. They never read `DATABASE_URL`; test-only values provide `SESSION_SECRET` and `IP_HASH_SALT`. When `TEST_DATABASE_URL` is set, the optional Neon integration suite runs against that test database. It was unset for this run, so no real Neon database was read or changed.

The 20-concurrent-spin test proves the four-row limit logically through the production single-statement CTE and database constraints. PGlite uses one connection, so this test does not reproduce Neon HTTP transport concurrency; it still verifies that 20 submitted handler calls produce no more than four spin rows. Preview validation on a Neon test branch remains part of T059.

## Verification

- `pnpm build`: passed; the 74-entry approved asset manifest validated and Vite built all three entry points.
- `pnpm test`: 66 tests passed across 16 files; the optional `TEST_DATABASE_URL` test was skipped because the variable was unset.
- `pnpm exec tsc --noEmit`: passed.
- Full Playwright suite: 6 tests passed, including the existing asset-board and seven-viewport layout coverage plus the new mocked spin flow.
- `git diff --check`: passed.

Playwright captured the required mocked states at both target sizes in `reference/_work/phase-d/`:

- `landing-1920x1080.png`, `mid-spin-1920x1080.png`, `win-20-1920x1080.png`
- `landing-390x844.png`, `mid-spin-390x844.png`, `win-20-390x844.png`

No deployment, push, Vercel command, Neon setting change, remote database write, or `.env.local` change was performed. The existing development server on port 5173 was not touched; Playwright used port 4173.
