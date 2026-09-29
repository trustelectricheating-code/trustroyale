import { PAYTABLE, type PaytableRule } from "../config/paytable";
import type { SymbolId } from "../config/symbols";

const FACES = new Set<SymbolId>(["scott", "fiona", "gia", "keith"]);

export interface Evaluation {
  rule: PaytableRule | null;
  nearMiss: boolean;
}

export function evaluate(reels: [SymbolId, SymbolId, SymbolId]): Evaluation {
  const counts = reels.reduce<Partial<Record<SymbolId, number>>>((result, symbol) => {
    result[symbol] = (result[symbol] ?? 0) + 1;
    return result;
  }, {});

  const rule = PAYTABLE.find(({ pattern }) => {
    if ("faceCounts" in pattern) {
      const faceCounts = Object.entries(counts)
        .filter(([symbol]) => FACES.has(symbol as SymbolId))
        .map(([, count]) => count)
        .sort((a, b) => b - a);
      return faceCounts.length === 2 && faceCounts[0] === 2 && faceCounts[1] === 1;
    }
    const required = Object.entries(pattern.counts) as [SymbolId, number][];
    const matched = required.every(([symbol, count]) => counts[symbol] === count);
    const requiredTotal = required.reduce((total, [, count]) => total + count, 0);
    return matched && requiredTotal + (pattern.anyOther ?? 0) === 3;
  }) ?? null;

  if (rule) return { rule, nearMiss: false };
  const faceCount = reels.filter((symbol) => FACES.has(symbol)).length;
  return { rule: null, nearMiss: faceCount === 2 || counts.neos === 2 };
}
