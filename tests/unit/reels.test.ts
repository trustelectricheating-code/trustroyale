import { describe, expect, it } from "vitest";
import { REEL_ROW_LAYOUT } from "../../src/scene/reels";

describe("reel row presentation", () => {
  it("centres the payline and shows only soft partial neighbouring rows", () => {
    expect(REEL_ROW_LAYOUT[1]).toEqual({ y: 0.5, scale: 1, alpha: 1 });
    expect(REEL_ROW_LAYOUT[0].y).toBeLessThan(0.1);
    expect(REEL_ROW_LAYOUT[2].y).toBeGreaterThan(0.9);
    expect(REEL_ROW_LAYOUT[0].scale).toBeLessThanOrEqual(0.7);
    expect(REEL_ROW_LAYOUT[2].alpha).toBeLessThan(0.7);
  });
});
