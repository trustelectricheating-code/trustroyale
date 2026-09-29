---

description: "Task list for Trust Royale — Branded Slot Machine Promo Game"
---

# Tasks: Trust Royale — Branded Slot Machine Promo Game

**Input**: Design documents from `/specs/001-trust-royale-slots/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (spin-api.md, lead-api.md, asset-manifest.md), quickstart.md

**Tests**: Included. The spec requires them (SC-003: automated test over all 512 combinations; SC-007: spin limit enforced) and plan.md names Vitest + Playwright. Test tasks come before the code they cover and must fail first.

**Organization**: Tasks are grouped by user story. Because the owner requires design sign-off before any game logic (US4, SC-005), US4 runs first even though it is a process story. Story phases after that follow spec priority: US1 (P1), US5 (P1), US3 (P2), US2 (P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- All paths are relative to the repository root (`/Users/ananthu/Desktop/casinogame`)

## Path Conventions

Single Vite project at repo root (plan.md → Structure Decision): pages at root (`index.html`, `moodboard.html`, `assets.html`, `admin.html`), client code in `src/`, Vercel Functions in `api/`, SQL in `db/migrations/`, tests in `tests/unit/` and `tests/e2e/`, runtime assets in `public/assets/`. `src/config/` is imported by both client and `api/`.

## Global rules for every task

- Owner-supplied files live in `reference/` (`Brand Guidelines.pdf`, `fiona and scott headhsots.zip` → `1.png` = Fiona, `2.png` = Scott, `gia.png` = Gia, `keith the mascot.png`). Never commit the zip or `reference/pngtree-*` (already git-ignored). All four face sources are reference/seed only; shipped raster art is generated with gpt-image-2.
- Brand palette: primary red `#E81E2C`, deep red `#B91526`, dark red `#8C111E`, navy `#233073`, grey `#6D7176`, white. Casino gold gradient `#7A5410 → #D4A437 → #FFE8A3`.
- No Chinese iconography or lettering anywhere (no red envelopes, lanterns, dragons, hanzi) — FR-012.
- The cat mascot is always called **Keith**. Neos is the Trust 'T' emblem, not a person.
- Each owner-gated phase ends on its own branch with a Vercel preview URL; do not start the next gate until the owner signs off in writing.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization so that review pages (US4) and the game can build and deploy to Vercel previews.

- [x] T001 Initialize a Vite + TypeScript 5.x project at repo root with pnpm: create `package.json` (name `trustroyale`, `"type": "module"`, engines `node >=22`), `tsconfig.json` (strict, `moduleResolution: "bundler"`, include `src`, `api`, `tests`), and `vite.config.ts` with a multi-page `build.rollupOptions.input` for `index.html`, `moodboard.html`, `assets.html`, `admin.html`
- [x] T002 Install runtime dependencies `pixi.js@^8`, `gsap@^3`, `howler@^2`, `@neondatabase/serverless`, and dev dependencies `vitest`, `@playwright/test`, `@types/howler`, `@vercel/node`, `@vercel/functions`, `typescript` in `package.json`; add scripts `dev` (`vite`), `build` (`tsc --noEmit && vite build`), `test` (`vitest run`), `test:e2e` (`playwright test`), `db:migrate` (`node scripts/migrate.mjs`), `assets:check` (`node scripts/check-manifest.mjs`)
- [x] T003 [P] Create the directory skeleton from plan.md → Project Structure with `.gitkeep` files where empty: `api/_lib/`, `api/cron/`, `api/admin/`, `db/migrations/`, `src/config/`, `src/game/`, `src/scene/`, `src/ui/`, `src/audio/`, `src/styles/`, `public/assets/`, `tests/unit/`, `tests/e2e/`, `scripts/`
- [x] T004 [P] Add `.env.example` listing every variable from contracts/spin-api.md and contracts/lead-api.md with blank values and one-line comments: `DATABASE_URL`, `SESSION_SECRET`, `IP_HASH_SALT`, `DAILY_SESSIONS_PER_IP=20`, `FORCE_REELS`, `CLAIM_PHONE`, `SHARPSPRING_ACCOUNT_ID`, `SHARPSPRING_SECRET_KEY`, `SHARPSPRING_FIELD_DISCOUNT`, `SHARPSPRING_FIELD_WIN_REF`, `SHARPSPRING_FIELD_SOURCE`, `CRON_SECRET`, `ADMIN_USER`, `ADMIN_PASSWORD`, `PRIVACY_URL`, `LEAD_RETENTION_DAYS=730`
- [x] T005 [P] Configure Vitest in `vitest.config.ts` (environment `node`, include `tests/unit/**/*.test.ts`) and Playwright in `playwright.config.ts` with four projects: phone portrait 390×844, phone landscape 844×390, iPad 1024×1366, desktop 1920×1080; `webServer` runs `pnpm dev`
- [x] T006 [P] Add `vercel.json` with `"framework": "vite"`, output `dist`, and `crons: [{ "path": "/api/cron/crm-sync", "schedule": "0 6 * * *" }]` — once a day, because Vercel Hobby rejects any cron expression that runs more than once per day (contracts/lead-api.md → Retry strategy)
- [ ] T007 Connect the GitHub repo `trustelectricheating-code/trustroyale` to a Vercel project on the **Hobby (free)** plan, confirm a preview deployment builds from a pushed branch, and record the preview URL pattern in `README.md` (FR-016)

**Checkpoint**: `pnpm build` passes and a branch push produces a Vercel preview URL.

---

## Phase 2: User Story 4 — Phased design sign-off (Priority: P1, process) — Delivery Phases A–C

**Goal**: The owner reviews, in order, a mood board, a full-screen visual mock, and a board of every asset, each at a Vercel preview URL, before any game logic is built (SC-005).

**Independent Test**: Each gate produces a URL the owner can open on a phone and a desktop (quickstart.md → Phase A, B, C). Each gate passes only on written owner approval.

### Gate A — Mood board (`/moodboard.html`)

