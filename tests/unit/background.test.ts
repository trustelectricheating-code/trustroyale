import { describe, expect, it } from "vitest";
import { floatingFaceScaleY } from "../../src/scene/background";

describe("floating chip and coin motion", () => {
  it("never collapses a round face below 85% height", () => {
    for (let frame = 0; frame <= 3600; frame += 1) {
      const scaleY = floatingFaceScaleY(frame / 60, 1.2, 0.71);
      expect(scaleY).toBeGreaterThanOrEqual(0.85);
      expect(scaleY).toBeLessThanOrEqual(1);
    }
  });
});
