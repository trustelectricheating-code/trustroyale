import { afterEach, describe, expect, it } from "vitest";
import { SYMBOL_IDS } from "../../src/config/symbols";
import { evaluate } from "../../src/game/evaluator";
import { spinReels } from "../../api/_lib/rng";

afterEach(() => {
  delete process.env.FORCE_REELS;
  delete process.env.VERCEL_ENV;
});

describe("reel RNG", () => {
  it("stays uniform with the expected win rate over 100,000 spins", () => {
    const frequencies = Array.from({ length: 3 }, () => Object.fromEntries(SYMBOL_IDS.map((id) => [id, 0])));
    let wins = 0;
    for (let spin = 0; spin < 100_000; spin += 1) {
      const { reels, strip } = spinReels();
      if (evaluate(reels).rule) wins += 1;
      expect(strip[1]).toEqual(reels);
      reels.forEach((symbol, reel) => { frequencies[reel][symbol] += 1; });
    }
    expect(wins / 100_000).toBeGreaterThanOrEqual(0.1005);
    expect(wins / 100_000).toBeLessThanOrEqual(0.1065);
    for (const reel of frequencies) for (const count of Object.values(reel)) {
      expect(count / 100_000).toBeGreaterThan(0.12);
      expect(count / 100_000).toBeLessThan(0.13);
    }
  }, 15_000);

  it("honours FORCE_REELS outside production only", () => {
    process.env.FORCE_REELS = "gia,gia,gia";
    expect(spinReels().reels).toEqual(["gia", "gia", "gia"]);
    process.env.VERCEL_ENV = "production";
    expect(Array.from({ length: 30 }, () => spinReels().reels).some((reels) => reels.some((id) => id !== "gia"))).toBe(true);
  });
});
