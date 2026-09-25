import { describe, expect, it } from "vitest";
import { cabinetBulbAlpha } from "../../src/scene/cabinet";

describe("cabinet bulb patterns", () => {
  it("keeps all pattern values visible and bounded", () => {
    for (let frame = 0; frame <= 720; frame += 1) {
      for (let bulb = 0; bulb < 24; bulb += 1) {
        const alpha = cabinetBulbAlpha(bulb, 24, frame / 60, false);
        expect(alpha).toBeGreaterThanOrEqual(0.16);
        expect(alpha).toBeLessThanOrEqual(1);
      }
    }
  });

  it("holds every bulb steady for reduced motion", () => {
    expect(cabinetBulbAlpha(0, 24, 0, true)).toBe(0.78);
    expect(cabinetBulbAlpha(23, 24, 11.9, true)).toBe(0.78);
  });
});