- [x] T008 [P] [US4] Rebuild the Neos 'T' emblem as a master vector in `public/assets/emblem/neos.svg` from the emblem construction page of `reference/Brand Guidelines.pdf`: circle head dot above a rounded crossbar and rounded stem (capsule shapes), single-colour fill, `viewBox` square, no raster content
- [x] T009 [P] [US4] Produce one sample Scott face medallion in `public/assets/moodboard/scott-medallion.webp`: crop head-and-shoulders from `2.png` inside `reference/fiona and scott headhsots.zip`, cut out the background, place in a round gold-rimmed medallion on a red velvet disc (research.md → R4)
- [x] T010 [P] [US4] Render the Neos medallion in `public/assets/moodboard/neos-medallion-{red-on-cream,gold-on-red}.webp` using `public/assets/emblem/neos.svg` (depends on T008) in the same gold rim as T009, both colour variants so the owner can choose
- [x] T011 [P] [US4] Produce chip and filler-symbol style tests in `public/assets/moodboard/` (casino chips in red/gold/navy/white; cherry, seven, sweets in 2 styles each), all generated or CC0, logging source and licence in `public/assets/moodboard/SOURCES.md`
- [x] T012 [US4] Build `moodboard.html` (plus `src/styles/moodboard.css`) showing 2–3 directions side by side — e.g. "Monte Carlo Velvet", "Vegas Neon Gold", "Art Deco Royale" — each with palette swatches built on the brand reds + gold, "TRUST ROYALE" title type tests (display serif / Art Deco face + rounded sans UI face from Google Fonts, OFL), material references (velvet, gold, bulbs, glass), the Scott and Neos medallions, and chip + filler tests; readable on a 390×844 phone and a 1920×1080 desktop
- [x] T013 [US4] Serve Gate A locally with `pnpm dev` (the mood board is review-only and is not built or deployed to Vercel), show the owner `/moodboard.html`, and record the chosen direction verbatim in `specs/001-trust-royale-slots/decisions.md` — **stop until the owner picks a direction**

### Gate B — Look & feel mock (static `/`, no logic)

- [x] T014 [US4] Implement the layout engine in `src/scene/layout.ts`: design grids portrait 1080×1920 and landscape 1920×1080; background uses "cover", machine uses "contain" so the machine is never cropped and the screen is always full; export `computeLayout(width, height, safeAreaInsets)` returning positions/scales for marquee, paytable, machine, SPIN button, chip tray (research.md → R8)
- [x] T015 [P] [US4] Add base full-screen CSS in `src/styles/main.css`: `html, body` at `100dvw`/`100dvh`, `overflow: hidden`, `env(safe-area-inset-*)` padding, canvas absolutely fills the viewport, overlay layer for HTML UI; no scrollbars at any viewport from 320×568 to 3440×1440 (FR-001, SC-004)
- [x] T016 [US4] Build the static mock in `index.html` + `src/main.ts` + `src/scene/background.ts` + `src/scene/cabinet.ts`: a PixiJS 8 `Application` resized to the window, placing placeholder art in the chosen direction — portrait stack: marquee → paytable strip → machine (~70% height) → SPIN button → chip tray; landscape: machine centred full height, paytable as a lit side or top panel, décor filling the sides; lights may be static (depends on T014, T015)
- [x] T017 [P] [US4] Add Playwright screenshot test `tests/e2e/layout.spec.ts` that loads `/` at 320×568, 390×844, 844×390, 1024×1366, 1920×1080, 2560×1440 and 3440×1440 and asserts `document.documentElement.scrollWidth <= innerWidth`, `scrollHeight <= innerHeight`, and the canvas covers the full viewport; saves screenshots to `tests/e2e/__screenshots__/`
- [x] T018 [US4] Commit Gate B to branch `phase-b-mock`, show the owner the mock locally with `pnpm dev` together with the screenshots from T017, and record approval in `specs/001-trust-royale-slots/decisions.md` — **stop until the owner approves portrait and landscape composition**

### Gate C — Asset production + asset board (`/assets.html`)

- [x] T019 [US4] Create `public/assets/manifest.json` exactly per contracts/asset-manifest.md: `"version": 1`, `"groups": ["background", "cabinet", "symbols", "faces", "emblem", "fx", "ui", "fonts", "audio"]`, and one entry per key in the Required asset list with `status: "needed"`. Each entry's fields follow data-model.md → AssetEntry: `key` "Unique, e.g. `face.scott.closed`"; `status` one of `'needed' | 'placeholder' | 'draft' | 'approved'`; `source` one of `'supplied' | 'generated' | 'cc0' | 'licensed' | 'custom'`; `licence` "Required unless `supplied`"; `sourceUrl` string or null; `file` under `public/assets/`. Use the contract's group list, which data-model.md → AssetEntry now matches (including `emblem`)
- [x] T020 [P] [US4] Write `scripts/check-manifest.mjs` that fails if any asset has `status: "needed"` in a production build (`VERCEL_ENV === 'production'`), if any non-`supplied` asset lacks `licence`, or if any referenced `file` is missing under `public/assets/` (contracts/asset-manifest.md → Validation); wire it into `pnpm build`
- [x] T021 [P] [US4] Produce group 1 background assets `bg.portrait`, `bg.landscape`, `bg.bokeh`, `bg.curtain.left`, `bg.curtain.right` as WebP in `public/assets/background/` in the chosen direction; update manifest entries with status, source, licence, sourceUrl
- [x] T022 [P] [US4] Produce group 2 cabinet layers `cabinet.body`, `cabinet.glass`, `cabinet.reelWindow.mask`, `cabinet.trim.gold`, `cabinet.marquee` (TRUST ROYALE panel), `cabinet.bulb.on`, `cabinet.bulb.off`, `cabinet.spinButton.up`, `cabinet.spinButton.down`, `cabinet.spinButton.disabled` as layered WebP in `public/assets/cabinet/` (realistic metal, glass, bulbs, reflections — FR-012); update manifest
- [x] T023 [P] [US4] Produce group 3 filler symbols `sym.cherry`, `sym.seven`, `sym.sweets` each with a `.shine` variant, plus `sym.frame` (gold medallion rim) in `public/assets/symbols/`, generated or CC0 and restyled to match; update manifest
- [x] T024 [P] [US4] Produce group 4 faces: 12 files `face.{scott,fiona,keith}.{idle,half,closed,win}` in `public/assets/faces/` — generated with gpt-image-2 via Codex in a Monte Carlo casino look, using Scott (`2.png`), Fiona (`1.png`, zip) and Keith (`reference/keith the mascot.png`) as reference images only, never the photos as-is (see decisions.md); each in the gold-rimmed medallion; `half`/`closed` frames made by image edits of the generated `idle` frame so the face stays identical; `win` = big smile; manifest `source: "generated"`, `licence: "Trust Electric Heating — internal"`, prompts recorded
- [x] T024A [P] [US4] Produce Gia's group 4 face frames `face.gia.{idle,half,closed,win}` in `public/assets/faces/` — use `reference/gia.png` only as reference/seed for a gpt-image-2 Monte Carlo casino medallion generated under the same rules as Scott and Fiona; create required `idle`/`half`/`closed` frames by editing the generated idle frame so her face stays identical, plus the matching `win` frame; record generated source, internal licence and prompts in the manifest
- [x] T025 [P] [US4] Produce group 4b emblem: finalize `emblem.neos.svg` (from T008), render `emblem.neos.idle` (medallion in the colour variant chosen at Gate A) and `emblem.neos.pulse` (concentric heat-ring overlay from the brand ring motif) in `public/assets/emblem/`; update manifest with `source: "custom"`
- [x] T026 [P] [US4] Produce group 5 fx: `fx.chip.{red,gold,navy,white}` × 2 angles, `fx.coin`, `fx.sparkle`, `fx.confetti` atlas, `fx.glow`, `fx.lightbeam` in `public/assets/fx/`; update manifest
- [x] T027 [P] [US4] Produce group 6 UI art `ui.paytable.panel`, `ui.popup.win`, `ui.popup.retry`, `ui.mute.on`, `ui.mute.off`, `ui.play`, `logo.trust.white` in `public/assets/ui/`; update manifest
- [x] T028 [P] [US4] Select group 7 fonts (display Art Deco/serif for title, rounded sans for UI) from Google Fonts (OFL), self-host WOFF2 in `public/assets/fonts/`, add `@font-face` rules to `src/styles/main.css`; update manifest with licence `OFL-1.1`
- [x] T029 [P] [US4] Source group 8 audio from CC0 libraries (Kenney, Freesound CC0, Pixabay, Sonniss): `sfx.ambient.loop`, `sfx.button`, `sfx.reel.loop`, `sfx.reel.stop.{1,2,3}` (slightly different pitch), `sfx.nearmiss`, `sfx.win.small`, `sfx.win.big`, `sfx.chips`, `sfx.whoosh`; pack short SFX into one audio sprite (WebM/Opus + MP3 fallback) plus a separate ambient loop in `public/assets/audio/`; log each source URL and licence in the manifest (research.md → R7)
- [x] T030 [US4] Build `assets.html` + `src/assetBoard.ts`: reads `public/assets/manifest.json`, renders every asset in group order with its status badge, source and licence; images shown as thumbnails, face rows show all 4 frames plus a live blink preview, emblem row shows the pulse overlay, audio rows have play buttons (depends on T019)
- [x] T031 [US4] Deploy Gate C to branch `phase-c-assets`, send the owner the `/assets.html` URL, set each asset's manifest `status` to `approved` as the owner signs off, and record the sign-off in `specs/001-trust-royale-slots/decisions.md` — **stop until no asset is `needed` and all are `approved`**

