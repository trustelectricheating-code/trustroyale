import { randomUUID } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { background } from "./_lib/background.js";
import { sendLeadNow, type RetryDeps } from "./_lib/crmRetry.js";
import { query as databaseQuery, type Query } from "./_lib/db.js";
import { error, json, methodNotAllowed } from "./_lib/http.js";
import { readSessionId } from "./_lib/session.js";
import { CONSENT_TEXT, isValidSsTrackingId, validateLead } from "../src/game/leadValidation.js";

interface LeadDependencies { query?: Query; waitUntil?: (work: Promise<unknown>) => void; send?: RetryDeps["send"]; url?: RetryDeps["url"] }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function body(request: VercelRequest): Record<string, unknown> {
  const raw: unknown = request.body;
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
  }
  return raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
}

export function createLeadHandler(dependencies: LeadDependencies = {}) {
  const query = dependencies.query ?? databaseQuery;
  const later = dependencies.waitUntil ?? background;

  return async function leadHandler(request: VercelRequest, response: VercelResponse): Promise<void> {
    if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
    try {
      const sessionId = readSessionId(request);
      if (!sessionId) return error(response, 403, "not_a_win");
      const input = body(request);

      // Honeypot: a bot gets the same answer as a person, and nothing is stored.
      if (typeof input.website === "string" && input.website.trim() !== "") return json(response, 201, { ok: true });

      const checked = validateLead(input as Parameters<typeof validateLead>[0]);
      const spinId = typeof input.spinId === "string" ? input.spinId : "";
      if (!checked.ok || !UUID.test(spinId)) {
        const fields: Record<string, string> = checked.ok ? {} : { ...checked.fields };
        if (!UUID.test(spinId)) fields.spinId = "Missing or invalid spin.";
        return error(response, 400, "invalid", { fields });
      }

      // The prize is read from the spin row, never from the request. It must be this session's winning spin.
      const spins = await query<{ id: string; win_ref: string; discount: number }>(`
        SELECT sp.id, sp.win_ref, sp.discount
          FROM spins sp JOIN sessions s ON s.id = sp.session_id
         WHERE sp.id = $1 AND sp.session_id = $2 AND sp.rule_id IS NOT NULL AND s.won_spin_id = sp.id
      `, [spinId, sessionId]);
      const spin = spins[0];
      if (!spin) return error(response, 403, "not_a_win");

      const lead = checked.value;
      const leadId = randomUUID();
      // Point of no loss: the row commits before the player hears anything.
      const inserted = await query<{ id: string }>(`
        INSERT INTO leads (id, spin_id, win_ref, discount, first_name, last_name, phone, email, postcode, marketing_consent, consent_text, claimed_via)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, 'form')
        ON CONFLICT (spin_id) DO NOTHING
        RETURNING id
      `, [leadId, spin.id, spin.win_ref, spin.discount, lead.firstName, lead.lastName, lead.phone, lead.email, lead.postcode, CONSENT_TEXT]);
      if (inserted.length === 0) return json(response, 200, { ok: true, winRef: spin.win_ref, duplicate: true });

      json(response, 201, { ok: true, winRef: spin.win_ref });
      const marketingUrl = typeof input.marketingUrl === "string" ? input.marketingUrl.slice(0, 255) : "";
      const ssTrackingId = isValidSsTrackingId(input.ssTrackingId) ? input.ssTrackingId : undefined;
      const deps: RetryDeps = { query };
      if (dependencies.send) deps.send = dependencies.send;
      if ("url" in dependencies) deps.url = dependencies.url;
      later(sendLeadNow(leadId, { marketingUrl, ssTrackingId }, deps));
    } catch {
      error(response, 500, "server_error");
    }
  };
}

export default createLeadHandler();
