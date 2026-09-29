import { describe, expect, it } from "vitest";
import { PAYTABLE } from "../../src/config/paytable";

describe("paytable v2", () => {
  it("defines all seven rows in evaluator precedence order", () => {
    expect(PAYTABLE.map(({ id, discount, celebration }) => ({ id, discount, celebration }))).toEqual([
      { id: "scott-3", discount: 20, celebration: "blink" },
      { id: "fiona-3", discount: 20, celebration: "blink" },
      { id: "gia-3", discount: 20, celebration: "blink" },
      { id: "keith-3", discount: 15, celebration: "blink" },
      { id: "keith-2-any", discount: 15, celebration: "glow" },
      { id: "people-2-plus-1", discount: 15, celebration: "glow" },
      { id: "neos-3", discount: 10, celebration: "pulse" },
    ]);
  });

  it("keeps Gate B display data while adding evaluator patterns", () => {
    expect(PAYTABLE.every((rule) => rule.label.length > 0 && rule.prize === rule.discount)).toBe(true);
    expect(PAYTABLE[4].pattern).toEqual({ counts: { keith: 2 }, anyOther: 1 });
    expect(PAYTABLE[5].pattern).toEqual({ faceCounts: [2, 1] });
    expect(PAYTABLE.map((rule) => rule.discount)).not.toContain(25);
  });
});
