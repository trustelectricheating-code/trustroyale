import { createHmac, randomInt } from "node:crypto";
import type { Discount } from "../../src/config/paytable.js";
import { SYMBOL_IDS, type SymbolId } from "../../src/config/symbols.js";
import { evaluate } from "../../src/game/evaluator.js";

export interface ReelSpin {
  reels: [SymbolId, SymbolId, SymbolId];
  strip: [[SymbolId, SymbolId, SymbolId], [SymbolId, SymbolId, SymbolId], [SymbolId, SymbolId, SymbolId]];
}

export interface SpinOptions { bonus?: boolean; sessionId?: string; spinNo?: number; secret?: string }

function randomRow(): [SymbolId, SymbolId, SymbolId] {
  return [SYMBOL_IDS[randomInt(SYMBOL_IDS.length)], SYMBOL_IDS[randomInt(SYMBOL_IDS.length)], SYMBOL_IDS[randomInt(SYMBOL_IDS.length)]];
}

export function forcedReels(): [SymbolId, SymbolId, SymbolId] | null {
  if (process.env.VERCEL_ENV === "production" || !process.env.FORCE_REELS) return null;
  const values = process.env.FORCE_REELS.split(",").map((value) => value.trim());
  return values.length === 3 && values.every((value): value is SymbolId => SYMBOL_IDS.includes(value as SymbolId))
    ? values as [SymbolId, SymbolId, SymbolId]
    : null;
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required");
  return secret;
}

function percentile(value: string, secret: string): number {
  return createHmac("sha256", secret).update(value).digest().readUInt32BE(0) % 100;
}

// One immutable target per game: 10% get 20% off, 50% get 15% off, 40% get 10% off.
export function targetDiscount(sessionId: string, secret = sessionSecret()): Discount {
  const roll = percentile(sessionId, secret);
  return roll < 10 ? 20 : roll < 60 ? 15 : 10;
}

export function discountForSpin(sessionId: string, spinNo: number, secret = sessionSecret()): Discount | null {
  const target = targetDiscount(sessionId, secret);
  if (spinNo >= 3) return target;
  const roll = percentile(`${sessionId}:spin:${spinNo}`, secret);
  const candidate: Discount | null = roll < 55 ? null : roll < 75 ? 10 : roll < 95 ? 15 : 20;
  return candidate !== null && candidate <= target ? candidate : null;
}

function rowFor(discount: Discount | null): [SymbolId, SymbolId, SymbolId] {
  if (discount === 10) return ["neos", "neos", "neos"];
  for (;;) {
    const row = randomRow();
    if ((evaluate(row).rule?.discount ?? null) === discount) return row;
  }
}

export function spinReels(options: SpinOptions = {}): ReelSpin {
  const forced = forcedReels();
  if (forced) return { reels: forced, strip: [randomRow(), forced, randomRow()] };
  const discount = options.sessionId && options.spinNo
    ? discountForSpin(options.sessionId, options.spinNo, options.secret)
    : targetDiscount(String(randomInt(2 ** 31)), "preview-only-random-target");
  const reels = rowFor(discount);
  return { reels, strip: [randomRow(), reels, randomRow()] };
}
