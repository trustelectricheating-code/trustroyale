import { describe, expect, it } from "vitest";
import { CABINET_ART } from "../../src/scene/cabinetArt";
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
  ] as const)("keeps important game elements on a %s viewport", (_name, width, height, insets, orientation) => {
    const layout = computeLayout(width, height, insets);
    expect(layout.orientation).toBe(orientation);
    const phoneLandscape = orientation === "landscape" && Math.min(width, height) < 600;
    for (const frame of [layout.marquee, layout.paytable, layout.spinButton, layout.chipTray]) expectInside(frame, layout.safeBounds);
    if (!phoneLandscape) expectInside(layout.machine, layout.safeBounds);
    else {
      const reelWindow = CABINET_ART.reelWindow;
      expectInside({
        x: layout.machine.x + reelWindow.x * layout.machine.scale,
        y: layout.machine.y + reelWindow.y * layout.machine.scale,
        width: reelWindow.width * layout.machine.scale,
        height: reelWindow.height * layout.machine.scale,
      }, layout.safeBounds);
    }
    expect(layout.machine.width).toBeGreaterThan(0);
    expect(layout.machine.height).toBeGreaterThan(0);
    expect(layout.background.x).toBeLessThanOrEqual(0);
    expect(layout.background.y).toBeLessThanOrEqual(0);
    expect(layout.background.x + layout.background.width).toBeGreaterThanOrEqual(width);
    expect(layout.background.y + layout.background.height).toBeGreaterThanOrEqual(height);
    expectInside(layout.spinButton, layout.machine);
    expect(layout.spinButton.width / layout.machine.width).toBeLessThanOrEqual(0.5);
    if (orientation === "landscape") expect(layout.machine.height / layout.safeBounds.height).toBeGreaterThanOrEqual(Math.min(width, height) < 600 ? 0.7 : 0.75);
  });

  it("respects every safe-area edge", () => {
    const layout = computeLayout(430, 932, { top: 47, right: 8, bottom: 34, left: 8 });
    for (const frame of [layout.marquee, layout.paytable, layout.machine, layout.spinButton, layout.chipTray]) expectInside(frame, layout.safeBounds);
  });

  it("docks landscape tray beside the cabinet", () => {
    const layout = computeLayout(1920, 1080, NONE);
    expect(layout.paytable.width).toBeCloseTo(layout.chipTray.width);
    expect(layout.paytable.height).toBeCloseTo(layout.chipTray.height);
    expect(layout.paytable.width / layout.safeBounds.width).toBeLessThan(0.21);
    expect(layout.paytable.height / layout.safeBounds.height).toBeGreaterThanOrEqual(0.08);
    expect(layout.paytable.height / layout.safeBounds.height).toBeLessThanOrEqual(0.16);
    expect(layout.paytable.x + layout.paytable.width).toBeLessThan(layout.machine.x);
    expect(layout.chipTray.x + layout.chipTray.width).toBeLessThan(layout.machine.x);
    expect(layout.chipTray.x).toBeCloseTo(layout.paytable.x);
  });

  it("docks the tracker beside the machine on a landscape phone", () => {
    const layout = computeLayout(844, 390, NONE);
    expect(layout.paytable.x + layout.paytable.width).toBeLessThan(layout.machine.x);
    expect(layout.paytable.x + layout.paytable.width / 2).toBeLessThan(layout.machine.x);
    expect(layout.paytable.y + layout.paytable.height / 2).toBeCloseTo(layout.safeBounds.y + layout.safeBounds.height / 2);
    expect(layout.paytable.width).toBeLessThan(layout.machine.width);
  });

  it.each([[844, 390], [932, 430], [667, 375]] as const)("zooms reels and SPIN on %sx%s landscape phones", (width, height) => {
    const layout = computeLayout(width, height, NONE);
    expect(CABINET_ART.reelWindow.width * layout.machine.scale).toBeGreaterThan(170);
    expect(layout.spinButton.width).toBeGreaterThan(70);
    expect(layout.spinButton.height).toBeGreaterThan(46);
    expectInside(layout.paytable, layout.safeBounds);
    expectInside(layout.spinButton, layout.safeBounds);
  });

  it("seats SPIN inside the measured cabinet opening", () => {
    const layout = computeLayout(1920, 1080, NONE);
    const opening = CABINET_ART.spinButtonOpening;
    const openingFrame = {
      x: layout.machine.x + opening.x * layout.machine.scale,
      y: layout.machine.y + opening.y * layout.machine.scale,
      width: opening.width * layout.machine.scale,
      height: opening.height * layout.machine.scale,
    };
    expectInside(layout.spinButton, openingFrame);
    expect(layout.spinButton.x + layout.spinButton.width / 2).toBeCloseTo(openingFrame.x + openingFrame.width / 2);
    expect(layout.spinButton.y + layout.spinButton.height / 2).toBeCloseTo(openingFrame.y + openingFrame.height / 2);
    expect(layout.spinButton.width).toBeLessThan(openingFrame.width);
    expect(layout.spinButton.height).toBeLessThan(openingFrame.height);
  });

  it.each(["topper", "belly"] as const)("keeps the %s title placement inside the cabinet", (placement) => {
    const layout = computeLayout(1920, 1080, NONE, placement);
    expectInside(layout.marquee, layout.machine);
  });
});
