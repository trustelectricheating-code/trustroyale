import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "phone-small", width: 320, height: 568 },
  { name: "phone-portrait", width: 390, height: 844 },
  { name: "phone-landscape", width: 844, height: 390 },
  { name: "ipad-portrait", width: 1024, height: 1366 },
  { name: "desktop", width: 1920, height: 1080 },
  { name: "desktop-wide", width: 2560, height: 1440 },
  { name: "desktop-ultrawide", width: 3440, height: 1440 },
] as const;

const session = { spinsLeft: 3, bonusAvailable: false, state: "idle", best: null, win: null };

async function ready(page: Page): Promise<void> {
  await page.route("**/api/session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
}

test("full-screen game and prize overlay fit supported layouts", async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await ready(page);
    await page.getByRole("button", { name: "Skip" }).click();

    const result = await page.evaluate(() => {
      const canvas = document.querySelector("canvas")!.getBoundingClientRect();
      const marquee = document.querySelector("#marquee")!.getBoundingClientRect();
      const title = document.querySelector(".marquee__title")!.getBoundingClientRect();
      const symbols = (window as typeof window & { __trustRoyaleDebug?: { reelSymbols: Array<{ width: number; height: number; drumWidth: number }> } }).__trustRoyaleDebug?.reelSymbols ?? [];
      return {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        innerWidth,
        innerHeight,
        canvas: { left: canvas.left, top: canvas.top, right: canvas.right, bottom: canvas.bottom },
        marquee: { left: marquee.left, top: marquee.top, right: marquee.right, bottom: marquee.bottom },
        title: { left: title.left, top: title.top, right: title.right, bottom: title.bottom },
        symbols,
      };
    });

    expect(result.scrollWidth, `${viewport.name} horizontal overflow`).toBeLessThanOrEqual(result.innerWidth);
    expect(result.scrollHeight, `${viewport.name} vertical overflow`).toBeLessThanOrEqual(result.innerHeight);
    expect(result.canvas.left).toBeLessThanOrEqual(0);
    expect(result.canvas.top).toBeLessThanOrEqual(0);
    expect(result.canvas.right).toBeGreaterThanOrEqual(result.innerWidth);
    expect(result.canvas.bottom).toBeGreaterThanOrEqual(result.innerHeight);
    expect(result.title.left).toBeGreaterThan(result.marquee.left);
    expect(result.title.top).toBeGreaterThan(result.marquee.top);
    expect(result.title.right).toBeLessThan(result.marquee.right);
    expect(result.title.bottom).toBeLessThan(result.marquee.bottom);
    expect(result.symbols).toHaveLength(9);
    for (const symbol of result.symbols) {
      expect(symbol.width).toBeGreaterThan(0);
      expect(symbol.height).toBeGreaterThan(0);
      expect(symbol.width).toBeLessThanOrEqual(symbol.drumWidth);
      expect(symbol.height).toBeLessThanOrEqual(symbol.drumWidth);
    }

    await expect(page.locator("#tries-tracker")).toHaveAttribute("aria-label", "3 chips left");
    await expect(page.locator("#spin")).toBeVisible();
    await page.getByRole("button", { name: "Prizes" }).click();
    await expect(page.locator(".intro-prize")).toHaveCount(7);
    const images = page.locator(".intro-prize img");
    await expect(images).toHaveCount(21);
    expect(await images.evaluateAll((nodes) => nodes.every((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.getByRole("button", { name: "Close" }).click();
  }
});
