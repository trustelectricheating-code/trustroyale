# Data Model: Trust Royale Slot Machine

**Feature**: `001-trust-royale-slots` | **Date**: 2026-09-25

Game config (symbols, paytable) is static config. Sessions, spins, wins and leads live in **Neon Postgres** (see tables below). Browser `localStorage` holds only mute state and a display copy of the current win.

---

## Symbol

A reel icon. Defined in `src/config/symbols.ts` (shared by client and `/api/spin`).

| Field | Type | Rules |
|---|---|---|
| `id` | `'scott' \| 'fiona' \| 'keith' \| 'neos' \| 'cherry' \| 'seven' \| 'sweets'` | Unique, lowercase |
| `name` | string | Display name, e.g. "Scott" |
| `kind` | `'face' \| 'emblem' \| 'filler'` | `neos` is the only `emblem` (Trust 'T'). Filler symbols can never be part of a winning rule, except as the "any other" slot in the Keith ×2 rule |
| `frames` | `{ idle, half?, closed?, win?, pulse? }` asset keys | Faces require `idle/half/closed/win`; emblem requires `idle` + `pulse` (ring overlay); fillers require `idle` only (plus optional `shine`) |

## PaytableRule

Defined in `src/config/paytable.ts`. Evaluated highest `discount` first; first match wins.

| Field | Type | Rules |
|---|---|---|
| `id` | string | e.g. `keith-3` |
| `label` | string | Text shown in paytable, e.g. "3 × Keith" |
| `pattern` | `Record<SymbolId, number>` + optional `anyOther: number` | Counts must total 3; order-independent |
| `discount` | `10 \| 15 \| 20 \| 25` | Percent off |
| `celebration` | `'blink' \| 'pulse' \| 'glow'` | `blink` for three-of-a-kind faces, `pulse` for three Neos, `glow` for mixed |

Initial rules (from spec FR-004):

| id | pattern | discount | celebration |
|---|---|---|---|
| `keith-3` | keith:3 | 25 | blink |
| `scott-3` | scott:3 | 20 | blink |
| `fiona-3` | fiona:3 | 20 | blink |
| `scott-2-fiona-1` | scott:2, fiona:1 | 15 | glow |
| `fiona-2-scott-1` | fiona:2, scott:1 | 15 | glow |
| `keith-2-any` | keith:2, anyOther:1 | 15 | glow |
| `neos-3` | neos:3 | 10 | pulse |

Validation: exhaustive test over all 343 combinations confirms each maps to exactly one rule or none, and that no combination without a face wins.

## SpinResult

Returned by `/api/spin` (see [contracts/spin-api.md](./contracts/spin-api.md)).

| Field | Type | Rules |
|---|---|---|
| `spinId` | string (UUID) | Unique per spin |
| `reels` | `[SymbolId, SymbolId, SymbolId]` | Payline symbols, left to right |
| `strip` | `SymbolId[3][3]` | Full 3×3 window (rows above/below are cosmetic) |
| `outcome` | `'win' \| 'retry'` | |
| `ruleId` | string \| null | Matched rule, null on retry |
| `discount` | number \| null | |
| `winRef` | string \| null | Only on win, e.g. `TR-7K3F` |
| `spinsLeft` | 0–3 | Regular spins left after this spin; forced to 0 on a win |
| `bonusAvailable` | boolean | True only when the 3 regular spins all lost and the bonus is unused |
| `isBonus` | boolean | This spin was the Last Chance spin |
| `nearMiss` | boolean | True when two payline symbols form part of a winning rule but the spin lost; drives the "so close" tease (display only) |

State transitions (client game state):

```text
LANDING ──PLAY──▶ IDLE ──SPIN──▶ SPINNING ──result──▶ RESOLVING
                    ▲                                    │
                    └──── retry (spinsLeft > 0) ◀────────┤
                                                         ├── retry (spinsLeft = 0, bonus unused) ──▶ LAST_CHANCE ──SPIN──▶ SPINNING (bonus)
                                                         ├── retry (bonus used) ──▶ GAME_OVER (thank-you)
                                                         └── win ──▶ WON (call or form) ──submit──▶ CLAIMED
SPINNING ──network error──▶ IDLE (with "try again" toast; spin not counted; never shows a win)
Page load with existing session: server returns state → jump straight to IDLE / LAST_CHANCE / WON / CLAIMED / GAME_OVER
```

