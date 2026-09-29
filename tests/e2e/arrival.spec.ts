import { expect, test, type Page, type Route } from "@playwright/test";

const session = { spinsLeft: 3, bonusAvailable: false, state: "idle", win: null };
const retry = {
  spinId: "00000000-0000-4000-8000-000000000001",
  spinNo: 1,
  reels: ["seven", "cherry", "sweets"],
  strip: [["scott", "neos", "gia"], ["seven", "cherry", "sweets"], ["keith", "fiona", "neos"]],
  outcome: "retry",
  ruleId: null,
  discount: null,
  couponCode: null,
  winRef: null,
  nearMiss: false,
  spinsLeft: 2,
  bonusAvailable: false,
  isBonus: false,
};

async function mockApis(page: Page): Promise<void> {
  await page.route("**/api/session**", (route: Route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  await page.route("**/api/spin", (route: Route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(retry) }));
}

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
}

test("arrival animates in place, unlocks audio, and persists mute", async ({ page }) => {
  await mockApis(page);
  await page.goto("/");
  await ready(page);
  await expect(page.locator("html")).toHaveAttribute("data-audio-status", "locked");

  const before = await page.evaluate(() => (window as Window & { __trustRoyaleDebug?: { chipPositions?: () => number[][] } }).__trustRoyaleDebug?.chipPositions?.());
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => (window as Window & { __trustRoyaleDebug?: { chipPositions?: () => number[][] } }).__trustRoyaleDebug?.chipPositions?.());
  expect(before).toBeDefined();
  expect(after).not.toEqual(before);

  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-game-state", "idle");
  await page.waitForTimeout(900);
  const chipsStayInside = await page.evaluate(() => ((window as Window & { __trustRoyaleDebug?: { chipPositions?: () => number[][] } }).__trustRoyaleDebug?.chipPositions?.() ?? [])
    .every(([x, y]) => x >= 0 && x <= innerWidth && y >= 0 && y <= innerHeight));
  expect(chipsStayInside).toBe(true);
  await expect(page.getByRole("button", { name: "Mute sound" })).toBeVisible();
  await page.getByRole("button", { name: "Mute sound" }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("trustRoyaleMuted"))).toBe("true");
  await page.reload();
  await ready(page);
  await expect(page.locator("#mute")).toHaveAttribute("aria-label", "Unmute sound");
});

test("reduced motion can play and resolve a spin", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockApis(page);
  await page.goto("/");
  await ready(page);
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-game-state", "idle");
  await page.getByRole("button", { name: "Spin the reels" }).click();
  await expect(page.getByRole("heading", { name: "So close — spin again!" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-game-state", "idle");
});