**Checkpoint**: SC-005 met. Mood board, visual mock and asset board approved. Game logic work may begin.

---

## Phase 3: Foundational (Blocking Prerequisites for US1, US5, US3, US2)

**Purpose**: Shared config, database, session and scene plumbing every playable story depends on.

**⚠️ CRITICAL**: No playable story work can begin until this phase is complete.

- [x] T032 [P] Define symbols in `src/config/symbols.ts`: `type SymbolId = 'scott' | 'fiona' | 'gia' | 'keith' | 'neos' | 'cherry' | 'seven' | 'sweets'` ("Unique, lowercase"); `kind` `'face' | 'emblem' | 'filler'` where "`neos` is the only `emblem`"; `frames` per data-model.md: "Faces require `idle/half/closed/win`; emblem requires `idle` + `pulse` (ring overlay); fillers require `idle` only (plus optional `shine`)"; export `SYMBOL_IDS` in a fixed order and `SYMBOLS` record keyed by id, frame values are manifest keys
- [x] T033 [P] Define the paytable in `src/config/paytable.ts` with the seven rows from data-model.md → PaytableRule, in this precedence order: `scott-3` (scott:3, 20, blink), `fiona-3` (fiona:3, 20, blink), `gia-3` (gia:3, 20, blink), `keith-3` (keith:3, 15, blink), `keith-2-any` (keith:2 + any other symbol, 15, glow), `people-2-plus-1` (two of one face + one different face from scott/fiona/gia/keith, 15, glow), `neos-3` (neos:3, 10, pulse). Rules: "Counts must total 3; order-independent"; `discount` is `10 | 15 | 20`; `celebration` is `'blink' | 'pulse' | 'glow'`; precedence assigns semantic overlaps once, including Keith × 2 + Scott/Fiona/Gia to `keith-2-any`; each rule has a player-readable label
- [x] T034 Write `db/migrations/001_init.sql` creating tables exactly per data-model.md → Database: `sessions` (`id uuid PK`, `created_at timestamptz`, `spins_used smallint` with `CHECK (spins_used <= 4)` and ≥ 0, `won_spin_id uuid null` FK → spins, `ip_hash text`, `utm jsonb null`); `spins` (`id uuid PK`, `session_id uuid` FK → sessions, `spin_no smallint` 1–4 with `UNIQUE (session_id, spin_no)`, `reels text[]` length 3, `rule_id text null`, `discount smallint null` with `CHECK (discount IS NULL OR discount IN (10, 15, 20))`, `win_ref text null UNIQUE`, `created_at timestamptz`); `leads` (`id uuid PK`, `spin_id uuid` FK → spins `UNIQUE`, `win_ref`, `discount` with `CHECK (discount IN (10, 15, 20))`, `first_name`/`last_name text` 1–80 chars, `phone`, `email`, `postcode text` NOT NULL, `marketing_consent boolean` default false, `consent_text text`, `created_at timestamptz`, `crm_status` CHECK in `'pending' | 'synced' | 'failed'` default `'pending'`, `crm_attempts smallint` default 0, `crm_next_try_at timestamptz` default `now()` with an index on `(crm_status, crm_next_try_at)`, `crm_lead_id text null`, `crm_last_error text null`, `claimed_via` CHECK in `'form' | 'phone'`); after both tables exist add the FK `sessions.won_spin_id → spins.id` declared `DEFERRABLE INITIALLY DEFERRED` (required by the single-statement spin in data-model.md → spins)
- [x] T035 Write `scripts/migrate.mjs` that applies `db/migrations/*.sql` in filename order against `DATABASE_URL`, tracking applied files in a `schema_migrations` table; link Neon (EU region: London or Frankfurt) through the Vercel Marketplace integration so `DATABASE_URL` is set for Preview and Development; run `pnpm db:migrate` against a Neon dev branch (depends on T034)
- [x] T036 [P] Implement `api/_lib/db.ts`: export a `sql` tagged-template client from `@neondatabase/serverless` (HTTP driver) using `DATABASE_URL`. Do not add an interactive transaction helper: the HTTP driver cannot branch on an earlier query's result, so every multi-step write in this project is written as one SQL statement (CTE)
- [x] T037 [P] Implement `api/_lib/session.ts`: read/verify/issue the signed `tr_sid` cookie (HMAC-SHA256 with `SESSION_SECRET`), cookie flags "`HttpOnly`, `Secure`, `SameSite=Lax`", 90-day expiry; `getOrCreateSession(req, res)` inserts a `sessions` row on first visit with `ip_hash` = SHA-256 of IP + `IP_HASH_SALT` and `utm` from query params; the client never sees the raw session id
- [x] T038 [P] Implement `api/_lib/http.ts` with JSON response helpers and a uniform error shape `{ "error": "<code>" }` used by all endpoints
- [x] T039 [P] Implement the client asset loader in `src/assets.ts`: reads `public/assets/manifest.json`, builds PixiJS `Assets` bundles per group, loads everything except the `audio` group before first paint (audio loads after PLAY — research.md → R10)
- [x] T040 Implement the game state machine in `src/game/state.ts` with states `LANDING`, `IDLE`, `SPINNING`, `RESOLVING`, `LAST_CHANCE`, `WON`, `CLAIMED`, `GAME_OVER` and exactly the transitions in data-model.md → SpinResult state diagram, including `SPINNING ──network error──▶ IDLE` (spin not counted, never a win) and jumping straight to the server state on page load; expose a typed event emitter for UI and scene listeners