## Database (Neon Postgres)

Accessed from Vercel Functions with `@neondatabase/serverless`. Schema in `db/migrations/*.sql`. Region: EU (London/Frankfurt) for UK GDPR.

### `sessions`

| Column | Type | Rules |
|---|---|---|
| `id` | uuid PK | Stored in signed, `HttpOnly`, `Secure`, `SameSite=Lax` cookie `tr_sid`, 90-day expiry |
| `created_at` | timestamptz | |
| `spins_used` | smallint | 0–4, `CHECK (spins_used <= 4)`; spin 4 is the bonus |
| `won_spin_id` | uuid null FK → spins | Set once; non-null means no more spins |
| `ip_hash` | text | SHA-256 of IP + salt, for soft daily cap only |
| `utm` | jsonb null | Campaign params from the landing URL, passed to CRM |

### `spins`

| Column | Type | Rules |
|---|---|---|
| `id` | uuid PK | = `spinId` |
| `session_id` | uuid FK → sessions | |
| `spin_no` | smallint | 1–4 (4 = bonus), `UNIQUE (session_id, spin_no)` |
| `reels` | text[3] | |
| `rule_id` | text null | |
| `discount` | smallint null | |
| `win_ref` | text null UNIQUE | Only on win; 6 chars from an unambiguous alphabet (no 0/O/1/I), prefixed `TR-` |
| `created_at` | timestamptz | |

Spin counting is atomic: `UPDATE sessions SET spins_used = spins_used + 1 WHERE id = $1 AND spins_used < 4 AND won_spin_id IS NULL RETURNING spins_used`. Spin 4 is only reachable after 3 losses, because any win sets `won_spin_id` — no row returned means no spins left.

### `leads`

| Column | Type | Rules |
|---|---|---|
| `id` | uuid PK | |
| `spin_id` | uuid FK → spins, UNIQUE | One lead per winning spin; must reference a spin with `rule_id IS NOT NULL` |
| `win_ref`, `discount` | copied from `spins` on insert | Never taken from the form |
| `first_name`, `last_name` | text | Required, 1–80 chars |
| `phone` | text | Required, UK format validated |
| `email` | text | Required, validated |
| `postcode` | text | Required, UK postcode format |
| `marketing_consent` | boolean | Unticked by default |
| `consent_text` | text | Exact wording shown, for audit |
| `created_at` | timestamptz | |
| `crm_status` | `'pending' \| 'synced' \| 'failed'` | Starts `pending` |
| `crm_attempts` | smallint | Incremented per try |
| `crm_lead_id` | text null | SharpSpring lead ID once synced |
| `crm_last_error` | text null | |
| `claimed_via` | `'form' \| 'phone'` | `phone` set by staff lookup |

Lead lifecycle:

```text
pending ──send ok──▶ synced
   │
   └──send fails──▶ pending (attempts+1) ──… 10 attempts ──▶ failed (shown in staff export for manual entry)
```

## Reel RNG

No weights. Each reel picks one of the 7 symbol IDs with `crypto.randomInt(7)`. The rows above and below the payline are also random and purely cosmetic. Preview-only override: env `FORCE_REELS` (ignored when `VERCEL_ENV === 'production'`).

## AssetEntry

One row per file in `assets/manifest.json` (schema in [contracts/asset-manifest.md](./contracts/asset-manifest.md)). Drives the Phase B asset board and the runtime loader.

| Field | Type | Rules |
|---|---|---|
| `key` | string | Unique, e.g. `face.scott.closed` |
| `group` | `'cabinet' \| 'symbols' \| 'faces' \| 'fx' \| 'ui' \| 'background' \| 'audio' \| 'fonts'` | Asset board sections, in this order |
| `file` | path | Under `public/assets/` |
| `status` | `'needed' \| 'placeholder' \| 'draft' \| 'approved'` | Board shows status badge |
| `source` | `'supplied' \| 'generated' \| 'cc0' \| 'licensed' \| 'custom'` | |
| `licence` | string | Required unless `supplied` |
| `sourceUrl` | string \| null | Where it came from |
