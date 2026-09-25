# Implementation Plan: Trust Royale — Branded Slot Machine Promo Game

**Branch**: `001-trust-royale-slots` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-trust-royale-slots/spec.md`

## Summary

A full-screen, free-to-play slot machine for Trust Electric Heating, branded "Trust Royale". Three reels carry animated face medallions (Scott, Fiona, Keith), the Trust 'T' emblem (Neos) and never-winning fillers (cherry, seven, sweets). Face combinations award 10–25% order discounts; anything else invites another spin. Each customer gets 3 spins (plus one Last Chance bonus spin if all 3 lose) with pure random reels. Winners claim by phone or a form; every form lead is saved in Neon Postgres, then sent to SharpSpring CRM. The look is a realistic red-and-gold casino cabinet with chasing marquee bulbs, levitating chips that fall on PLAY, and casino audio.

Technical approach (see [research.md](./research.md)): a **2.5D** build — pre-rendered, layered cabinet art plus a **PixiJS v8** WebGL layer for reels, faces, lights and particles, animated with **GSAP**, audio via **Howler.js**, shell in **Vite + TypeScript** with HTML overlays. A few **Vercel Functions** decide spins server-side, enforce the 3-spin limit, and store sessions, spins and leads in **Neon Postgres**; leads are forwarded to **SharpSpring** with automatic retry, so no lead is lost. Real-time 3D was assessed and rejected for v1: it does not cost anything on Vercel, but it costs download size, phone frame rate and modelling effort for a fixed-camera scene.

Delivery runs in six gated phases (A–F). The owner sees the mood board, then the look, then every asset, before game logic is built.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 LTS (Vercel Function runtime)

**Primary Dependencies**: PixiJS 8, GSAP 3, Howler.js 2, Vite (latest stable), `@neondatabase/serverless`; no UI framework, no ORM

**Storage**: Neon Postgres (EU region, via Vercel Marketplace): `sessions`, `spins`, `leads`. SharpSpring CRM as downstream lead destination. Browser `localStorage` for mute state only.

**Testing**: Vitest (paytable evaluator, reel RNG win-rate simulation, API handlers against a Neon branch, SharpSpring client with mocked HTTP); Playwright (e2e + multi-viewport screenshots)

**Target Platform**: Modern mobile and desktop browsers (iOS Safari 16+, Chrome/Edge/Firefox last 2 versions), WebGL 2 with WebGL 1 fallback via PixiJS

**Project Type**: Static web app + one serverless function, hosted on Vercel

**Performance Goals**: 60 fps during spin and win on 2021-era mid-range phones; interactive < 3 s on 4G

**Constraints**: JS ≤ 250 KB gzip; first visit ≤ 4 MB; no audio before user gesture; no scroll at any viewport; `prefers-reduced-motion` honoured; 3 spins + 1 bonus per session enforced server-side; leads written to Neon before any CRM call; UK GDPR consent

**Scale/Scope**: One screen (+ moodboard and asset-board review pages); 7 symbols; 7 paytable rules; ~60 art files (incl. one rebuilt SVG emblem), ~12 sounds; expected traffic within tens of thousands of visits/month

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template — no principles are ratified, so there are no gates to fail. **Result: PASS (vacuous).**

Self-imposed checks used instead, from the spec and user brief:

| Check | Pre-design | Post-design |
|---|---|---|
| Phased delivery with owner sign-off (mood → look → assets → build) | ✅ | ✅ Phases A–F below, each a Vercel preview |
| Fits Vercel hosting | ✅ | ✅ Static + a few functions + 1 daily cron (Hobby limit) + traffic-driven retries + Neon free tier; Hobby (free) plan, owner decision — see research R6 |
| No unnecessary complexity | ✅ | ✅ No framework, no ORM, no 3D runtime; one DB, only because leads and spin limits need it |
| Prize logic tamper-resistant | ✅ | ✅ Server-side RNG, spin limit and win records in Neon (contract: spin-api) |
| No lead loss | ✅ | ✅ Write-first to Neon, layered retry to SharpSpring that fits the once-a-day Hobby cron (contract: lead-api) |

Recommend running `/speckit-constitution` before `/speckit-tasks` if the owner wants these made binding.

## Project Structure

### Documentation (this feature)

```text
specs/001-trust-royale-slots/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── spin-api.md
│   ├── lead-api.md
│   └── asset-manifest.md
└── tasks.md             # /speckit-tasks (not yet created)
```

### Source Code (repository root)

```text
index.html                 # Game page
moodboard.html             # Phase A review page
assets.html                # Phase C asset board
admin.html                 # Staff win-reference lookup + CSV export
api/
├── session.ts             # GET /api/session
├── spin.ts                # POST /api/spin
├── lead.ts                # POST /api/lead
├── cron/crm-sync.ts       # Retry to SharpSpring (daily Vercel Cron + optional external pinger)
├── admin/                 # win lookup, phone claim, leads.csv
└── _lib/                  # db.ts (Neon), session.ts (signed cookie), sharpspring.ts, validate.ts
db/migrations/             # Plain SQL: sessions, spins, leads
src/
├── main.ts                # Boot: loader, layout, state machine
├── config/
│   ├── symbols.ts         # Shared with api/
│   └── paytable.ts        # Shared with api/
├── game/
│   ├── evaluator.ts       # Paytable matching (pure)
│   ├── state.ts           # LANDING → IDLE → SPINNING → RESOLVING → WON
│   └── api.ts             # fetch /api/spin
├── scene/                 # PixiJS layers
│   ├── layout.ts          # Portrait / landscape composition
│   ├── background.ts
│   ├── cabinet.ts
│   ├── reels.ts
│   ├── faces.ts           # Blink / win frame animation
│   ├── marquee.ts         # Bulb chase
│   └── chips.ts           # Levitate + fall
├── ui/                    # HTML overlays
│   ├── paytable.ts
│   ├── popup.ts           # Win / retry / Last Chance / game over
│   ├── claimForm.ts       # Lead form + call button
│   └── controls.ts        # PLAY, SPIN, mute
├── audio/sound.ts         # Howler wrapper
└── styles/main.css
public/assets/             # manifest.json + webp atlases, audio sprites, fonts
reference/                 # Owner-supplied source material (git-ignored large files)
tests/
├── unit/                  # evaluator, RNG simulation, api handlers, sharpspring client
└── e2e/                   # Playwright flows + viewport screenshots
vercel.json                # Cron schedule
```

**Structure Decision**: Single Vite project at repo root with Vercel's zero-config `api/` directory for the function. `src/config` is imported by both client and functions so the paytable has one definition. Neon holds all server state.

## Delivery Phases (owner-gated)

Each phase ends with a Vercel preview URL and an explicit owner sign-off before the next starts. Implementation work is handed to codex per phase; Claude writes briefs and QA-checks results.

| Phase | Deliverable | Owner sees | Exit gate |
|---|---|---|---|
| **A. Mood board** | `moodboard.html`: 2–3 directions (e.g. "Monte Carlo Velvet", "Vegas Neon Gold", "Art Deco Royale"), palettes built on brand reds + gold, title type tests, material refs, one sample face medallion (Scott) and the rebuilt Neos 'T' emblem medallion, chip + filler style tests | Look options side by side | Direction chosen |
| **B. Look & feel mock** | Static full-screen composition of the chosen direction at portrait and landscape; placeholder art allowed | "This is how the game will look" | Layout approved at 4 viewports |
| **C. Asset production + asset board** | Every asset in [asset-manifest](./contracts/asset-manifest.md), in group order, with status/licence; faces with 4 blink frames; Neos emblem SVG + pulse overlay; audio playable | All assets in order | All `approved` |
| **D. Playable game + leads** | Reels, evaluator, Neon schema, `/api/session` + `/api/spin` with 3-spin limit, win/retry/Last Chance/game-over popups, call + claim form, `/api/lead`, SharpSpring sync + cron retry, staff lookup | Working game on preview URL | Tests green; forced-outcome checks pass |
| **E. Atmosphere polish** | Bulb chase, chip levitate/fall physics, confetti/coin burst, blink, sound design, reduced-motion, perf tuning | Full "casino feel" | 60 fps target met; audio/mute checks pass |
| **F. Launch** | Production Neon branch + SharpSpring credentials, phone number, privacy link, Lighthouse pass, production domain, Vercel plan decision | Live site | Owner go-live |

## Owner decisions (confirmed 2026-09-25)

Keith = cat mascot (always "Keith"); Neos = Trust 'T' emblem; claim by phone or form; leads to Neon then SharpSpring; 3 spins per customer + 1 Last Chance bonus spin if all lose, play stops at first win; one voucher per order; Vercel Hobby (free); Fiona × 2 + Scott pays 15%; odds pure random (≈ 8.2% per spin, ≈ 28.9% per player).

## Deferred owner inputs (asked only at the stage that needs them)

- **Start of Phase D**: SharpSpring API credentials and custom fields.
- **End of project**: claim phone number, privacy policy, terms and conditions.

## Complexity Tracking

No constitution violations to justify.
