# Research: Trust Royale Slot Machine

**Feature**: `001-trust-royale-slots` | **Date**: 2026-09-25

Each section resolves one unknown from the Technical Context in [plan.md](./plan.md).

---

## R1. Rendering engine — is 3D overkill?

**Decision**: 2.5D. **PixiJS v8 (WebGL 2D)** renders the live game layer (reels, faces, bulbs, chips, particles). The "realistic" cabinet comes from **pre-rendered, layered artwork** (produced once in a 3D tool or by image generation, then exported as WebP layers), not a real-time 3D scene.

**Rationale**:
- The Vercel plan does not limit rendering. Everything runs in the visitor's browser, so a 3D engine costs nothing on Vercel. The real costs of 3D are elsewhere: phone GPU and battery, download size (models + HDR environment maps are often 5–20 MB), and the effort of modelling, texturing and lighting a believable cabinet.
- A slot machine is seen from a fixed front camera. Real-time 3D only pays off when the camera moves. A pre-rendered cabinet with baked lighting, glass reflections and bloom looks *more* realistic than a phone-budget real-time render, and loads as a few hundred KB of WebP.
- PixiJS handles hundreds of sprites (chips, confetti, bulbs) at 60 fps on mid-range phones, supports blur/glow/bloom filters, and has good masking for reel windows.
- Reels are 2D by nature. A slight cylinder curvature can be faked with a vertical scale/shading gradient overlay.

**Alternatives considered**:
| Option | Why not chosen |
|---|---|
| Three.js / React Three Fiber (full 3D) | Realistic look needs modelled cabinet, PBR textures, HDRI — heavy to produce and to download; mobile frame rate risk; fixed camera wastes the benefit. Kept as an upgrade path: the cabinet art could later be swapped for a 3D model without changing game logic. |
| Phaser 4 | Full game framework (scenes, physics, loader). Works, but brings a lot we don't need for one screen and makes DOM overlays (paytable, popup, accessibility) more awkward. |
| Pure DOM/CSS + GSAP | Lightest option and fine for reels, but hundreds of falling chips, bulb glow and confetti hit layout/paint limits on phones. Noted as the fallback if the asset budget must shrink. |
| Spline (no-code 3D) embed | Fast to prototype, but runtime is large (~1 MB+) and brand control is limited. |

## R2. App shell and build

**Decision**: **Vite + TypeScript**, no UI framework. PixiJS canvas for the game layer; plain semantic HTML/CSS overlays for paytable, popups, mute button and PLAY/SPIN buttons.

**Rationale**: One screen, a handful of overlays. React would add bundle weight and a second render loop with no benefit. HTML overlays keep text crisp, accessible (screen readers, focus, keyboard) and easy to restyle.

**Alternatives considered**: Next.js (great on Vercel, but server rendering and routing are unused here); React + Vite (fine, unnecessary for this scope).

## R3. Animation library

**Decision**: **GSAP 3** for timelines (reel spin easing, staggered stops, popup entrance, marquee bulb chase), driving PixiJS object properties. GSAP is free for commercial use including all plugins.

**Rationale**: Slot "feel" lives in easing — overshoot on stop, anticipation, stagger. GSAP timelines make these tunable in one place.

**Alternative**: PixiJS ticker only — possible but hand-writing easing and sequencing is slower to tune.

## R4. Animated faces (blink on win)

**Decision**: Each face symbol (Scott, Fiona, Gia and Keith) is a **4-frame sprite set**: `idle` (eyes open, neutral smile), `half` (eyelids half closed), `closed` (eyes closed), `win` (big smile/excited). Blink = `idle → half → closed → half → idle` over ~180 ms, played 2–3 times on a win. Idle life comes from a gentle breathing scale and occasional random blink when not spinning (can be disabled if the owner prefers blink only on wins).

**Production**: Use the supplied photos only as reference/seed input to gpt-image-2, then place each generated casino portrait in a round **gold-rimmed medallion** on a red velvet disc so every face reads as a matching casino token. Gia uses `reference/gia.png` under the same rules as Scott and Fiona. Eyelid frames are image edits of the generated idle art, keeping the likeness stable. Keith (mascot) gets the same treatment from the mascot sheet.

**Neos (Trust 'T' emblem)**: no file was supplied, so it is rebuilt as an SVG from the emblem construction page in the brand guidelines (circle head; crossbar and stem as rounded capsules). It is rendered in the same gold-rimmed medallion as the faces (red emblem on cream, or gold emblem on brand red — chosen in the mood board). With no eyes to blink, its win animation is a **heat pulse**: concentric rings radiating outward, taken from the brand's own ring motif, plus a warm glow.

**Alternatives considered**:
- Rive/Spine rigged animation — smoother and supports mouth/eye rigs, but adds a runtime (~150 KB+) and rigging work per face. Upgrade path if the owner wants talking/winking faces.
- Cartoon caricatures instead of photos — more "game-like", but loses recognisability; offered as a mood-board option, not default.

## R5. Outcome authority, odds and anti-tamper

