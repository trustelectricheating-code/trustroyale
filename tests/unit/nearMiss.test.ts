import { describe, expect, it } from "vitest";
import { SYMBOL_IDS, type SymbolId } from "../../src/config/symbols";
import { evaluate } from "../../src/game/evaluator";

describe("near miss", () => {
  it.each([
    ["scott", "scott", "cherry"], ["fiona", "seven", "fiona"], ["gia", "gia", "neos"],
    ["scott", "fiona", "neos"], ["keith", "scott", "neos"], ["neos", "neos", "sweets"],
  ] as [SymbolId, SymbolId, SymbolId][])('marks %j', (...reels) => expect(evaluate(reels).nearMiss).toBe(true));

  it.each([
    ["seven", "cherry", "sweets"], ["keith", "cherry", "seven"],
  ] as [SymbolId, SymbolId, SymbolId][])('does not mark %j', (...reels) => expect(evaluate(reels).nearMiss).toBe(false));

  it("never marks a winning spin", () => {
    for (const a of SYMBOL_IDS) for (const b of SYMBOL_IDS) for (const c of SYMBOL_IDS) {
      const result = evaluate([a, b, c]);
      if (result.rule) expect(result.nearMiss).toBe(false);
    }
  });
});
