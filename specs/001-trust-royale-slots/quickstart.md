# Quickstart & Validation: Trust Royale

How to run the project and prove each delivery phase works. Implementation details live in `tasks.md` (created by `/speckit-tasks`).

## Prerequisites

- Node.js 22 LTS, pnpm (or npm)
- Vercel CLI (`npm i -g vercel`), linked to the `trustelectricheating-code/trustroyale` project
- Neon database linked through the Vercel Marketplace integration (sets `DATABASE_URL`); run `pnpm db:migrate`
- Env vars from [contracts/spin-api.md](./contracts/spin-api.md#environment-variables) and [contracts/lead-api.md](./contracts/lead-api.md#environment-variables) in `.env.local` (use `vercel env pull`)

## Run locally

```bash
pnpm install
vercel dev          # serves the Vite app and /api/spin together on http://localhost:3000
```

## Validation per phase

Each phase is pushed to its own branch; Vercel builds a preview URL the owner reviews on a phone and a desktop. Next phase starts only after sign-off.

### Phase A — Mood board (`/moodboard.html`)
1. Open the preview URL on a phone and a desktop.
2. Expect: 2–3 visual directions, each with palette swatches (brand reds + gold), type samples with "TRUST ROYALE", material references (velvet, gold, bulbs, glass), a sample face medallion (Scott), the rebuilt Neos 'T' emblem medallion, chip and filler-symbol style tests.
3. Pass: owner picks one direction in writing.

### Phase B — Look & feel mock (`/`, static, no logic)
1. Open at phone portrait (390×844), phone landscape (844×390), iPad (1024×1366) and desktop (1920×1080, 2560×1440).
2. Expect: full-screen composition, no scrollbars, no empty bars; marquee, paytable, machine, SPIN button, chips all placed; lights may be static.
3. Pass: owner approves composition for portrait and landscape.

### Phase C — Asset board (`/assets.html`)
1. Open the page. Every asset from [contracts/asset-manifest.md](./contracts/asset-manifest.md) appears in group order with status badge, source and licence.
2. Audio rows have play buttons.
3. Pass: no asset in `needed`; owner marks all `approved`.

### Phase D — Playable game
```bash
pnpm test           # Vitest: all 512 combinations evaluated against the paytable
pnpm test:e2e       # Playwright: spin flows with mocked /api/spin at 4 viewports
```
Manual:
1. Press PLAY; chips fall. Press SPIN; reels stop left to right.
2. Set `FORCE_REELS=keith,keith,keith` in `.env.local`; spin; confirm blink animation + "15% off" popup, win reference, call and form options. Repeat with `gia,gia,gia`: blink + "20% off"; `scott,scott,keith`: two-plus-one + "15% off"; and `neos,neos,neos`: heat-pulse rings + "10% off".
3. Set `FORCE_REELS=seven,cherry,sweets`; confirm "spin again", counter drops 3 → 2 → 1 → 0, then the Last Chance screen; take the bonus spin; then the game-over thank-you. Reload: still game over; `POST /api/spin` returns 403.
4. Win, submit the claim form; confirm a `leads` row in Neon (`crm_status` becomes `synced`) and the lead in SharpSpring with discount and win reference.
5. Set a wrong `SHARPSPRING_SECRET_KEY`; submit; player still sees success; row stays `pending`. Fix the key, call `/api/cron/crm-sync` with `CRON_SECRET` (or play a spin, which triggers a traffic-driven retry once the lead is due); row becomes `synced`.
6. Unset `FORCE_REELS`; run `pnpm test`, which includes a 100k-spin simulation asserting win rate ≈ 10.35% ± 0.3% and each of the 8 symbols at ≈ 1/8 per reel.
7. In devtools, block `/api/spin`; spin; expect "Machine hiccup, try again", never a win.

### Phase E — Atmosphere polish
1. Marquee bulbs chase; ambient sound starts on PLAY; mute persists after reload.
2. Turn on OS "reduce motion": chips and bulb chase calm down; game still works.
3. Chrome devtools performance, CPU 4× slowdown, mobile emulation: spin + win stays ≥ 30 fps; real mid-range phone ≥ 55 fps.

### Phase F — Launch readiness
1. Lighthouse mobile: LCP < 2.5 s, total transfer ≤ 4 MB before PLAY.
2. Win, refresh: win reference and claim options still shown; SPIN locked.
3. `FORCE_REELS` confirmed ignored on the production deployment.
4. Staff lookup `/admin.html` finds a win reference; CSV export downloads.
5. Vercel Hobby plan (owner upgrades manually if launching publicly); privacy policy, terms and phone number filled in.
