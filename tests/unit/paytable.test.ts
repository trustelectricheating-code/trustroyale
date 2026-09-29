import { describe, expect, it } from "vitest";
import { PAYTABLE } from "../../src/config/paytable";

describe("paytable v2", () => {
  it("keeps the approved rule order and prizes in one reusable source", () => {
    expect(PAYTABLE).toHaveLength(7);
    expect(PAYTABLE.map(({ id, prize }) => [id, prize])).toEqual([
      ["scott-3", 20],
      ["fiona-3", 20],
      ["gia-3", 20],
      ["keith-3", 15],
      ["faces-2-plus-1", 15],
      ["keith-2-any", 15],
      ["neos-3", 10],
    ]);
    expect(PAYTABLE[4].examples).toHaveLength(4);
    expect(PAYTABLE[4].examples).toEqual([
      ["scott", "scott", "fiona"],
      ["gia", "gia", "keith"],
      ["fiona", "fiona", "scott"],
      ["keith", "keith", "gia"],
    ]);
    expect(PAYTABLE[5].examples).toEqual([
      ["keith", "keith", "cherry"],
      ["keith", "keith", "seven"],
      ["keith", "keith", "scott"],
      ["keith", "keith", "neos"],
    ]);
  });
});
