import { describe, expect, it } from "vitest";
import { FLOATING_ITEM_SPECS, floatingItemCount } from "../../src/scene/background";

describe("decluttered floating items", () => {
  it("uses six edge-only items at every viewport size", () => {
    expect(FLOATING_ITEM_SPECS).toHaveLength(32);
    expect(floatingItemCount(1920, 1080)).toBe(6);
    expect(floatingItemCount(390, 844)).toBe(6);
    expect(floatingItemCount(844, 390)).toBe(6);
    expect(FLOATING_ITEM_SPECS.filter(({ kind }) => kind === "coin")).toHaveLength(8);
    expect(FLOATING_ITEM_SPECS.filter(({ kind }) => kind === "card")).toHaveLength(3);
    expect(FLOATING_ITEM_SPECS.slice(0, 9).filter(({ kind }) => kind === "coin")).toHaveLength(4);
    expect(FLOATING_ITEM_SPECS.every(({ depth }) => depth === "far" || depth === "mid")).toBe(true);
  });

  it("keeps every home position away from the screen edge", () => {
    for (const item of FLOATING_ITEM_SPECS) {
      expect(item.nx).toBeGreaterThanOrEqual(0.05);
      expect(item.nx).toBeLessThanOrEqual(0.95);
      expect(item.ny).toBeGreaterThanOrEqual(0.1);
      expect(item.ny).toBeLessThanOrEqual(0.9);
    }
  });
});
