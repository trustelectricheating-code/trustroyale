import { describe, expect, it } from "vitest";
import manifest from "../../public/assets/manifest.json";
import { SYMBOL_IDS, SYMBOLS } from "../../src/config/symbols";

describe("symbol config", () => {
  it("has fixed unique order and one keyed config per symbol", () => {
    expect(SYMBOL_IDS).toEqual(["scott", "fiona", "gia", "keith", "neos", "cherry", "seven", "sweets"]);
    expect(new Set(SYMBOL_IDS).size).toBe(8);
    expect(Object.keys(SYMBOLS)).toEqual(SYMBOL_IDS);
    expect(SYMBOL_IDS.filter((id) => SYMBOLS[id].kind === "emblem")).toEqual(["neos"]);
  });

  it("provides required frames and only references manifest keys", () => {
    const manifestKeys = new Set(manifest.assets.map(({ key }) => key));
    for (const id of SYMBOL_IDS) {
      const symbol = SYMBOLS[id];
      if (symbol.kind === "face") expect(Object.keys(symbol.frames)).toEqual(["idle", "half", "closed", "win"]);
      else if (symbol.kind === "emblem") expect(Object.keys(symbol.frames)).toEqual(["idle", "pulse"]);
      else expect(Object.keys(symbol.frames)).toEqual(["idle", "shine"]);
      for (const key of Object.values(symbol.frames)) expect(manifestKeys.has(key)).toBe(true);
    }
  });
});
