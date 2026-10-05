import { afterEach, describe, expect, it } from "vitest";
import { evaluate } from "../../src/game/evaluator";
import { discountForSpin, spinReels, targetDiscount } from "../../api/_lib/rng";

const SECRET = "test-only-session-secret-at-least-32-bytes";

afterEach(() => {
  delete process.env.FORCE_REELS;
  delete process.env.VERCEL_ENV;
});

describe("reel RNG", () => {
  it("assigns per-game targets at 10/50/40 and every game has its target by spin three", () => {
    const counts = { 10: 0, 15: 0, 20: 0 };
    for (let game = 0; game < 100_000; game += 1) {
      const sessionId = `session-${game}`;
      const target = targetDiscount(sessionId, SECRET);
      counts[target] += 1;
      const discounts = [1, 2, 3].map((spinNo) => discountForSpin(sessionId, spinNo, SECRET));
      expect(discounts.every((discount) => discount === null || discount <= target)).toBe(true);
      expect(discounts[2]).toBe(target);
      expect(Math.max(...discounts.map((discount) => discount ?? 0))).toBe(target);
    }
    expect(counts[20] / 100_000).toBeCloseTo(0.1, 2);
    expect(counts[15] / 100_000).toBeCloseTo(0.5, 2);
    expect(counts[10] / 100_000).toBeCloseTo(0.4, 2);
  }, 30_000);

  it("deals the exact target prize on the final regular spin", () => {
    for (let game = 0; game < 500; game += 1) {
      const sessionId = `full-game-${game}`;
      const { reels, strip } = spinReels({ sessionId, spinNo: 3, secret: SECRET });
      expect(strip[1]).toEqual(reels);
      expect(evaluate(reels).rule?.discount).toBe(targetDiscount(sessionId, SECRET));
    }
  });

  it("keeps stale Last Chance sessions harmless and prize-paying", () => {
    for (let game = 0; game < 100; game += 1) {
      const sessionId = `stale-session-${game}`;
      expect(discountForSpin(sessionId, 4, SECRET)).toBe(targetDiscount(sessionId, SECRET));
    }
  });

  it("honours FORCE_REELS outside production only", () => {
    process.env.FORCE_REELS = "gia,gia,gia";
    expect(spinReels().reels).toEqual(["gia", "gia", "gia"]);
    process.env.VERCEL_ENV = "production";
    expect(Array.from({ length: 30 }, () => spinReels().reels).some((reels) => reels.some((id) => id !== "gia"))).toBe(true);
  });
});
