import { describe, expect, it } from "vitest";
import { PAYTABLE } from "../../src/config/paytable";
import { SYMBOL_IDS, type SymbolId } from "../../src/config/symbols";
import { evaluate } from "../../src/game/evaluator";

describe("paytable evaluator", () => {
  it("assigns all 512 ordered combinations to at most one precedence rule", () => {
    const counts = new Map<string, number>();
    let wins = 0;
    for (const a of SYMBOL_IDS) for (const b of SYMBOL_IDS) for (const c of SYMBOL_IDS) {
      const result = evaluate([a, b, c]);
      if (result.rule) {
        wins += 1;
        counts.set(result.rule.id, (counts.get(result.rule.id) ?? 0) + 1);
        expect(PAYTABLE.filter((rule) => rule.id === result.rule?.id)).toHaveLength(1);
      }
    }
    expect(Object.fromEntries(counts)).toEqual({
      "scott-3": 1, "fiona-3": 1, "gia-3": 1, "keith-3": 1,
      "keith-2-any": 21, "people-2-plus-1": 27, "neos-3": 1,
    });
    expect(wins).toBe(53);
  });

  it.each<[SymbolId[], string, number]>([
    [["scott", "scott", "scott"], "scott-3", 20],
    [["fiona", "fiona", "fiona"], "fiona-3", 20],
    [["gia", "gia", "gia"], "gia-3", 20],
    [["keith", "keith", "keith"], "keith-3", 15],
    [["keith", "keith", "cherry"], "keith-2-any", 15],
    [["scott", "scott", "keith"], "people-2-plus-1", 15],
    [["neos", "neos", "neos"], "neos-3", 10],
  ])("maps %j only to %s", (reels, id, discount) => {
    expect(evaluate(reels as [SymbolId, SymbolId, SymbolId]).rule).toMatchObject({ id, discount });
  });

  it("applies Keith precedence and excludes non-winning mixes", () => {
    expect(evaluate(["keith", "keith", "scott"]).rule?.id).toBe("keith-2-any");
    expect(evaluate(["keith", "keith", "cherry"]).rule?.id).toBe("keith-2-any");
    expect(evaluate(["keith", "keith", "keith"]).rule?.id).toBe("keith-3");
    for (const reels of [
      ["scott", "fiona", "gia"], ["scott", "keith", "neos"], ["seven", "cherry", "sweets"],
      ["scott", "scott", "cherry"], ["fiona", "fiona", "seven"], ["gia", "gia", "sweets"],
    ] as [SymbolId, SymbolId, SymbolId][]) expect(evaluate(reels).rule).toBeNull();
  });
});
