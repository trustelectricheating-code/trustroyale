# Phases 5–8 Delivery Report

Branch: `phase-d-game`

## Delivery status

The Phase 4 QA fixes and tasks T074A, T075–T084, and T086–T089 are complete. T085 and T090–T092 remain unticked because deployment, production configuration, preview performance checks, final terms, and owner launch decisions are explicitly outside this brief.

## Phase 4 QA fixes

- The live SPIN control now shows exactly one label in every game state. The button artwork supplies SPIN after PLAY; the DOM label remains available for PLAY and accessibility without overdrawing the artwork.
- The three live reels keep the server-provided middle-row payline, enlarge and centre that row, show only smooth partial neighbouring rows, and fade into soft cylinder shading without hard horizontal bars.
- The win popup's former empty claim area is now occupied by the coupon ticket.
- Playwright assertions cover the single visible SPIN treatment. Unit coverage records the reel row geometry. Updated idle and mid-spin QA captures were committed separately.

## Phase 5 — predefined coupon

- `api/_lib/coupons.ts` maps 10%, 15%, and 20% wins to `COUPON_CODE_10`, `COUPON_CODE_15`, and `COUPON_CODE_20`, with temporary `ROYALE10`, `ROYALE15`, and `ROYALE20` fallbacks.
- Winning spin and restored session responses include `couponCode`; losses return `null`. The browser types, API contract, API handler tests, and mocked browser flows use the same contract.
- The win dialog shows a gold coupon ticket, selectable code, Clipboard API copy action, visible “Copied!” confirmation, selection fallback, redemption instruction, and win reference. A returning winner sees the same server-provided code and cannot spin again.
- The production build scans `dist/` and fails if any fallback coupon code enters the client bundle.
- The unused Vercel cron declaration and empty `api/cron` and `api/admin` stubs were removed. T060–T074 are marked removed and T074A records the replacement.

**Deployment warning:** `ROYALE10`, `ROYALE15`, and `ROYALE20` are placeholders, not production coupon codes. Set all three `COUPON_CODE_*` variables before a real campaign launch.

## Phase 6 — prize understanding

- `src/ui/paytable.ts` extends the approved Gate B featured-prize carousel and “See all prizes” overlay instead of replacing them.
- The compact portrait panel remains visible above the reels and exposes an accessible `aria-expanded` control. The desktop overlay renders all seven rules from `src/config/paytable.ts`, with the approved symbol art and percentages.
- A winning rule receives a persistent glow and pulse. The win dialog's “View prize table” action opens the overlay directly on the highlighted row; the `keith-2-any` browser test proves this path.
- Layout remains driven by `computeLayout`, and the panel uses the approved `ui.paytable.panel` artwork.

## Phase 7 — arrival spectacle

- `src/scene/marquee.ts` animates the existing belly-panel bulbs with GSAP idle chase, faster spin chase, and win flash patterns. Reduced motion uses a slow, steady glow.
- `src/scene/chips.ts` animates the approved Neos-chip artwork in place during LANDING, reduces the visible count after sustained frames above 20 ms, and gently settles every chip inside the viewport on PLAY. No chip enters from or leaves the screen.
- `src/audio/sound.ts` lazily creates Howler effects and ambient audio only after the PLAY gesture. It covers button, reel loop, three reel stops, near miss, small/big win, chips, whoosh, and ambient playback, fails silently when audio is blocked, and persists mute state in `localStorage`.
- The mute control uses the approved on/off art. Reel, win, near-miss, popup, marquee, chip, confetti, coin, and sparkle events are wired through the game flow.
- Reduced motion removes chip bobbing, reel blur, animated face celebration, and win particles while preserving PLAY and spin resolution.

## Phase 8 — polish and launch readiness

- `scripts/check-budget.mjs` runs after every production build. Current totals are **225.1 KB gzip for all JavaScript** against the 250 KB limit and **2.60 MB pre-PLAY transfer** against the 4 MB limit. The primary game chunk is 464.00 KB raw / 150.35 KB gzip; the game stylesheet is 14.85 KB raw / 4.32 KB gzip. Existing WebP, SVG, and WOFF2 assets pass the budget, so no further image conversion was needed.
- Initial Pixi loading now requests only the symbols, faces, emblem, and FX bundles needed before PLAY. Audio remains gesture-gated.
- Security checks prove that production ignores `FORCE_REELS`, visitor IPs are salted and hashed, `tr_sid` uses `HttpOnly; Secure; SameSite=Lax`, API handlers do not log request/error payloads, and Vercel adds CSP, `X-Content-Type-Options`, and `Referrer-Policy` headers.
- Result dialogs announce assertively, trap Tab focus, focus their heading on open, retain visible keyboard focus, and meet the tested 4.5:1 button-text contrast threshold.
- `README.md` documents local setup, test commands, current environment variables, the test-database rule, and phase branch convention.

Admin-route authentication, cron authentication, claim-form labels/errors, and staff `/admin.html` instructions were skipped because the owner removed those endpoints and the form in favour of predefined coupons. The unused `leads` table remains in `db/migrations/001_init.sql` as required.

## Environment required for deployment

- `DATABASE_URL`: pooled Neon Postgres URL.
- `SESSION_SECRET`: at least 32 random bytes.
- `IP_HASH_SALT`: secret salt for IP hashing.
- `DAILY_SESSIONS_PER_IP`: daily session cap; defaults to `20`, while `0` disables the cap.
- `COUPON_CODE_10`, `COUPON_CODE_15`, `COUPON_CODE_20`: real campaign coupon codes. All three currently fall back to placeholders and must be replaced before launch.
- `FORCE_REELS`: optional for preview testing only; production ignores it.

`TEST_DATABASE_URL` is optional and test-only. It was unset during this run, so the disposable Neon integration case was skipped. Tests never read `DATABASE_URL`.

## Verification

- `pnpm build`: passed. The 74-entry manifest, TypeScript, Vite build, coupon-leak scan, 250 KB JavaScript gzip budget, and 4 MB pre-PLAY budget all passed.
- `pnpm test`: 74 cases across 21 files; 73 passed and the optional `TEST_DATABASE_URL` case was skipped.
- `pnpm exec tsc --noEmit`: passed.
- Full Playwright suite with one worker: 13 tests passed in 4.1 minutes, covering asset board, seven-viewport layout, spin states, coupons, returning winners, paytable, arrival audio/mute, reduced motion, accessibility, and capture output.
- `git diff --check`: passed.

## Review captures

`reference/_work/phase-d/` contains:

- `landing-1920x1080.png` and `landing-390x844.png`: floating chips and active bulbs.
- `coupon-copied-1920x1080.png` and `coupon-copied-390x844.png`: coupon dialog with visible “Copied!” state.
- `returning-winner-1920x1080.png` and `returning-winner-390x844.png`: restored winner and locked game.
- `prize-highlight-1920x1080.png` and `prize-highlight-390x844.png`: all-prizes overlay with the winning Keith row highlighted.
- `win-popup-320x568.png`: the complete win dialog fits the viewport and the page does not scroll.

No deployment, push, Vercel command, Neon command, remote database write, `.env.local` access, or port 5173 process change was performed.
