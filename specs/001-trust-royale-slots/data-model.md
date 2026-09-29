# Data Model: Trust Royale Slot Machine

**Feature**: `001-trust-royale-slots` | **Date**: 2026-09-25

Game config (symbols, paytable) is static config. Sessions, spins, wins and leads live in **Neon Postgres** (see tables below). Browser `localStorage` holds only mute state and a display copy of the current win.

---

## Symbol

A reel icon. Defined in `src/config/symbols.ts` (shared by client and `/api/spin`).

| Field | Type | Rules |
|---|---|---|
| `id` | `'scott' \| 'fiona' \| 'gia' \| 'keith' \| 'neos' \| 'cherry' \| 'seven' \| 'sweets'` | Unique, lowercase |
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
| `discount` | `10 \| 15 \| 20` | Percent off; database columns storing a non-null discount use `CHECK (discount IN (10, 15, 20))` |
| `celebration` | `'blink' \| 'pulse' \| 'glow'` | `blink` for three-of-a-kind faces, `pulse` for three Neos, `glow` for mixed |

Initial rules (from spec FR-004):

| id | pattern | discount | celebration |
|---|---|---|---|
| `scott-3` | scott:3 | 20 | blink |
| `fiona-3` | fiona:3 | 20 | blink |
| `gia-3` | gia:3 | 20 | blink |
| `keith-3` | keith:3 | 15 | blink |
| `keith-2-any` | keith:2, anyOther:1 | 15 | glow |
| `people-2-plus-1` | two of one + one different from scott/fiona/gia/keith | 15 | glow |
| `neos-3` | neos:3 | 10 | pulse |

Validation: exhaustive test over all 512 combinations confirms each maps to exactly one rule or none. Keith counts in the two-plus-one rule, so Scott × 2 + Keith wins. Apply exact triples first, then `keith-2-any`, then `people-2-plus-1`, then `neos-3`; this assigns Keith × 2 + Scott/Fiona/Gia to `keith-2-any` once despite the semantic overlap. Keith × 3 matches only `keith-3`. Filler symbols never win except as the third symbol beside Keith × 2. Neos × 3 is the only winning combination with no face.

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
| `best` | object \| null | Highest banked `{ ruleId, discount, winRef }` so far |
| `spinsLeft` | 0–3 | Regular tries left; 10%/15% wins do not force this to zero |
| `bonusAvailable` | boolean | True only when all 3 regular tries lost and the bonus is unused |
| `gameOver` | boolean | True on 20%, after try 3 with a banked prize, or after Last Chance |
| `isBonus` | boolean | This spin was the Last Chance spin |
| `nearMiss` | boolean | True only on a losing spin where the payline holds exactly two eligible faces among Scott/Fiona/Gia/Keith but does not satisfy the two-plus-one rule, or exactly two Neos. A second Keith always wins through `keith-2-any`. Drives the "so close" tease (display only) |

State transitions (client game state):

