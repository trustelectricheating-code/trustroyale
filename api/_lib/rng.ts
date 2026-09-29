import { randomInt } from "node:crypto";
import { SYMBOL_IDS, type SymbolId } from "../../src/config/symbols";

export interface ReelSpin {
  reels: [SymbolId, SymbolId, SymbolId];
  strip: [[SymbolId, SymbolId, SymbolId], [SymbolId, SymbolId, SymbolId], [SymbolId, SymbolId, SymbolId]];
}

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

export function spinReels(): ReelSpin {
  const reels = forcedReels() ?? randomRow();
  return { reels, strip: [randomRow(), reels, randomRow()] };
}
