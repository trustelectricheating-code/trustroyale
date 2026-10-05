// Hand-off from the game to the Trust Royale quote form on the landing page.
// The landing page reads `prize` (win reference) and `discount` to prefill its
// quote form, and its own tracking reads the attribution keys we pass back.
export const QUOTE_URL = "https://ty.trustelectricheating.co.uk/trust-royale/";

export const ATTRIBUTION_KEYS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "gclid", "gbraid", "wbraid", "fbclid", "msclkid",
] as const;

export interface ClaimedPrize { winRef: string; discount: number }

export function quoteUrl(search: string, prize?: ClaimedPrize | null): string {
  const incoming = new URLSearchParams(search);
  const outgoing = new URLSearchParams();
  for (const key of ATTRIBUTION_KEYS) {
    const value = incoming.get(key)?.trim();
    if (value) outgoing.set(key, value.slice(0, 500));
  }
  if (prize) {
    outgoing.set("prize", prize.winRef);
    outgoing.set("discount", String(prize.discount));
  }
  const query = outgoing.toString();
  return `${QUOTE_URL}${query ? `?${query}` : ""}#quote`;
}