**Checkpoint**: Shared config, DB schema, session cookie, loader and state machine ready.

---

## Phase 4: User Story 1 — Spin and win a discount (Priority: P1) 🎯 MVP — Delivery Phase D (game)

**Goal**: The player taps SPIN, three reels stop left to right on a server-decided result, and sees either a "You've won X% off" popup or "So close — spin again!", within the 3 + 1 bonus spin limit.

**Independent Test**: Open the preview URL, spin repeatedly, and confirm every result matches a paytable rule with the correct discount or shows "spin again"; with `FORCE_REELS` confirm every win type and the Last Chance / game-over flow (quickstart.md → Phase D steps 1–3, 6, 7).

### Tests for User Story 1 ⚠️ write first, confirm they fail

- [x] T041 [P] [US1] Exhaustive evaluator test `tests/unit/evaluator.test.ts`: iterate all 8³ = 512 ordered reel combinations; assert each maps to exactly one rule or none; assert expected precedence-assigned row counts per research.md → R5 (`scott-3`: 1, `fiona-3`: 1, `gia-3`: 1, `keith-3`: 1, `keith-2-any`: 21, `people-2-plus-1`: 27, `neos-3`: 1, total wins 53). Cover every row with explicit examples. Assert Scott–Scott–Keith wins 15% through `people-2-plus-1`; Keith–Keith–Scott and Keith–Keith–Cherry map only to `keith-2-any`; Keith × 3 maps only to `keith-3`. Cover exclusions: Scott–Fiona–Gia, Scott–Keith–Neos and filler-only results lose; filler symbols never win outside the third slot of `keith-2-any` (SC-003)
- [x] T042 [P] [US1] Near-miss test in `tests/unit/nearMiss.test.ts`: `nearMiss` is true only on a losing spin where the payline holds exactly two eligible faces among Scott/Fiona/Gia/Keith but does not satisfy `people-2-plus-1`, or exactly two Neos (data-model.md → SpinResult). True: scott–scott–cherry, fiona–seven–fiona, gia–gia–neos, scott–fiona–neos, keith–scott–neos, neos–neos–sweets. False: seven–cherry–sweets, keith–cherry–seven, and every winning spin
- [x] T043 [P] [US1] RNG simulation test `tests/unit/rng.test.ts`: 100,000 spins with the reel RNG asserting win rate 10.35% ± 0.3% and each symbol frequency per reel ≈ 1/8; assert `FORCE_REELS` is ignored when `VERCEL_ENV === 'production'`
- [x] T044 [P] [US1] Win-reference test `tests/unit/winRef.test.ts`: format `TR-` + 6 chars from an alphabet with no `0/O/1/I`; 10,000 generated refs contain no ambiguous characters
- [x] T045 [P] [US1] Spin API handler test `tests/unit/api-spin.test.ts` against a Neon test branch (skip when `DATABASE_URL` unset): 3 losing spins then `bonusAvailable: true`; 4th spin `isBonus: true`; 5th spin → 403 `no_spins_left` with `state: "game_over"`; a win forces `spinsLeft: 0` and any further spin → 403 with `state: "won"`; 20 concurrent `POST /api/spin` on one session never exceed 4 rows in `spins` (SC-007); `strip[1]` always equals `reels`
- [x] T046 [P] [US1] Session API test `tests/unit/api-session.test.ts`: first call creates a session and returns `{ spinsLeft: 3, bonusAvailable: false, state: "idle", win: null }`; after a win returns `state: "won"` with `win: { spinId, winRef, ruleId, discount, reels }`; reload after game over returns `state: "game_over"`
- [x] T047 [P] [US1] Playwright flow `tests/e2e/spin.spec.ts` with `/api/session` and `/api/spin` mocked via `page.route`: PLAY → SPIN disables the button until the result shows; reels stop left to right; win mock shows "You've won 20% off your order" for scott-3; retry mock shows "So close — spin again!" and re-enables SPIN; counter goes 3 → 2 → 1 → 0 → Last Chance screen → game-over thank-you; a 500 shows "Machine hiccup, try again" and never a win; Space and Enter trigger a spin on desktop

### Implementation for User Story 1

