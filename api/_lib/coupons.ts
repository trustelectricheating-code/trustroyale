import type { Discount } from "../../src/config/paytable.js";

const FALLBACKS: Record<Discount, string> = {
  10: "ROYALE10",
  15: "ROYALE15",
  20: "ROYALE20",
};

export function couponFor(discount: Discount): string {
  return process.env[`COUPON_CODE_${discount}`]?.trim() || FALLBACKS[discount];
}
