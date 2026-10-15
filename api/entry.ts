import type { VercelRequest, VercelResponse } from "@vercel/node";
import { background } from "./_lib/background.js";
import { error, json, methodNotAllowed } from "./_lib/http.js";
import { readSessionId } from "./_lib/session.js";
import { buildPostback, postbackUrl, sendPostback, type Send } from "./_lib/sharpspring.js";
import { isValidSsTrackingId, splitFullName, validateLead } from "../src/game/leadValidation.js";

interface EntryDependencies { waitUntil?: (work: Promise<unknown>) => void; send?: Send; url?: string | undefined }

function body(request: VercelRequest): Record<string, unknown> {
  const raw: unknown = request.body;
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
  }
  return raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
}

/** Play gate: tells SharpSpring who is about to play. Sends once, stores nothing, and never blocks the game. */
export function createEntryHandler(dependencies: EntryDependencies = {}) {
  const later = dependencies.waitUntil ?? background;
  const send = dependencies.send ?? sendPostback;

  return async function entryHandler(request: VercelRequest, response: VercelResponse): Promise<void> {
    if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
    try {
      if (!readSessionId(request)) return error(response, 403, "no_session");
      const input = body(request);
      if (typeof input.website === "string" && input.website.trim() !== "") return json(response, 202, { ok: true });

      const checked = validateLead(input as Parameters<typeof validateLead>[0], { optionalContact: true });
      if (!checked.ok) return error(response, 400, "invalid", { fields: checked.fields });

      json(response, 202, { ok: true });
      const url = "url" in dependencies ? dependencies.url : postbackUrl();
      if (!url) return;
      const lead = checked.value;
      const marketingUrl = typeof input.marketingUrl === "string" ? input.marketingUrl.slice(0, 255) : "";
      const ssTrackingId = isValidSsTrackingId(input.ssTrackingId) ? input.ssTrackingId : undefined;
      const { firstName, lastName } = splitFullName(lead.fullName);
      later(send(url, buildPostback({ firstName, lastName, phone: lead.phone, email: lead.email, region: lead.region }, { marketingUrl, ssTrackingId })).catch(() => undefined));
    } catch {
      error(response, 500, "server_error");
    }
  };
}

export default createEntryHandler();
