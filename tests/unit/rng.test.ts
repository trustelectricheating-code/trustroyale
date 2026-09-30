import { afterEach, describe, expect, it } from "vitest";
import { SYMBOL_IDS } from "../../src/config/symbols";
import { evaluate } from "../../src/game/evaluator";
import { spinReels } from "../../api/_lib/rng";

afterEach(() => {
  delete process.env.FORCE_REELS;
  delete process.env.VERCEL_ENV;
});

describe("reel RNG", () => {
  it("deals no 20% prize and 20/40/40 no prize, 15%, 10% over 100,000 spins", () => {
    const counts = { none: 0, 10: 0, 15: 0, 20: 0 };
    for (let spin = 0; spin < 100_000; spin += 1) {
      const { reels, strip } = spinReels();
      expect(strip[1]).toEqual(reels);
      counts[evaluate(reels).rule?.discount ?? "none"] += 1;
    }
    expect(counts[20]).toBe(0);
    expect(counts.none / 100_000).toBeCloseTo(0.2, 1);
    expect(counts[15] / 100_000).toBeCloseTo(0.4, 1);
    expect(counts[10] / 100_000).toBeCloseTo(0.4, 1);
  }, 30_000);

  it("always pays 10% or 15% on the Last Chance bonus spin", () => {
    const counts = { none: 0, 10: 0, 15: 0, 20: 0 };
    for (let spin = 0; spin < 20_000; spin += 1) counts[evaluate(spinReels({ bonus: true }).reels).rule?.discount ?? "none"] += 1;
    expect(counts.none + counts[20]).toBe(0);
    expect(counts[15] / 20_000).toBeCloseTo(0.5, 1);
  });

  it("honours FORCE_REELS outside production only", () => {
    process.env.FORCE_REELS = "gia,gia,gia";
    expect(spinReels().reels).toEqual(["gia", "gia", "gia"]);
    process.env.VERCEL_ENV = "production";
    expect(Array.from({ length: 30 }, () => spinReels().reels).some((reels) => reels.some((id) => id !== "gia"))).toBe(true);
  });

});