- [x] T048 [P] [US1] Implement the pure evaluator in `src/game/evaluator.ts`: `evaluate(reels: [SymbolId, SymbolId, SymbolId]) → { rule: PaytableRule | null, nearMiss: boolean }`, counting symbols order-independently and applying the precedence from data-model.md; the two-plus-one rule accepts Scott/Fiona/Gia/Keith, and `keith-2-any` runs first so overlapping Keith × 2 + face results map once (makes T041, T042 pass)
- [x] T049 [P] [US1] Implement `api/_lib/rng.ts`: `spinReels()` returns a 3×3 `strip` where every cell is `SYMBOL_IDS[crypto.randomInt(8)]` (no weights); honour `FORCE_REELS` (comma-separated payline) only when `VERCEL_ENV !== 'production'`, replacing `strip[1]` (makes T043 pass)
- [x] T050 [P] [US1] Implement `api/_lib/winRef.ts`: `newWinRef()` returns `TR-` + 6 chars via `crypto.randomInt` from an unambiguous alphabet (no 0/O/1/I); callers retry on `UNIQUE` violation (makes T044 pass)
- [x] T051 [US1] Implement `GET /api/session` in `api/session.ts` per contracts/spin-api.md: get or create session, derive `spinsLeft`, `bonusAvailable`, `state` (`idle | last_chance | won | claimed | game_over`), and `win` object when won or claimed (`claimed` = a `leads` row exists for the winning spin) (depends on T036, T037; makes T046 pass)
- [x] T052 [US1] Implement `POST /api/spin` in `api/spin.ts` per contracts/spin-api.md: soft per-IP daily cap (`DAILY_SESSIONS_PER_IP`, count today's sessions with same `ip_hash`; `0` disables the cap) → 429 `rate_limited`; roll the reels (`spinReels()`), evaluate them, and generate `spinId` (`crypto.randomUUID()`) and, on a win, `winRef` **before** any DB call; then run the single CTE statement from data-model.md → spins (the `UPDATE sessions … RETURNING` feeding `INSERT INTO spins … SELECT … FROM s`) that increments `spins_used`, sets `won_spin_id` on a win and inserts the spin together. No row returned → 403 `no_spins_left` with `state`. `win_ref` `UNIQUE` violation → new `winRef`, rerun (max 3 tries). Spin 4 needs no extra check: it is only reachable while `won_spin_id IS NULL`. Assert `evaluate(reels)` equals `ruleId` before responding; return the full 200 body (`spinId`, `spinNo`, `reels`, `strip`, `outcome`, `ruleId`, `discount`, `winRef`, `nearMiss`, `spinsLeft`, `bonusAvailable`, `isBonus`); any other error → 500 `server_error` (the statement rolled back, so the spin is not counted) (depends on T048–T051; makes T045 pass)
- [x] T053 [P] [US1] Implement the client API wrapper in `src/game/api.ts`: `getSession()` and `spin()` with typed responses matching contracts/spin-api.md, mapping 403/429/500 and network failures to typed errors (never a win)
- [x] T054 [US1] Implement reels in `src/scene/reels.ts`: three reel columns masked by `cabinet.reelWindow.mask`, 3-row window with the middle-row payline (FR-002), GSAP timelines for spin-up, blur loop, staggered left-to-right stops with slight overshoot, landing exactly on the server `strip`; fake cylinder curvature with a shading overlay (research.md → R1)
- [x] T055 [US1] Implement face and emblem celebrations in `src/scene/faces.ts`: `blink` plays `idle → half → closed → half → idle` over ~180 ms, 2–3 times, on all three faces; `pulse` plays concentric `emblem.neos.pulse` rings radiating outward plus warm glow; `glow` highlights only the contributing symbols; `win` frame shown after blink (FR-005, research.md → R4)
- [x] T056 [US1] Implement SPIN control and spins-left counter in `src/ui/controls.ts`: SPIN button (no lever — FR-006) with `cabinet.spinButton.up/down/disabled` states, disabled during `SPINNING`/`RESOLVING`; Space/Enter keyboard spin on desktop; visible counter "Spins left: N" (FR-014); PLAY button that moves `LANDING → IDLE`
- [x] T057 [US1] Implement result popups in `src/ui/popup.ts` as accessible HTML dialogs: win popup ("You've won {discount}% off your order", "One voucher per order", win reference) with a placeholder slot for claim options filled by US5; retry toast "So close — spin again!" (with a stronger tease when `nearMiss`); "Last Chance!" screen offering one bonus spin; game-over thank-you (no discount); "Machine hiccup, try again" on 500/network error; "Come back tomorrow" on 429
- [x] T058 [US1] Wire everything in `src/main.ts`: load assets (T039), build scene (layout, background, cabinet, reels), call `getSession()` on load and jump to the returned state (including showing a returning winner's popup), connect SPIN → `spin()` → reel animation → celebration → popup via the state machine; store a display copy of the current win in `localStorage` (depends on T048–T057; makes T047 pass)
- [ ] T059 [US1] Deploy to branch `phase-d-game`, run quickstart.md → Phase D manual steps 1–3, 6, 7 on the preview with `FORCE_REELS` set to `keith,keith,keith` (15%), `gia,gia,gia` (20%), `scott,scott,keith` (two-plus-one, 15%), `neos,neos,neos` (10%) and `seven,cherry,sweets` (loss) in turn, and record results in `specs/001-trust-royale-slots/decisions.md`

**Checkpoint**: MVP. The game is playable with server-decided outcomes and the 3 + 1 spin limit.

---

## Phase 5: User Story 5 — Claim the discount (Priority: P1) — Delivery Phase D (leads)

**Goal**: After a win the player can call Trust quoting their win reference or submit a short form; every form lead is written to Neon first and then reaches SharpSpring, with automatic retry. Staff can verify phone claims.

**Independent Test**: Win with forced reels on a preview, submit the form, confirm the Neon row has the server-verified discount and the lead appears in SharpSpring; repeat with a broken SharpSpring key and confirm the row stays `pending` then syncs after the cron runs (quickstart.md → Phase D steps 4–5).

**Owner input needed at the start of this phase**: ask the owner for SharpSpring API credentials (account ID + secret key) and to create the custom fields for discount, win reference and source. Do not ask earlier.

### Tests for User Story 5 ⚠️ write first, confirm they fail

- [ ] T060 [P] [US5] Validation tests `tests/unit/validate.test.ts`: `first_name`/`last_name` "Required, 1–80 chars"; `phone` "Required, UK format validated" (accepts `07700 900123`, `+44 7700 900123`; rejects `12345`); `email` "Required, validated"; `postcode` "Required, UK postcode format" (accepts `LS1 4AP`; rejects `ABC`); `marketingConsent` boolean; field-level error map matches the 400 body shape
- [ ] T061 [P] [US5] SharpSpring client tests `tests/unit/sharpspring.test.ts` with mocked `fetch`: builds the `createLeads` JSON-RPC body per contracts/lead-api.md (custom field names from `SHARPSPRING_FIELD_*`, source "Trust Royale", phone with spaces stripped); success = `result.creates[0].success == true` returning the lead id; duplicate-email response triggers `updateLeads` and counts as synced; HTTP/API errors return a failure with message
- [ ] T062 [P] [US5] Lead API tests `tests/unit/api-lead.test.ts` against a Neon test branch: valid submit → 201 `{ ok: true, winRef }` and a `leads` row with `crm_status = 'pending'` whose `discount`/`win_ref` come from the spin row even if the request body contains a fake `discount`; second submit → 200 with `duplicate: true` and still one row; made-up `spinId` or a losing spin → 403 `not_a_win`; spin owned by another session → 403; non-empty `website` honeypot → 201 but no row; invalid fields → 400 with `fields`; SharpSpring mocked to fail still returns 201
- [ ] T063 [P] [US5] Retry tests `tests/unit/api-cron.test.ts`: missing/incorrect `Authorization: Bearer ${CRON_SECRET}` → 401; `retryDueLeads(n)` picks at most `n` leads with `crm_status = 'pending'` and `crm_next_try_at <= now()` and ignores leads not yet due; two concurrent `retryDueLeads` calls never send the same lead twice (`FOR UPDATE SKIP LOCKED`); success → `synced` with `crm_lead_id`; failure → `crm_attempts + 1`, `crm_last_error` set, `crm_next_try_at` pushed back per the 5 min / 15 min / 1 h / 6 h backoff; 10th failure → `failed`; a SharpSpring failure during the traffic-driven retry after `/api/spin` does not change the spin response
- [ ] T064 [P] [US5] Playwright flow `tests/e2e/claim.spec.ts` with mocked APIs: win popup shows "Call to claim" as a `tel:` link and "Claim online"; consent checkbox is unticked by default and a privacy link is present; client validation blocks bad phone/postcode; successful submit shows the thank-you message; tapping "Call to claim" keeps the win reference visible; at 320×568 the page itself does not scroll but the popup scrolls internally so every field, the consent checkbox and the submit button can be reached

### Implementation for User Story 5

- [ ] T065 [P] [US5] Implement shared validation in `api/_lib/validate.ts` (imported by `src/ui/claimForm.ts` too): exact rules from data-model.md → `leads` quoted in T060 (makes T060 pass)
- [ ] T066 [P] [US5] Implement the SharpSpring client in `api/_lib/sharpspring.ts`: `POST https://api.sharpspring.com/pubapi/v1.2/?accountID=…&secretKey=…` JSON-RPC `createLeads` with `firstName`, `lastName`, `emailAddress`, `phoneNumber`, `zipcode`, `leadStatus: "open"`, custom fields from `SHARPSPRING_FIELD_DISCOUNT`, `SHARPSPRING_FIELD_WIN_REF`, `SHARPSPRING_FIELD_SOURCE` (value "Trust Royale"), `id` = lead uuid; on duplicate email fall back to `updateLeads`; export `syncLead(leadId)` that sends and updates `crm_status`, `crm_attempts`, `crm_lead_id`, `crm_last_error`, and on failure sets `crm_next_try_at = now() + backoff` (5 min, 15 min, 1 h, then 6 h), setting `failed` after 10 attempts (makes T061 pass)
- [ ] T067 [US5] Implement `POST /api/lead` in `api/lead.ts` following contracts/lead-api.md → Processing order exactly: (1) validate, (2) load the spin — must belong to this session and have `rule_id` not null, `discount`/`win_ref` from the spin row, (3) insert into `leads` with `crm_status = 'pending'`, `claimed_via = 'form'`, `consent_text` = exact wording shown, and commit, (4) respond 201 (or 200 duplicate on `UNIQUE (spin_id)` conflict), (5) `waitUntil(syncLead(id))` from `@vercel/functions`; honeypot `website` non-empty → 201 without insert (depends on T065, T066; makes T062 pass)
- [ ] T068 [US5] Implement the layered retry from contracts/lead-api.md → Retry strategy: (a) `retryDueLeads(limit)` in `api/_lib/crmRetry.ts` that claims due leads with `UPDATE leads SET crm_next_try_at = now() + interval '2 minutes' WHERE id IN (SELECT id FROM leads WHERE crm_status = 'pending' AND crm_next_try_at <= now() ORDER BY crm_next_try_at LIMIT $1 FOR UPDATE SKIP LOCKED) RETURNING id` and calls `syncLead` for each sequentially; (b) `GET /api/cron/crm-sync` in `api/cron/crm-sync.ts`: verify `Authorization: Bearer ${CRON_SECRET}`, call `retryDueLeads(50)`, then run the cleanup from data-model.md → Data retention in one statement per rule (delete non-winning sessions and their spins older than 90 days; null `ip_hash` older than 2 days; delete `synced` leads with their spin and session older than `LEAD_RETENTION_DAYS`; never touch `pending` or `failed` leads), return `{ sent, failed, remaining, cleaned }`; (c) traffic piggyback: in `api/session.ts` and `api/spin.ts` add `waitUntil(retryDueLeads(5).catch(() => {}))` after the response, skipped when `SHARPSPRING_ACCOUNT_ID` is unset (depends on T066; makes T063 pass)
- [ ] T069 [US5] Implement the claim UI in `src/ui/claimForm.ts` and fill the win-popup slot from T057: "Call to claim" `tel:` link to `CLAIM_PHONE` (exposed to the client via a `VITE_CLAIM_PHONE` build var) with the win reference kept visible; "Claim online" form with first name, last name, phone, email, postcode, marketing consent checkbox **unticked by default**, privacy notice link to `PRIVACY_URL`, hidden `website` honeypot; client validation via `api/_lib/validate.ts`; on success show thank-you and move state `WON → CLAIMED` the page never scrolls (FR-001) but the popup body uses `overflow-y: auto` with a `max-height` inside the safe area so the whole form is reachable at 320×568 (FR-013, FR-017; makes T064 pass)
- [ ] T070 [P] [US5] Implement staff lookup `GET /api/admin/win/[winRef].ts` in `api/admin/win/[winRef].ts`: HTTP Basic auth with `ADMIN_USER`/`ADMIN_PASSWORD`; returns `{ winRef, discount, wonAt, claimed, claimedVia }` or 404 (FR-020)
- [ ] T071 [P] [US5] Implement staff phone claim `POST /api/admin/win/[winRef]/claim` in `api/admin/win/[winRef]/claim.ts`: Basic auth; body `{ via: "phone", firstName, lastName, phone, email, postcode }`; validated with `api/_lib/validate.ts`; inserts the lead with `claimed_via = 'phone'` through the same insert-then-`waitUntil(syncLead)` path; 409 if already claimed
- [ ] T072 [P] [US5] Implement `GET /api/admin/leads.csv` in `api/admin/leads.csv.ts`: Basic auth; `?status=failed|all`; CSV with all `leads` columns for backup and manual entry of failed syncs
- [ ] T073 [US5] Build `admin.html` + `src/admin.ts`: win-reference lookup form showing discount, won-at and claimed status, a phone-claim form, and CSV download links for `failed` and `all` (depends on T070–T072)
- [ ] T074 [US5] With the owner's SharpSpring credentials in Vercel Preview env vars, call SharpSpring `getFields` to confirm the custom field system names, set `SHARPSPRING_FIELD_*`, then run quickstart.md → Phase D steps 4–5 on the preview (win → submit → row `synced` → lead visible in SharpSpring; wrong secret key → row stays `pending` → fix key → call `/api/cron/crm-sync` with `CRON_SECRET` → `synced`); record results in `specs/001-trust-royale-slots/decisions.md`

**Checkpoint**: Wins become leads in Neon and SharpSpring; phone claims are verifiable by staff.

---

## Phase 6: User Story 3 — Understand the prizes (Priority: P2)

**Goal**: A paytable at the top of the screen shows what wins what, with face icons and percentages, and highlights the matching row on a win.

**Independent Test**: On portrait phone and landscape desktop all seven paytable rules are readable at the top of the screen; forcing a win highlights the matching row (quickstart.md → Phase B viewports).

- [ ] T075 [P] [US3] Playwright test `tests/e2e/paytable.spec.ts`: at 390×844 the compact paytable is visible above the reels and expands to full detail on tap; at 1920×1080 all seven rules (from `src/config/paytable.ts`) show with face icons and percentages; after a mocked `keith-2-any` win the "Keith × 2 + any" row has the highlighted state
- [ ] T076 [US3] Implement `src/ui/paytable.ts`: render rows from `src/config/paytable.ts` (single source of truth) using `ui.paytable.panel` art and symbol icons, ordered by discount; compact strip in portrait with an expand/collapse control (accessible button, `aria-expanded`), full lit panel in landscape; position driven by `computeLayout` from `src/scene/layout.ts` (FR-008)
- [ ] T077 [US3] Subscribe `src/ui/paytable.ts` to the state machine: on `WON` highlight the row whose `id` equals the result `ruleId` (glow + pulse), clear on reload into a non-won state (makes T075 pass)

**Checkpoint**: Players can read prizes before spinning; the winning rule is highlighted.

---

## Phase 7: User Story 2 — Arrival spectacle (Priority: P2) — Delivery Phase E

**Goal**: Chasing TRUST ROYALE marquee bulbs, levitating chips that fall and scatter on PLAY, and casino audio with a persistent mute.

**Independent Test**: Load the page; chips hover and bob with no interaction and lights chase; press PLAY; chips fall with gravity and ambient sound starts; mute persists after reload (quickstart.md → Phase E).

- [ ] T078 [P] [US2] Playwright test `tests/e2e/arrival.spec.ts`: before PLAY no audio context is running and chips are animating (sample sprite positions over 1 s differ); after PLAY the state is `IDLE`; mute toggle writes `localStorage` and the muted state survives reload; with `reducedMotion: 'reduce'` the page still reaches `IDLE` and a spin still resolves
- [ ] T079 [P] [US2] Implement the marquee in `src/scene/marquee.ts`: "TRUST ROYALE" on `cabinet.marquee` framed by `cabinet.bulb.on/off` sprites; GSAP bulb-chase timeline with idle, spin (faster) and win (flash) patterns (FR-009)
- [ ] T080 [P] [US2] Implement chips in `src/scene/chips.ts`: `fx.chip.*` sprites levitate with slow bob and rotation indefinitely on `LANDING`; on PLAY they fall with gravity and bounce, then pile at the bottom tray or leave the screen; auto-reduce particle count when frame time exceeds 20 ms (FR-010, research.md → R10)
- [ ] T081 [P] [US2] Implement audio in `src/audio/sound.ts`: Howler wrapper loading the SFX sprite and ambient loop only after the PLAY gesture; functions `play(name)` for `button`, `reel.loop`, `reel.stop.1/2/3`, `nearmiss`, `win.small`, `win.big`, `chips`, `whoosh`, and `ambient.start()`; `setMuted(bool)` persisted to `localStorage`; game works silently if audio is blocked (FR-011)
- [ ] T082 [US2] Add the mute toggle to `src/ui/controls.ts` using `ui.mute.on/off` art, reading the saved state on load (depends on T081)
- [ ] T083 [US2] Wire the arrival sequence in `src/main.ts`: `LANDING` shows floating chips + chasing marquee + PLAY; PLAY unlocks audio, starts ambient, drops chips (`sfx.chips`), and moves to `IDLE`; hook reel/stop/win/near-miss/popup sounds and marquee patterns to state events; add confetti/coin burst (`fx.confetti`, `fx.coin`, `fx.sparkle`) on win, `win.big` for 20% and `win.small` for 10–15% (depends on T079–T082; makes T078 pass)
- [ ] T084 [US2] Honour `prefers-reduced-motion` across `src/scene/marquee.ts`, `src/scene/chips.ts`, `src/scene/faces.ts` and `src/scene/reels.ts`: static or slow bulb glow instead of chase, chips fade/settle without bobbing, shorter spin with no blur, no confetti; spins still resolve (FR-015)
- [ ] T085 [US2] Deploy to branch `phase-e-polish` and run quickstart.md → Phase E steps 1–3 (Chrome devtools CPU 4× slowdown + mobile emulation ≥ 30 fps; real mid-range phone ≥ 55 fps); tune particle counts/filters until met; record results in `specs/001-trust-royale-slots/decisions.md` (SC-002)

**Checkpoint**: Full casino feel; audio and reduced-motion behave correctly.

---

## Phase 8: Polish, Cross-Cutting Concerns & Launch — Delivery Phase F

**Purpose**: Performance budget, security, and launch readiness.

**Owner input needed at the start of this phase**: claim phone number, privacy policy URL, terms and conditions. Do not ask earlier.

- [ ] T086 [P] Add a bundle-size check `scripts/check-budget.mjs` wired into `pnpm build`: fail if JS gzip > 250 KB or pre-PLAY transfer (JS + CSS + non-audio assets) > 4 MB; convert remaining large images to WebP/AVIF texture atlases (research.md → R10)
- [ ] T087 [P] Security pass across `api/`: confirm `FORCE_REELS` is ignored when `VERCEL_ENV === 'production'`, all admin routes require Basic auth, cron requires `CRON_SECRET`, no raw IPs stored (only salted `ip_hash`), no personal data logged, `tr_sid` cookie flags correct; add `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy` headers in `vercel.json`
- [ ] T088 [P] Accessibility pass in `src/ui/`: popups are focus-trapped dialogs with `aria-live` result announcements, all buttons keyboard reachable with visible focus, form labels and error messages linked via `aria-describedby`, colour contrast ≥ 4.5:1 on UI text
- [ ] T089 [P] Update `README.md` with local setup (`pnpm install`, `vercel env pull`, `pnpm db:migrate`, `vercel dev`), test commands, env var list, phase branch convention, and staff instructions for `/admin.html`
- [ ] T090 Fill in owner-supplied launch content: set `CLAIM_PHONE`/`VITE_CLAIM_PHONE` and `PRIVACY_URL` in Vercel Production env, add terms copy (one voucher per order, expiry) to the win popup in `src/ui/popup.ts`, and set the exact consent wording used in `consent_text` in `src/ui/claimForm.ts`; ask the owner for the lead retention period and set `LEAD_RETENTION_DAYS` in Vercel Production env (data-model.md → Data retention); ask whether `DAILY_SESSIONS_PER_IP=20` should be raised or set to `0` for the audience
- [ ] T091 Create the Neon production branch, run `pnpm db:migrate` against it, set production SharpSpring and all secrets in Vercel Production env, attach the production domain, confirm the daily `crm-sync` cron appears in the Vercel dashboard, ask the owner whether to enable the optional free cron-job.org pinger (every 15 min → `/api/cron/crm-sync` with the `CRON_SECRET` bearer header; the secret only triggers retries and exposes no lead data), and confirm the owner's Vercel plan decision (Hobby by default; Pro before any public commercial launch — research.md → R6)
- [ ] T092 Run quickstart.md → Phase F steps 1–5 on the production deployment (Lighthouse mobile LCP < 2.5 s and ≤ 4 MB before PLAY; win → refresh keeps win reference and claim options with SPIN locked; `FORCE_REELS` ignored; `/admin.html` finds a win reference and CSV downloads) and run the full `pnpm test` + `pnpm test:e2e` suite; record results in `specs/001-trust-royale-slots/decisions.md`, then request owner go-live

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **US4 Design sign-off (Phase 2)**: Depends on Setup. Gates A → B → C are strictly sequential, each blocked on written owner approval (T013, T018, T031). **Blocks all game logic** (SC-005).
- **Foundational (Phase 3)**: Depends on Gate C sign-off (T031). Config tasks T032–T033 and DB schema T034 may be drafted during Gate C but must not be merged before sign-off. Blocks all playable stories.
- **US1 (Phase 4)**: Depends on Foundational. MVP.
- **US5 (Phase 5)**: Depends on US1 (needs real winning spins and the win popup from T057) and on owner SharpSpring credentials.
- **US3 (Phase 6)**: Depends on Foundational and the popup/state events from US1; independent of US5.
- **US2 (Phase 7)**: Depends on Foundational and the scene from US1; independent of US5 and US3.
- **Polish & Launch (Phase 8)**: Depends on all stories plus owner launch inputs.

### User Story Dependencies

```text
Setup ─▶ US4 (A ─▶ B ─▶ C) ─▶ Foundational ─▶ US1 ─┬─▶ US5 ─┐
                                                   ├─▶ US3 ─┼─▶ Polish & Launch
                                                   └─▶ US2 ─┘
```

### Within Each User Story

- Tests first and failing, then implementation.
- Config/lib before endpoints; endpoints before UI wiring.
- Each gate or checkpoint deploys to a preview before moving on.

### Parallel Opportunities

- Setup: T003–T006 in parallel.
- Gate A: T008, T009, T011 in parallel (T010 after T008).
- Gate B: T015 and T017 alongside T014/T016.
- Gate C: all asset groups T021–T029 in parallel after T019; T020 alongside.
- Foundational: T032, T033, T036, T037, T038, T039 in parallel.
- US1: all tests T041–T047 in parallel; T048, T049, T050, T053 in parallel.
- US5: all tests T060–T064 in parallel; T065, T066 in parallel; admin endpoints T070–T072 in parallel.
- After US1: US3 and US2 can run in parallel with US5.
- Polish: T086–T089 in parallel.

---

## Parallel Example: Gate C assets (US4)

```bash
Task: "Produce group 1 background assets in public/assets/background/"   # T021
Task: "Produce group 2 cabinet layers in public/assets/cabinet/"          # T022
Task: "Produce Scott/Fiona/Keith face frames in public/assets/faces/"    # T024
Task: "Produce Gia face frames in public/assets/faces/"                  # T024A
Task: "Produce group 4b emblem in public/assets/emblem/"                  # T025
Task: "Source group 8 audio into public/assets/audio/"                    # T029
```

## Parallel Example: User Story 1

```bash
# Tests together:
Task: "Exhaustive evaluator test in tests/unit/evaluator.test.ts"        # T041
Task: "RNG simulation test in tests/unit/rng.test.ts"                    # T043
Task: "Spin API handler test in tests/unit/api-spin.test.ts"             # T045
Task: "Playwright spin flow in tests/e2e/spin.spec.ts"                   # T047

# Pure libraries together:
Task: "Evaluator in src/game/evaluator.ts"                               # T048
Task: "Reel RNG in api/_lib/rng.ts"                                      # T049
Task: "Win reference in api/_lib/winRef.ts"                              # T050
Task: "Client API wrapper in src/game/api.ts"                            # T053
```

## Parallel Example: User Story 5

```bash
Task: "Validation in api/_lib/validate.ts"                               # T065
Task: "SharpSpring client in api/_lib/sharpspring.ts"                    # T066
Task: "Staff lookup in api/admin/win/[winRef].ts"                        # T070
Task: "Staff phone claim in api/admin/win/[winRef]/claim.ts"             # T071
Task: "CSV export in api/admin/leads.csv.ts"                             # T072
```

---

## Implementation Strategy

### MVP First

1. Phase 1 Setup.
2. Phase 2 US4 — get owner sign-off on mood board, mock and assets (required before any logic).
3. Phase 3 Foundational.
4. Phase 4 US1 — **STOP and VALIDATE**: playable game with server-decided spins on a preview URL.

### Incremental Delivery

1. Setup + US4 gates → approved design and assets.
2. Foundational + US1 → playable MVP (Delivery Phase D, game).
3. US5 → wins become leads in Neon and SharpSpring (Delivery Phase D, leads).
4. US3 → paytable at the top with win highlight.
5. US2 → full arrival spectacle and audio (Delivery Phase E).
6. Polish & Launch (Delivery Phase F) → owner go-live.

### Delegation

Per plan.md, implementation work is handed to codex one delivery phase at a time; Claude writes each brief from this file and QA-checks the result against the phase's checkpoint and quickstart.md before asking the owner for sign-off.

---

## Notes

- [P] tasks touch different files and have no dependencies on incomplete tasks.
- [Story] labels map tasks to spec.md user stories for traceability.
- Owner inputs are requested only at the phase that needs them: SharpSpring at the start of Phase 5, phone/privacy/terms at the start of Phase 8.
- Record every owner decision and gate result in `specs/001-trust-royale-slots/decisions.md`.
- Commit after each task or logical group; never commit `reference/*.zip`, `reference/pngtree-*` or `.env*` files.