**Decision**: A **Vercel Function `POST /api/spin`** decides each spin. **Odds are pure random**: each of the three reels independently lands on one of 8 symbols (Scott, Fiona, Gia, Keith, Neos, Cherry, Seven, Sweets) with equal chance, using `crypto.randomInt(8)`. The server evaluates the payline against the paytable, records the spin in Neon, and returns the result. The client only animates what the server sent.

**Resulting odds** (uniform, independent reels; 8³ = 512 equally likely ordered outcomes):

| Rule | Combinations | Chance per spin |
|---|---|---|
| Scott × 3 (20%) | 1 | 0.1953% |
| Fiona × 3 (20%) | 1 | 0.1953% |
| Gia × 3 (20%) | 1 | 0.1953% |
| Keith × 3 (15%) | 1 | 0.1953% |
| Keith × 2 + any other symbol (15%; evaluated before the general two-plus-one rule) | 21 | 4.1016% |
| Two of one face + one different face, among Scott/Fiona/Gia/Keith (15%; excluding the 9 Keith × 2 + person outcomes already counted above) | 27 | 5.2734% |
| Neos × 3 (10%) | 1 | 0.1953% |
| **Any win** | **53** | **10.3516%** |

Counting: three 20% triples contribute 3 outcomes. Keith × 3 contributes 1. Keith × 2 + any other has 7 choices for the third symbol × 3 positions = 21. Across all four eligible faces, the two-plus-one set has 4 choices for the repeated face × 3 choices for the other face × 3 positions for the singleton = 36 outcomes; 9 of those have Keith repeated with Scott, Fiona or Gia and are already assigned to `keith-2-any`, leaving 27 outcomes for `people-2-plus-1`. Neos × 3 contributes 1. Total = 3 + 1 + 21 + 27 + 1 = 53. Precedence is exact triples, then `keith-2-any`, then `people-2-plus-1`, then Neos × 3. Thus Keith × 3 is counted once, overlapping 15% patterns are assigned once, and every outcome pays at most one rule.

Expected prize per spin, including losses, is `((3 × 20) + (1 × 15) + (21 × 15) + (27 × 15) + (1 × 10)) / 512 = 805 / 512 = 1.5723%` off. Conditional on winning, the average prize is `805 / 53 = 15.1887%` off. With 3 spins plus the Last Chance bonus spin, about **35.41%** of players win something (`1 − (459/512)⁴`).

**Rationale**: A pure client-side game lets anyone force the top 20% win from the browser console, and win records must match leads. Server-side RNG plus the Neon spin record makes every win verifiable.

**Tuning later (optional)**: if the business wants a different win rate, change the reel strips (e.g. more cherries on each reel) rather than rigging outcomes. That keeps results random and needs only a config change. Not built in v1.

**Test-only override**: `FORCE_REELS` env (e.g. `keith,keith,keith`) is honoured **only** when `VERCEL_ENV !== 'production'`, so previews can demo every win.

**Alternatives considered**: Weighted outcome-first selection (rejected: owner wants random); client-side RNG (rejected: tamperable).

## R6. Hosting — Vercel plan

**Decision**: Static site + one Vercel Function, deployed from `github.com/trustelectricheating-code/trustroyale` with preview deployments per branch (used for each phase sign-off).

**Plan decision**: stay on **Hobby (free)** — the owner is not publicly launching and will upgrade manually if needed. For reference, Hobby is for non-commercial use, so upgrade to Pro before any public commercial launch.

**Budget fit (Hobby numbers, for reference)**: 100 GB/month bandwidth. With a first-load target of ≤ 4 MB, that is roughly 25,000 full visits/month before overage; function usage per spin is a few ms.

## R7. Audio

**Decision**: **Howler.js** with an audio sprite (one compressed file, WebM/Opus + MP3 fallback) for short SFX and a separate looping ambient track. Audio unlocks on the PLAY tap (browsers block sound before a user gesture). Mute state saved in `localStorage`.

**Sound list**: casino ambience loop (crowd murmur, distant machines), button press, reel spin loop, reel stop ×3 (slightly different pitch), near-miss tease, small-win jingle, jackpot fanfare with bells, chip fall/clatter, popup whoosh.

**Sourcing**: CC0 / royalty-free libraries (Kenney, Freesound CC0 filter, Pixabay audio, Sonniss GDC bundles). Every file logged in the asset manifest with source URL and licence.

## R8. Full-screen responsive layout

**Decision**: Two composed layouts, one engine:
- **Portrait (phones)**: stacked — marquee → paytable strip → machine (fills ~70% height) → SPIN button → chip tray. Machine art scales to width; background (casino carpet / velvet curtains / bokeh lights) extends to fill any extra height.
- **Landscape (desktop, tablets, rotated phones)**: machine centred full height; paytable as a lit side panel (left) or top board; décor (curtains, light columns, chip stacks) fills the sides.

Canvas resized with `100dvh`/`100dvw`, safe-area insets respected. Layout computed from a design grid (portrait 1080×1920, landscape 1920×1080) using "cover" for background and "contain" for the machine, so the screen is always full and the machine is never cropped.

## R9. Visual direction

