import { describe, expect, it } from "vitest";
import { computeLayout, type LayoutRect, type SafeAreaInsets } from "../../src/scene/layout";

const NONE: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

function expectInside(inner: LayoutRect, outer: LayoutRect): void {
  expect(inner.x).toBeGreaterThanOrEqual(outer.x - 0.001);
  expect(inner.y).toBeGreaterThanOrEqual(outer.y - 0.001);
  expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width + 0.001);
  expect(inner.y + inner.height).toBeLessThanOrEqual(outer.y + outer.height + 0.001);
}

describe("computeLayout", () => {
  it.each([
    ["portrait", 390, 844, NONE, "portrait"],
    ["landscape", 844, 390, NONE, "landscape"],
    ["ultrawide", 3440, 1440, NONE, "landscape"],
    ["small phone", 320, 568, { top: 20, right: 0, bottom: 16, left: 0 }, "portrait"],
  ] as const)("contains the full machine on a %s viewport", (_name, width, height, insets, orientation) => {
    const layout = computeLayout(width, height, insets);
    expect(layout.orientation).toBe(orientation);
    for (const frame of [layout.marquee, layout.paytable, layout.machine, layout.spinButton, layout.chipTray]) expectInside(frame, layout.safeBounds);
    expect(layout.machine.width).toBeGreaterThan(0);
    expect(layout.machine.height).toBeGreaterThan(0);
    expect(layout.background.x).toBeLessThanOrEqual(0);
    expect(layout.background.y).toBeLessThanOrEqual(0);
    expect(layout.background.x + layout.background.width).toBeGreaterThanOrEqual(width);
    expect(layout.background.y + layout.background.height).toBeGreaterThanOrEqual(height);
    expectInside(layout.spinButton, layout.machine);
    expect(layout.spinButton.width / layout.machine.width).toBeLessThanOrEqual(0.35);
    if (orientation === "landscape") expect(layout.machine.height / layout.safeBounds.height).toBeGreaterThanOrEqual(0.75);
  });

  it("respects every safe-area edge", () => {
    const layout = computeLayout(430, 932, { top: 47, right: 8, bottom: 34, left: 8 });
    for (const frame of [layout.marquee, layout.paytable, layout.machine, layout.spinButton, layout.chipTray]) expectInside(frame, layout.safeBounds);
  });

  it("balances landscape side panels around the cabinet", () => {
    const layout = computeLayout(1920, 1080, NONE);
    expect(layout.paytable.width).toBeCloseTo(layout.chipTray.width);
    expect(layout.paytable.height).toBeCloseTo(layout.chipTray.height);
    expect(layout.paytable.x - layout.safeBounds.x).toBeCloseTo(
      layout.safeBounds.x + layout.safeBounds.width - (layout.chipTray.x + layout.chipTray.width),
    );
  });
});
