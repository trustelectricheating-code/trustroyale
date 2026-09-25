import { expect, test } from "@playwright/test";
import path from "node:path";

const VIEWPORTS = [
  { name: "phone-small", width: 320, height: 568 },
  { name: "phone-portrait", width: 390, height: 844 },
  { name: "phone-landscape", width: 844, height: 390 },
  { name: "ipad-portrait", width: 1024, height: 1366 },
  { name: "desktop", width: 1920, height: 1080 },
  { name: "desktop-wide", width: 2560, height: 1440 },
  { name: "desktop-ultrawide", width: 3440, height: 1440 },
] as const;

test("full-screen mock fits all required viewports", async ({ page }, testInfo) => {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await page.waitForFunction(() => document.documentElement.dataset.ready === "true" || Boolean(document.documentElement.dataset.error));
    expect(await page.evaluate(() => document.documentElement.dataset.error), `${viewport.name} boot error`).toBeUndefined();
    await expect(page.locator("#paytable > span:not(.paytable__label)"), `${viewport.name} paytable rules`).toHaveCount(7);
    const dimensions = await page.evaluate(() => {
      const bounds = document.querySelector("canvas")?.getBoundingClientRect();
      const marquee = document.querySelector("#marquee")?.getBoundingClientRect();
      const marqueeTitle = document.querySelector(".marquee__title")?.getBoundingClientRect();
      return {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        innerWidth,
        innerHeight,
        canvas: bounds && { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom },
        marquee: marquee && { left: marquee.left, top: marquee.top, right: marquee.right, bottom: marquee.bottom },
        marqueeTitle: marqueeTitle && { left: marqueeTitle.left, top: marqueeTitle.top, right: marqueeTitle.right, bottom: marqueeTitle.bottom },
      };
    });
    expect(dimensions.scrollWidth, `${viewport.name} horizontal overflow`).toBeLessThanOrEqual(dimensions.innerWidth);
    expect(dimensions.scrollHeight, `${viewport.name} vertical overflow`).toBeLessThanOrEqual(dimensions.innerHeight);
    expect(dimensions.canvas, `${viewport.name} canvas exists`).not.toBeNull();
    expect(dimensions.canvas!.left).toBeLessThanOrEqual(0);
    expect(dimensions.canvas!.top).toBeLessThanOrEqual(0);
    expect(dimensions.canvas!.right).toBeGreaterThanOrEqual(dimensions.innerWidth);
    expect(dimensions.canvas!.bottom).toBeGreaterThanOrEqual(dimensions.innerHeight);
    expect(dimensions.marqueeTitle!.left, `${viewport.name} title left inset`).toBeGreaterThan(dimensions.marquee!.left);
    expect(dimensions.marqueeTitle!.top, `${viewport.name} title top inset`).toBeGreaterThan(dimensions.marquee!.top);
    expect(dimensions.marqueeTitle!.right, `${viewport.name} title right inset`).toBeLessThan(dimensions.marquee!.right);
    expect(dimensions.marqueeTitle!.bottom, `${viewport.name} title bottom inset`).toBeLessThan(dimensions.marquee!.bottom);
    await page.screenshot({
      path: path.join(process.cwd(), "tests/e2e/__screenshots__", `${viewport.name}-${viewport.width}x${viewport.height}.png`),
      animations: "disabled",
    });
  }
});
