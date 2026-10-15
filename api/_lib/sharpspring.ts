import { isValidSsTrackingId } from "../../src/game/leadValidation.js";

export const SOURCE_TAG = "2026 Trust Royale Game Claim";
export const ENTRY_SOURCE_TAG = "2026 Trust Royale Game Entry";
// SharpSpring custom field for the Black Friday discount (Harry 15 Oct 2026; field id 400000066793474).
export const DISCOUNT_FIELD = "black_friday_2026_400000066793474";

export interface PostbackLead {
  firstName: string;
  lastName: string;
  phone?: string | null;
  email: string;
  region?: string | null;
  /** Both set for a claim; both left out for a game entry. */
  winRef?: string;
  discount?: number;
}

export interface PostbackContext { marketingUrl?: string | null; ssTrackingId?: unknown }

/** SharpSpring web-form postback URL. Unset means "do not send": rows stay pending. */
export function postbackUrl(): string | undefined {
  return process.env.SHARPSPRING_POSTBACK_URL?.trim() || undefined;
}

export function gclidFrom(marketingUrl: string): string {
  try {
    return new URL(marketingUrl).searchParams.get("gclid")?.trim().slice(0, 255) ?? "";
  } catch {
    return "";
  }
}

/** Same field ids as the landing page FORMS key `royale`, so one SharpSpring mapping serves both. 296 = region, as on the shared consultation form. */
export function buildPostback(lead: PostbackLead, context: PostbackContext = {}): URLSearchParams {
  const marketingUrl = (context.marketingUrl ?? "").slice(0, 255);
  const body = new URLSearchParams();
  body.set("1", `${lead.firstName} ${lead.lastName}`.trim());
  if (lead.phone) body.set("3", lead.phone);
  body.set("4", lead.email);
  body.set("76", lead.discount === undefined ? ENTRY_SOURCE_TAG : SOURCE_TAG);
  body.set("204", marketingUrl);
  body.set("234", gclidFrom(marketingUrl));
  if (lead.region) body.set("296", lead.region);
  if (lead.winRef !== undefined) body.set("win_ref", lead.winRef);
  if (lead.discount !== undefined) {
    body.set("discount", String(lead.discount));
    body.set(DISCOUNT_FIELD, String(lead.discount));
  }
  if (isValidSsTrackingId(context.ssTrackingId)) body.set("trackingid__sb", context.ssTrackingId);
  return body;
}

export type Send = (url: string, body: URLSearchParams) => Promise<void>;

/** Success is any 2xx. Anything else, or a network error or timeout, throws. */
export const sendPostback: Send = async (url, body) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`SharpSpring responded ${response.status}`);
  } finally {
    clearTimeout(timer);
  }
};