**Decision**: "Monte Carlo meets Vegas" — deep red velvet, polished gold trim, warm incandescent bulbs, black lacquer accents, subtle navy (brand) in shadows and felt. Brand reds from the Trust guidelines (`#E81E2C`, `#B91526`, `#8C111E`) as the core; gold gradient (`#7A5410 → #D4A437 → #FFE8A3`) for trim and type. Title "TRUST ROYALE" in a bold display serif or Art Deco face with gold bevel; UI text in a rounded sans matching the Trust wordmark feel. No Chinese iconography (no red envelopes, lanterns, dragons, hanzi). The mood board (Phase A) presents 2–3 directions for the owner to pick from.

## R10. Performance budget

| Item | Budget |
|---|---|
| JS (gzip) | ≤ 250 KB (PixiJS ~ 100–150 KB tree-shaken, GSAP ~ 25 KB, Howler ~ 10 KB, app) |
| First-load images | ≤ 2.5 MB WebP/AVIF (texture atlases) |
| Audio before PLAY | 0 KB (loaded after tap) |
| Total first visit | ≤ 4 MB |
| Frame rate | 60 fps target, 30 fps floor on low-end (auto-reduce particles) |

## R11. Testing

**Decision**: **Vitest** for the paytable evaluator, reel RNG and API handlers (exhaustive test over all 8³ = 512 combinations); **Playwright** for end-to-end spins against a mocked `/api/spin` and screenshot checks at phone portrait, phone landscape, tablet and desktop viewports.

## R12. Legal note

A free-to-play game with no purchase needed to play is generally a free prize promotion, not gambling, under the UK Gambling Act 2005. Keep: no payment to play, clear terms for voucher use (expiry, one per order). Owner should confirm terms copy with whoever handles marketing compliance.

---

## Decisions confirmed by owner (2026-09-25)

1. Keith = the cat mascot from `reference/keith the mascot.png`. Always called **Keith** in game and docs.
2. Claim = phone call or website form; form leads saved to Neon first, then sent to SharpSpring (R13).
3. 3 spins per customer; play stops at first win; one bonus Last Chance spin if all 3 lose.
4. Paytable v2: Gia joins as the fourth face symbol; Scott/Fiona/Gia triples pay 20%; Keith × 3 pays 15%; any two-plus-one mix among Scott/Fiona/Gia/Keith pays 15%; Keith × 2 + any other symbol pays 15%; Neos × 3 pays 10%; top prize is 20% and there is no 25% prize. Owner correction: Keith counts in the two-plus-one rule, so Scott × 2 + Keith pays 15%.
5. Odds are pure random (R5).
6. Stay on Vercel **Hobby (free)**; this is not a public launch. Owner upgrades manually when needed.
7. Vouchers are one per order. Privacy policy, terms and claim phone number are added at the end.
8. SharpSpring credentials and custom fields are requested only when Phase D starts.

## Open items

None blocking. Deferred by owner: claim phone number, privacy policy and terms (end of project); SharpSpring credentials and fields (start of Phase D).

## R13. Lead storage and CRM

**Decision**: **Neon Postgres** (added through the Vercel Marketplace integration, which sets `DATABASE_URL`), accessed with `@neondatabase/serverless` over HTTP from Vercel Functions. Plain SQL migrations in `db/migrations/`. The lead is committed to Neon **before** any SharpSpring call, the player gets an instant response, then one send attempt runs after the response (`waitUntil`). Because Vercel Hobby only allows once-a-day cron jobs, failed sends are retried by four free layers: traffic-driven retries after `/api/session` and `/api/spin`, a daily Vercel Cron backstop, and an optional external pinger (cron-job.org) every 15 minutes, on top of the instant send (see [contracts/lead-api.md](./contracts/lead-api.md#retry-strategy-vercel-hobby-plan)). After 10 failures a lead is marked `failed` and appears in the staff CSV export. Spin counting uses a single SQL statement rather than a transaction, because the HTTP driver cannot run interactive transactions (see [data-model.md](./data-model.md#spins)).

**Rationale**: Neon's free tier (0.5 GB storage, scales to zero) holds far more lead rows than this campaign needs. Writing first means CRM outages, bad credentials or rate limits can never lose a lead. Sessions and spins in the same database enforce the 3-spin limit and let staff verify phone claims by win reference.

**SharpSpring**: API v1.2 JSON-RPC (`createLeads`, `updateLeads` on duplicate email, `getFields` to discover custom field system names). Endpoint and payload in [contracts/lead-api.md](./contracts/lead-api.md). Field names and duplicate handling must be checked against the live account at the start of Phase D, because SharpSpring (now Constant Contact Lead Gen & CRM) account setups differ.

**GDPR (UK)**: consent checkbox unticked by default, exact consent text stored per lead, privacy link beside the form, EU/UK Neon region, IPs stored only as salted hashes.

**Alternatives considered**: Sending straight to SharpSpring (rejected: leads lost on any CRM error); Vercel KV/Upstash (fine for counters, weak for relational lead data and exports); SharpSpring embedded form (loses the server-verified discount link and the game's styling).
