# Contract: Lead capture and CRM sync

## `POST /api/lead` — claim form

Requires the `tr_sid` cookie. The session must own a winning spin with no lead yet.

### Request

```json
{
  "spinId": "7c0e5a1e-…",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "07700 900123",
  "email": "jane@example.com",
  "postcode": "LS1 4AP",
  "marketingConsent": true,
  "website": ""
}
```

`website` is a hidden honeypot field; non-empty = silently accept and discard.

### Processing order (must not change)

1. Validate fields (same rules as client; see [data-model.md → leads](../data-model.md#leads)).
2. Load the spin: must belong to this session and have `rule_id` not null. `discount` and `win_ref` come from the spin row, never the request.
3. **Insert into `leads` with `crm_status = 'pending'`** and commit. This is the point of no loss.
4. Respond to the player immediately.
5. After responding (Vercel `waitUntil`), try one SharpSpring send; update `crm_status`.

### Responses

| Status | Body | Meaning |
|---|---|---|
| 201 | `{ "ok": true, "winRef": "TR-7K3F" }` | Stored (CRM result does not affect this) |
| 200 | `{ "ok": true, "winRef": "TR-7K3F", "duplicate": true }` | Lead already exists for this spin |
| 400 | `{ "error": "invalid", "fields": { "phone": "…" } }` | Validation errors |
| 403 | `{ "error": "not_a_win" }` | Spin not a win or not owned by session |

## SharpSpring send

SharpSpring (Constant Contact Lead Gen & CRM) API v1.2, JSON-RPC:

```http
POST https://api.sharpspring.com/pubapi/v1.2/?accountID={SHARPSPRING_ACCOUNT_ID}&secretKey={SHARPSPRING_SECRET_KEY}
Content-Type: application/json

{
  "method": "createLeads",
  "params": { "objects": [{
    "firstName": "Jane", "lastName": "Smith", "emailAddress": "jane@example.com",
    "phoneNumber": "07700900123", "zipcode": "LS1 4AP",
    "leadStatus": "open",
    "<custom field: trust_royale_discount>": 15,
    "<custom field: trust_royale_win_ref>": "TR-7K3F",
    "<custom field: lead_source_detail>": "Trust Royale"
  }]},
  "id": "<lead uuid>"
}
```

- Custom field system names come from the SharpSpring account (env `SHARPSPRING_FIELD_*`). **Owner/CRM admin must create them** before Phase D.
- If `createLeads` reports the email already exists, call `updateLeads` for that lead instead and treat as synced.
- Success = response `result.creates[0].success == true`; store returned `id` as `crm_lead_id`.
- Exact field names and dedupe behaviour to be confirmed against the live account in Phase D (research R13).

## Retry strategy (Vercel Hobby plan)

Vercel Hobby only allows cron jobs that run **once per day** (±59 min); a more frequent expression fails the deployment. Retries therefore come from four layers, all free:

| Layer | Trigger | Batch | Purpose |
|---|---|---|---|
| 1. Instant send | `waitUntil` after `/api/lead` or the staff phone-claim responds | that lead | Normal path: lead reaches SharpSpring within seconds |
| 2. Traffic piggyback | `waitUntil` after `/api/session` and `/api/spin` respond | up to 5 due leads | Retries during an outage whenever players are active |
| 3. Daily cron backstop | Vercel Cron `0 6 * * *` → `/api/cron/crm-sync` | up to 50 due leads | Guarantees a retry at least once a day with zero traffic |
| 4. External pinger (optional) | cron-job.org (free) every 15 min → `/api/cron/crm-sync` | up to 50 due leads | Restores 15-minute retries during outages; needs no code change |

All layers call one shared function, `retryDueLeads(limit)` in `api/_lib/crmRetry.ts`. A lead is **due** when `crm_status = 'pending'` and `crm_next_try_at <= now()`. Leads are claimed with `UPDATE … SET crm_next_try_at = now() + interval '2 minutes' WHERE id IN (SELECT id … FOR UPDATE SKIP LOCKED LIMIT n) RETURNING …`, so two layers running at once never send the same lead twice. After each failure `crm_attempts` increments and `crm_next_try_at` moves back (5 min, 15 min, 1 h, then 6 h). After 10 failed attempts the status becomes `failed`.

Layer 2 must never slow down or break the player's response: it runs only after the response is sent, catches every error, and is skipped when SharpSpring credentials are not set.

Layer 4 stores `CRON_SECRET` at cron-job.org. That secret can only trigger the retry job and exposes no lead data; rotate it if the pinger is removed.

## `GET /api/cron/crm-sync` — retry job

Scheduled in `vercel.json` as `0 6 * * *` (Hobby-compatible), optionally also called by the external pinger. Protected by `Authorization: Bearer ${CRON_SECRET}`. Calls `retryDueLeads(50)` and returns `{ "sent": n, "failed": n, "remaining": n }`.

## `GET /api/admin/win/{winRef}` — phone-claim lookup

For staff taking calls. Protected by HTTP Basic auth (`ADMIN_USER` / `ADMIN_PASSWORD`). A minimal page `/admin.html` wraps it.

```json
{ "winRef": "TR-7K3F", "discount": 15, "wonAt": "2026-10-02T14:03:00Z", "claimed": false, "claimedVia": null }
```

`POST /api/admin/win/{winRef}/claim` with `{ "via": "phone", "firstName": "…", "lastName": "…", "phone": "…", "email": "…", "postcode": "…" }` — creates the lead row (`claimed_via = 'phone'`) through the same insert-then-sync path, so phone claims reach SharpSpring too.

`GET /api/admin/leads.csv?status=failed|all` — CSV export (backup and manual entry of failed syncs).

## Environment variables

| Name | Purpose |
|---|---|
| `SHARPSPRING_ACCOUNT_ID`, `SHARPSPRING_SECRET_KEY` | API credentials |
| `SHARPSPRING_FIELD_DISCOUNT`, `SHARPSPRING_FIELD_WIN_REF`, `SHARPSPRING_FIELD_SOURCE` | Custom field system names |
| `CRON_SECRET` | Protects the retry job |
| `ADMIN_USER`, `ADMIN_PASSWORD` | Staff lookup |
| `PRIVACY_URL` | Linked beside the consent checkbox |
| `LEAD_RETENTION_DAYS` | Days to keep synced leads before cleanup (owner confirms at Phase F; placeholder 730) |
