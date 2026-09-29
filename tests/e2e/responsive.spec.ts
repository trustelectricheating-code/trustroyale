import { expect, test, type Locator, type Page } from "@playwright/test";
import path from "node:path";
import { computeLayout } from "../../src/scene/layout";
import { CABINET_ART } from "../../src/scene/cabinetArt";

const sizes = [
  [320, 568], [375, 667], [390, 844], [430, 932], [768, 1024], [1024, 768],
  [1366, 768], [1440, 900], [1920, 1080], [2560, 1440], [844, 390],
] as const;
const fresh = { spinsLeft: 3, bonusAvailable: false, state: "idle", best: null, win: null };
const best15 = { spinId: "00000000-0000-4000-8000-000000000015", ruleId: "keith-3", discount: 15, winRef: "TR-BANK15" };
const banked15 = {
  spinId: best15.spinId, spinNo: 1, reels: ["keith", "keith", "keith"],
  strip: [["seven", "cherry", "sweets"], ["keith", "keith", "keith"], ["neos", "scott", "gia"]],
  outcome: "win", ruleId: "keith-3", discount: 15, couponCode: null, winRef: best15.winRef, best: best15,
  nearMiss: false, spinsLeft: 2, bonusAvailable: false, isBonus: false, gameOver: false,
};
const lossWithBest = {
  spinId: "00000000-0000-4000-8000-000000000002", spinNo: 2, reels: ["seven", "cherry", "sweets"],
  strip: [["scott", "fiona", "gia"], ["seven", "cherry", "sweets"], ["neos", "keith", "seven"]],
  outcome: "retry", ruleId: null, discount: null, couponCode: null, winRef: null, best: best15,
  nearMiss: false, spinsLeft: 1, bonusAvailable: false, isBonus: false, gameOver: false,
};
const final20 = {
  spinId: "00000000-0000-4000-8000-000000000020", spinNo: 3, reels: ["scott", "scott", "scott"],
  strip: [["seven", "cherry", "sweets"], ["scott", "scott", "scott"], ["neos", "keith", "gia"]],
  outcome: "win", ruleId: "scott-3", discount: 20, couponCode: "ROYALE20", winRef: "TR-FINAL20",
  best: { spinId: "00000000-0000-4000-8000-000000000020", ruleId: "scott-3", discount: 20, winRef: "TR-FINAL20" },
  nearMiss: false, spinsLeft: 0, bonusAvailable: false, isBonus: false, gameOver: true,
};

interface Rect { x: number; y: number; width: number; height: number; left: number; right: number; top: number; bottom: number }

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height, left: x, right: x + width, top: y, bottom: y + height };
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
}

async function box(locator: Locator): Promise<Rect> {
  const value = await locator.boundingBox();
  if (!value) throw new Error(`Missing box for ${locator}`);
  return rect(value.x, value.y, value.width, value.height);
}

async function assertInside(page: Page, locator: Locator, width: number, height: number): Promise<void> {
  const rect = await box(locator);
  expect(rect.left).toBeGreaterThanOrEqual(0);
  expect(rect.top).toBeGreaterThanOrEqual(0);
  expect(rect.right).toBeLessThanOrEqual(width + 1);
  expect(rect.bottom).toBeLessThanOrEqual(height + 1);
  const fits = await locator.evaluate((node) => node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1);
  expect(fits).toBe(true);
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", width);
}

for (const [width, height] of sizes) {
  test(`full responsive flow ${width}x${height}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    let session: object = fresh;
    const results = [banked15, lossWithBest, final20];
    let request = 0;
    await page.route("**/api/session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
    await page.route("**/api/spin", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(results[request++]) }));
    await page.goto("/");
    await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
    const directory = path.join(process.cwd(), "reference/_work/round1/responsive");

    for (let introPage = 1; introPage <= 5; introPage += 1) {
      const host = page.locator(".intro__host img");
      const speech = page.locator(".intro__speech");
      await assertInside(page, host, width, height);
      await assertInside(page, speech, width, height);
      expect(overlaps(await box(host), await box(speech))).toBe(false);
      await page.screenshot({ path: path.join(directory, `${width}x${height}-intro-${introPage}.png`) });
      if (introPage < 5) await page.getByRole("button", { name: "Next" }).click();
    }
    await page.getByRole("button", { name: "Let's play!" }).click();
    await expect(page.locator("#intro")).not.toBeVisible();

    const tracker = page.locator("#tries-tracker");
    const spin = page.locator("#spin");
    await assertInside(page, tracker, width, height);
    await assertInside(page, spin, width, height);
    await expect(tracker).toHaveAttribute("aria-label", "3 chips left");
    await expect(tracker.locator(".tries-tracker__chip")).toHaveCount(3);
    const layout = computeLayout(width, height, { top: 0, right: 0, bottom: 0, left: 0 });
    const reel = rect(
      layout.machine.x + CABINET_ART.reelWindow.x * layout.machine.scale,
      layout.machine.y + CABINET_ART.reelWindow.y * layout.machine.scale,
      CABINET_ART.reelWindow.width * layout.machine.scale,
      CABINET_ART.reelWindow.height * layout.machine.scale,
    );
    expect(overlaps(await box(tracker), reel)).toBe(false);
    expect(overlaps(await box(tracker), await box(spin))).toBe(false);
    expect(overlaps(reel, await box(spin))).toBe(false);
    await page.screenshot({ path: path.join(directory, `${width}x${height}-chips-3.png`) });

    await spin.click();
    await expect(page.getByRole("heading", { name: "15% banked!" })).toBeVisible();
    await expect(tracker).toHaveAttribute("aria-label", "2 chips left");
    await expect(tracker.locator(".tries-tracker__chip")).toHaveCount(2);
    await page.screenshot({ path: path.join(directory, `${width}x${height}-chips-2-banked.png`) });
    await page.getByRole("button", { name: "Continue" }).click();
    await spin.click();
    await expect(page.getByRole("heading", { name: "So close — spin again!" })).toBeVisible();
    await expect(tracker).toHaveAttribute("aria-label", "1 chip left");
    await expect(tracker.locator(".tries-tracker__chip")).toHaveCount(1);
    await page.screenshot({ path: path.join(directory, `${width}x${height}-chips-1.png`) });
    await page.getByRole("button", { name: "Continue" }).click();
    await spin.click();
    await expect(page.getByRole("heading", { name: "You've won 20% off your order" })).toBeVisible();
    await expect(tracker).toHaveAttribute("aria-label", "0 chips left");
    await expect(tracker.locator(".tries-tracker__chip")).toHaveCount(0);
    await page.screenshot({ path: path.join(directory, `${width}x${height}-chips-0-final.png`) });

    session = { spinsLeft: 0, bonusAvailable: false, state: "won", best: final20.best, win: { ...final20.best, couponCode: final20.couponCode, reels: final20.reels } };
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
    await expect(page.locator("#intro")).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "You've won 20% off your order" })).toBeVisible();
    await page.screenshot({ path: path.join(directory, `${width}x${height}-reload-final.png`) });
  });
}
