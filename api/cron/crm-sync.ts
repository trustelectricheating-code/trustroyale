import { timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { retryDueLeads, type RetryDeps } from "../_lib/crmRetry.js";
import { error, json, methodNotAllowed } from "../_lib/http.js";

function authorised(request: VercelRequest, secret: string | undefined): boolean {
  if (!secret) return false;
  const header = request.headers.authorization;
  const supplied = Uint8Array.from(Buffer.from(typeof header === "string" ? header : ""));
  const expected = Uint8Array.from(Buffer.from(`Bearer ${secret}`));
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function createCrmSyncHandler(deps: RetryDeps = {}) {
  return async function crmSyncHandler(request: VercelRequest, response: VercelResponse): Promise<void> {
    if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
    if (!authorised(request, process.env.CRON_SECRET)) return error(response, 401, "unauthorised");
    try {
      json(response, 200, await retryDueLeads(50, deps));
    } catch {
      error(response, 500, "server_error");
    }
  };
}

export default createCrmSyncHandler();
