import { query as databaseQuery, type Query } from "./db.js";
import { buildPostback, postbackUrl, sendPostback, type Send } from "./sharpspring.js";

export const MAX_ATTEMPTS = 10;
const GAME_URL = "https://trustroyale-jade.vercel.app/";

/** Minutes to wait after the nth failed attempt: 5, 15, 60, then 360. */
export function backoffMinutes(failedAttempts: number): number {
  return failedAttempts <= 1 ? 5 : failedAttempts === 2 ? 15 : failedAttempts === 3 ? 60 : 360;
}

interface ClaimedLead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  region: string;
  win_ref: string;
  discount: number;
  crm_attempts: number;
}

export interface RetryDeps { query?: Query; send?: Send; url?: string | undefined }
export interface RetryResult { sent: number; failed: number; remaining: number }
export interface DeliveryContext { marketingUrl?: string | null; ssTrackingId?: unknown }

async function claim(query: Query, limit: number, leadId?: string): Promise<ClaimedLead[]> {
  // The 2 minute push-back is the claim: a second layer running now will not see these rows as due.
  return await query<ClaimedLead>(`
    UPDATE leads SET crm_next_try_at = now() + interval '2 minutes'
     WHERE id IN (
       SELECT id FROM leads
        WHERE crm_status = 'pending' AND crm_next_try_at <= now() AND ($2::uuid IS NULL OR id = $2::uuid)
        ORDER BY crm_next_try_at
        LIMIT $1
        FOR UPDATE SKIP LOCKED)
    RETURNING id, first_name, last_name, phone, email, region, win_ref, discount, crm_attempts
  `, [limit, leadId ?? null]);
}

// The leads table keeps no marketing URL or tracking id (no migration), so a retry rebuilds the
// marketing URL from the session's stored UTM keys. Only the first, instant send carries the real one.
async function retryMarketingUrls(query: Query, ids: string[]): Promise<Map<string, string>> {
  const rows = await query<{ id: string; utm: Record<string, string> | null }>(`
    SELECT l.id, s.utm FROM leads l
      JOIN spins sp ON sp.id = l.spin_id
      JOIN sessions s ON s.id = sp.session_id
     WHERE l.id = ANY($1::uuid[])
  `, [ids]);
  return new Map(rows.map((row) => {
    const url = new URL(GAME_URL);
    for (const [key, value] of Object.entries(row.utm ?? {})) url.searchParams.set(key, value);
    return [row.id, url.toString()];
  }));
}

async function deliver(query: Query, lead: ClaimedLead, url: string, send: Send, context: DeliveryContext): Promise<boolean> {
  const attempts = Number(lead.crm_attempts) + 1;
  try {
    await send(url, buildPostback({
      firstName: lead.first_name, lastName: lead.last_name, phone: lead.phone, email: lead.email,
      region: lead.region, winRef: lead.win_ref, discount: Number(lead.discount),
    }, context));
    await query("UPDATE leads SET crm_status = 'synced', crm_attempts = $2::smallint, crm_last_error = NULL WHERE id = $1", [lead.id, attempts]);
    return true;
  } catch (caught) {
    const message = (caught instanceof Error ? caught.message : String(caught)).slice(0, 200);
    await query(`
      UPDATE leads
         SET crm_attempts = $2::smallint,
             crm_last_error = $3,
             crm_status = CASE WHEN $2::smallint >= ${MAX_ATTEMPTS} THEN 'failed' ELSE 'pending' END,
             crm_next_try_at = now() + make_interval(mins => $4::int)
       WHERE id = $1
    `, [lead.id, attempts, message, backoffMinutes(attempts)]);
    return false;
  }
}

/** Layer 1: the instant send for one lead, with the real marketing URL and tracking id. */
export async function sendLeadNow(leadId: string, context: DeliveryContext, deps: RetryDeps = {}): Promise<void> {
  const url = "url" in deps ? deps.url : postbackUrl();
  if (!url) return;
  const query = deps.query ?? databaseQuery;
  const [lead] = await claim(query, 1, leadId);
  if (lead) await deliver(query, lead, url, deps.send ?? sendPostback, context);
}

/** Layers 2 and 3: send up to `limit` due leads. With no postback URL it touches nothing. */
export async function retryDueLeads(limit: number, deps: RetryDeps = {}): Promise<RetryResult> {
  const query = deps.query ?? databaseQuery;
  const url = "url" in deps ? deps.url : postbackUrl();
  const pending = async () => Number((await query<{ count: string }>("SELECT count(*)::text AS count FROM leads WHERE crm_status = 'pending'"))[0]?.count ?? 0);
  if (!url) return { sent: 0, failed: 0, remaining: await pending() };
  const claimed = await claim(query, limit);
  const urls = claimed.length > 0 ? await retryMarketingUrls(query, claimed.map((lead) => lead.id)) : new Map<string, string>();
  const send = deps.send ?? sendPostback;
  let sent = 0;
  let failed = 0;
  for (const lead of claimed) {
    if (await deliver(query, lead, url, send, { marketingUrl: urls.get(lead.id) })) sent += 1; else failed += 1;
  }
  return { sent, failed, remaining: await pending() };
}

/** Layer 2: after a /api/session or /api/spin response. Skipped when no postback URL is set. */
export async function piggyback(query: Query): Promise<void> {
  if (!postbackUrl()) return;
  await retryDueLeads(5, { query });
}