```text
LANDING ──PLAY──▶ IDLE ──SPIN──▶ SPINNING ──result──▶ RESOLVING
                    ▲                                    │
                    └──── retry (spinsLeft > 0) ◀────────┤
                                                         ├── retry (spinsLeft = 0, bonus unused) ──▶ LAST_CHANCE ──SPIN──▶ SPINNING (bonus)
                                                         ├── retry (bonus used) ──▶ GAME_OVER (thank-you)
                                                         ├── 10%/15% banked with tries left ──▶ IDLE
                                                         └── final best prize or 20% ──▶ WON
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
| `won_spin_id` | uuid null FK → spins, `DEFERRABLE INITIALLY DEFERRED` | Highest winning spin so far; overwritten only by a higher discount |
| `ip_hash` | text | SHA-256 of IP + salt, for soft daily cap only. Raw IPs are never stored |
| `utm` | jsonb null | Campaign params from the landing URL, passed to CRM |

### `spins`

| Column | Type | Rules |
|---|---|---|
| `id` | uuid PK | = `spinId` |
| `session_id` | uuid FK → sessions | |
| `spin_no` | smallint | 1–4 (4 = bonus), `UNIQUE (session_id, spin_no)` |
| `reels` | text[3] | |
| `rule_id` | text null | |
| `discount` | smallint null | `CHECK (discount IS NULL OR discount IN (10, 15, 20))` |
| `win_ref` | text null UNIQUE | Only on win; 6 chars from an unambiguous alphabet (no 0/O/1/I), prefixed `TR-` |
| `created_at` | timestamptz | |

Spin counting is atomic and runs as **one SQL statement**, because the Neon HTTP driver cannot run interactive transactions (a batched `sql.transaction([...])` cannot branch on an earlier query's result). The server rolls the reels, evaluates the paytable and generates `spinId` and `winRef` (null on a loss) *before* touching the database, then runs:

```sql
WITH s AS (
  UPDATE sessions
     SET spins_used  = spins_used + 1,
         won_spin_id = CASE WHEN $5::text IS NOT NULL THEN $2::uuid END
   WHERE id = $1 AND spins_used < 4 AND won_spin_id IS NULL
   RETURNING id, spins_used
)
INSERT INTO spins (id, session_id, spin_no, reels, rule_id, discount, win_ref)
SELECT $2, s.id, s.spins_used, $3, $4, $6, $5 FROM s
RETURNING spin_no;
-- $1 session id, $2 spinId, $3 reels, $4 ruleId, $5 winRef (null = loss), $6 discount
```

- No row returned means no spins left (403); nothing is counted.
- A single statement is all-or-nothing: any error, including a `win_ref` `UNIQUE` collision, rolls back the counter too. On a collision, generate a new `winRef` and rerun; on any other error return 500 with the spin not counted.
- Spin 4 (the bonus) is only reachable after 3 losses, because any win sets `won_spin_id` in the same statement.
- The row lock taken by the `UPDATE` serialises concurrent spins on one session, so parallel requests cannot exceed 4.
- `sessions.won_spin_id → spins.id` is declared `DEFERRABLE INITIALLY DEFERRED`, because the session row points at a spin inserted by the same statement.

### `leads`

| Column | Type | Rules |
|---|---|---|
| `id` | uuid PK | |
| `spin_id` | uuid FK → spins, UNIQUE | One lead per winning spin; must reference a spin with `rule_id IS NOT NULL` |
| `win_ref`, `discount` | copied from `spins` on insert | Never taken from the form; `CHECK (discount IN (10, 15, 20))` |
| `first_name`, `last_name` | text | Required, 1–80 chars |
| `phone` | text | Required, UK format validated |
| `email` | text | Required, validated |
| `postcode` | text | Required, UK postcode format |
| `marketing_consent` | boolean | Unticked by default |
| `consent_text` | text | Exact wording shown, for audit |
| `created_at` | timestamptz | |
| `crm_status` | `'pending' \| 'synced' \| 'failed'` | Starts `pending` |
| `crm_attempts` | smallint | Incremented per try |
| `crm_next_try_at` | timestamptz | Earliest time of the next send attempt. Set to `now()` on insert; after a failure, `now() + backoff` (5 min, 15 min, 1 h, then 6 h per attempt). Stops traffic-driven retries from hammering SharpSpring |
| `crm_lead_id` | text null | SharpSpring lead ID once synced |
| `crm_last_error` | text null | |
| `claimed_via` | `'form' \| 'phone'` | `phone` set by staff lookup |

Lead lifecycle:

```text
pending ──send ok──▶ synced
   │
   └──send fails──▶ pending (attempts+1, crm_next_try_at pushed back) ──… 10 attempts ──▶ failed (shown in staff export for manual entry)
```

Send attempts come from four places, all free on the Vercel Hobby plan (see [contracts/lead-api.md](./contracts/lead-api.md#retry-strategy-vercel-hobby-plan)): the instant send after `/api/lead`, traffic-driven retries piggybacked on `/api/session` and `/api/spin`, a once-a-day Vercel Cron backstop, and an optional external pinger.

## Reel RNG

No weights. Each reel picks one of the 8 symbol IDs with `crypto.randomInt(8)`. Try 1 redraws the three 20% triples with a bounded loop; tries 2–4 remain uniform. Rows above and below the payline are cosmetic. Preview-only `FORCE_REELS` is ignored in production.

## AssetEntry

One row per file in `assets/manifest.json` (schema in [contracts/asset-manifest.md](./contracts/asset-manifest.md)). Drives the Phase C asset board and the runtime loader.

| Field | Type | Rules |
|---|---|---|
| `key` | string | Unique, e.g. `face.scott.closed` |
| `group` | `'background' \| 'cabinet' \| 'symbols' \| 'faces' \| 'emblem' \| 'fx' \| 'ui' \| 'fonts' \| 'audio'` | Asset board sections, in this order (matches `groups` in [contracts/asset-manifest.md](./contracts/asset-manifest.md)) |
| `file` | path | Under `public/assets/` |
| `status` | `'needed' \| 'placeholder' \| 'draft' \| 'approved'` | Board shows status badge |
| `source` | `'supplied' \| 'generated' \| 'cc0' \| 'licensed' \| 'custom'` | |
| `licence` | string | Required unless `supplied` |
| `sourceUrl` | string \| null | Where it came from |

## Data retention (UK GDPR)

| Data | Kept for | Removed by |
|---|---|---|
| `sessions` with no win, and their `spins` | 90 days (matches the `tr_sid` cookie life) | Daily `crm-sync` cron job, cleanup step |
| `sessions.ip_hash` | 2 days (only needed for the daily cap) | Same cleanup step sets it to null |
| `leads`, winning `spins` and their `sessions` | `LEAD_RETENTION_DAYS` (owner confirms at Phase F; placeholder 730 days) | Same cleanup step, only for leads with `crm_status = 'synced'` |

Leads in `pending` or `failed` are never auto-deleted, so no lead is lost before it reaches SharpSpring or staff. SharpSpring holds its own copy under Trust's CRM retention policy.
