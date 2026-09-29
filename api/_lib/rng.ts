import { randomInt } from "node:crypto";
import { SYMBOL_IDS, type SymbolId } from "../../src/config/symbols.js";

export interface ReelSpin {
  reels: [SymbolId, SymbolId, SymbolId];
  strip: [[SymbolId, SymbolId, SymbolId], [SymbolId, SymbolId, SymbolId], [SymbolId, SymbolId, SymbolId]];
}
export interface SpinOptions { excludeTwenty?: boolean }

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

function isTwenty(reels: readonly SymbolId[]): boolean {
  return reels[0] === reels[1] && reels[1] === reels[2] && (reels[0] === "scott" || reels[0] === "fiona" || reels[0] === "gia");
}

export function spinReels(options: SpinOptions = {}): ReelSpin {
  let reels = forcedReels() ?? randomRow();
  if (options.excludeTwenty) {
    for (let attempt = 0; attempt < 32 && isTwenty(reels); attempt += 1) reels = randomRow();
    if (isTwenty(reels)) reels = ["neos", "cherry", "seven"];
  }
  return { reels, strip: [randomRow(), reels, randomRow()] };
}
