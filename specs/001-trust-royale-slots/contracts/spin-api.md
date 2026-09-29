# Contract: Game API — `GET /api/session`, `POST /api/spin`

Vercel Functions (Node runtime). State is stored in Neon (see [data-model.md → Database](../data-model.md#database-neon-postgres)).

Both endpoints read or create the signed `tr_sid` session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, 90 days). The client never handles the session ID directly.

## `GET /api/session`

Called on page load. Creates a session if none exists; stores UTM params from the query string on first creation.

```json
{
  "spinsLeft": 3,
  "bonusAvailable": false,
  "state": "idle",
  "win": null
}
```

`state`: `"idle" | "last_chance" | "won" | "claimed" | "game_over"`. `best` contains the highest banked result during play. `win` stays `null` until the game ends, then contains `{ "spinId", "winRef", "ruleId", "discount", "couponCode", "reels" }`.

## `POST /api/spin`

No request body.

### 200 — spin played

```json
{
  "spinId": "7c0e5a1e-…",
  "spinNo": 2,
  "reels": ["keith", "cherry", "keith"],
  "strip": [["seven","scott","neos"],["keith","cherry","keith"],["fiona","sweets","cherry"]],
  "outcome": "win",
  "ruleId": "keith-2-any",
  "discount": 15,
  "couponCode": null,
  "winRef": "TR-7K3F",
  "nearMiss": false,
  "best": { "ruleId": "keith-2-any", "discount": 15, "winRef": "TR-7K3F" },
  "spinsLeft": 1,
  "bonusAvailable": false,
  "isBonus": false,
  "gameOver": false
}
```

`outcome` describes this spin only. `best` is the highest result banked across the session. A 10% or 15% win leaves the remaining regular tries available. A 20% win sets `gameOver: true` immediately. After try 3, any banked prize ends the game; only three losses unlock Last Chance. `couponCode` is null until `gameOver` is true, then comes from the matching server-side `COUPON_CODE_*` setting.
Try 1 redraws any 20% combination; later tries use the uniform RNG unchanged.
`strip[1]` is the payline and always equals `reels`.

### Errors

| Status | Body | Client behaviour |
|---|---|---|
| 403 | `{ "error": "no_spins_left", "state": "won" \| "game_over" }` | Show WON or GAME_OVER screen |
| 429 | `{ "error": "rate_limited" }` | Soft per-IP daily cap hit; show "Come back tomorrow" |
| 500 | `{ "error": "server_error" }` | Stop reels on a non-winning arrangement, "Machine hiccup, try again"; spin is not counted (the single statement rolled back) |

### Guarantees

1. A session can never exceed 4 spins (3 + 1 bonus); `sessions.won_spin_id` always points to the highest winning spin so far.
2. Session increment, win marking and spin insert happen in **one SQL statement** (see [data-model.md → spin counting](../data-model.md#spins)), so they succeed or fail together without an interactive transaction.
3. `reels` evaluated with the shared paytable evaluator always yields exactly `ruleId` (or none). Server asserts before responding.
4. p95 < 300 ms (Neon serverless driver over HTTP, same region as the function).

## Environment variables

| Name | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | set by Vercel ↔ Neon integration | Neon connection (pooled) |
| `SESSION_SECRET` | 32+ random bytes | Signs `tr_sid` cookie |
| `IP_HASH_SALT` | random | Hashes IPs for the soft cap |
| `DAILY_SESSIONS_PER_IP` | `20` | Soft abuse cap: max new sessions per IP per day before `/api/spin` returns 429. `0` turns the cap off |
| `FORCE_REELS` | `gia,gia,gia` | Preview/dev only; ignored in production. Forces the payline for demos and tests; expects a 20% `gia-3` win |
| `CLAIM_PHONE` | `+44…` | Number shown on "Call to claim" |
