import { randomInt } from "node:crypto";
import { SYMBOL_IDS, type SymbolId } from "../../src/config/symbols.js";
import { evaluate } from "../../src/game/evaluator.js";

export interface ReelSpin {
  reels: [SymbolId, SymbolId, SymbolId];
  strip: [[SymbolId, SymbolId, SymbolId], [SymbolId, SymbolId, SymbolId], [SymbolId, SymbolId, SymbolId]];
}
export interface SpinOptions { bonus?: boolean }

function randomRow(): [SymbolId, SymbolId, SymbolId] {
  return [SYMBOL_IDS[randomInt(8)], SYMBOL_IDS[randomInt(8)], SYMBOL_IDS[randomInt(8)]];
}

export function forcedReels(): [SymbolId, SymbolId, SymbolId] | null {
  if (process.env.VERCEL_ENV === "production" || !process.env.FORCE_REELS) return null;
  const values = process.env.FORCE_REELS.split(",").map((value) => value.trim());
  return values.length === 3 && values.every((value): value is SymbolId => SYMBOL_IDS.includes(value as SymbolId))
    ? values as [SymbolId, SymbolId, SymbolId]
    : null;
}

// Per spin: 20% no prize, 40% a 15% prize, 40% a 10% prize. The 20% prize is never dealt.
// The Last Chance bonus spin always pays, split evenly between 15% and 10%.
function pickDiscount(bonus: boolean): 10 | 15 | null {
  const roll = bonus ? 20 + randomInt(80) : randomInt(100);
  return roll < 20 ? null : roll < 60 ? 15 : 10;
}

function rowFor(discount: 10 | 15 | null): [SymbolId, SymbolId, SymbolId] {
  // Three Neos is the only 10% rule, so there is nothing to sample.
  if (discount === 10) return ["neos", "neos", "neos"];
  for (;;) {
    const row = randomRow();
    if ((evaluate(row).rule?.discount ?? null) === discount) return row;
  }
}

export function spinReels(options: SpinOptions = {}): ReelSpin {
  const reels = forcedReels() ?? rowFor(pickDiscount(Boolean(options.bonus)));
  return { reels, strip: [randomRow(), reels, randomRow()] };
}
