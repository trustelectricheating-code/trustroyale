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
    const reelSymbols = await page.evaluate(() => (
      window as Window & { __trustRoyaleDebug?: { reelSymbols: Array<{ symbol: string; drumWidth: number; width: number; height: number }> } }
    ).__trustRoyaleDebug?.reelSymbols);
    expect(reelSymbols, `${viewport.name} reel debug metrics`).toHaveLength(9);
    expect(reelSymbols?.some((symbol) => symbol.symbol === "gia"), `${viewport.name} Gia on reels`).toBe(true);
    for (const symbol of reelSymbols ?? []) {
      expect(symbol.width, `${viewport.name} ${symbol.symbol} width`).toBeLessThanOrEqual(symbol.drumWidth * 0.64);
      expect(symbol.height, `${viewport.name} ${symbol.symbol} height`).toBeLessThanOrEqual(symbol.drumWidth * 0.64);
    }
    await expect(page.locator("#paytable > span:not(.paytable__label)"), `${viewport.name} paytable rules`).toHaveCount(7);
    expect(await page.locator("#paytable > .paytable__rule").evaluateAll((rules) => rules.map((rule) => rule.getAttribute("aria-label")))).toEqual([
      "Scott times three, 20 percent",
      "Fiona times three, 20 percent",
      "Gia times three, 20 percent",
      "Keith times three, 15 percent",
      "Two of Scott, Fiona, Gia, or Keith plus one different person, 15 percent",
      "Keith times two plus any, 15 percent",
      "Neos times three, 10 percent",
    ]);
    await expect(page.locator("#paytable > .paytable__rule img"), `${viewport.name} paytable medallions`).toHaveCount(21);
    await expect(page.locator('#paytable img[src="/assets/mock/gia-medallion.webp"]'), `${viewport.name} Gia paytable medallions`).toHaveCount(4);
    await expect(page.locator(".marquee__frame-bulb"), `${viewport.name} framing bulbs`).toHaveCount(34);
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

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/?title=topper");
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  await expect(page.locator(".marquee__frame-bulbs"), "topper reuses cabinet arch bulbs").toBeHidden();
});
