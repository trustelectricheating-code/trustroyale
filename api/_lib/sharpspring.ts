import { isValidSsTrackingId } from "../../src/game/leadValidation.js";

export const SOURCE_TAG = "2026 Trust Royale Game Claim";

export interface PostbackLead {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  postcode: string;
  winRef: string;
  discount: number;
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

/** Same field ids as the landing page FORMS key `royale`, so one SharpSpring mapping serves both. */
export function buildPostback(lead: PostbackLead, context: PostbackContext = {}): URLSearchParams {
  const marketingUrl = (context.marketingUrl ?? "").slice(0, 255);
  const body = new URLSearchParams();
  body.set("1", `${lead.firstName} ${lead.lastName}`);
  body.set("3", lead.phone);
  body.set("4", lead.email);
  body.set("76", SOURCE_TAG);
  body.set("204", marketingUrl);
  body.set("234", gclidFrom(marketingUrl));
  body.set("postcode", lead.postcode);
  body.set("win_ref", lead.winRef);
  body.set("discount", String(lead.discount));
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
