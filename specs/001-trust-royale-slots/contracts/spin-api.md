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

`state`: `"idle" | "last_chance" | "won" | "claimed" | "game_over"`. When `won` or `claimed`, `win` is `{ "spinId", "winRef", "ruleId", "discount", "reels" }` so a returning player sees their prize again.

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
  "winRef": "TR-7K3F",
  "nearMiss": false,
  "spinsLeft": 0,
  "bonusAvailable": false,
  "isBonus": false
}
```

On `outcome: "retry"`: `ruleId`, `discount`, `winRef` are `null`; `spinsLeft` is 2, 1 or 0. When the third regular spin loses, `bonusAvailable` is `true` and the client shows the Last Chance screen; the next `POST /api/spin` is the bonus spin (`isBonus: true`).
On a win, `spinsLeft` is always 0 (play stops at first win).
`strip[1]` is the payline and always equals `reels`.

### Errors

| Status | Body | Client behaviour |
|---|---|---|
| 403 | `{ "error": "no_spins_left", "state": "won" \| "game_over" }` | Show WON or GAME_OVER screen |
| 429 | `{ "error": "rate_limited" }` | Soft per-IP daily cap hit; show "Come back tomorrow" |
| 500 | `{ "error": "server_error" }` | Stop reels on a non-winning arrangement, "Machine hiccup, try again"; spin is not counted (the single statement rolled back) |

### Guarantees

1. A session can never exceed 4 spins (3 + 1 bonus) or win twice (atomic update, DB `CHECK` and `UNIQUE` constraints).
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
