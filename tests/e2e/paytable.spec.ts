import { expect, test, type Page, type Route } from "@playwright/test";
import { PAYTABLE } from "../../src/config/paytable";

const idleSession = { spinsLeft: 3, bonusAvailable: false, state: "idle", best: null, win: null };
const best = { spinId: "00000000-0000-4000-8000-000000000015", ruleId: "keith-2-any", discount: 15, winRef: "TR-KEI215" };
const finalWin = {
  spinId: best.spinId,
  spinNo: 3,
  reels: ["keith", "keith", "cherry"],
  strip: [["seven", "sweets", "neos"], ["keith", "keith", "cherry"], ["fiona", "gia", "scott"]],
  outcome: "win",
  ruleId: best.ruleId,
  discount: best.discount,
  winRef: best.winRef,
  best,
  nearMiss: false,
  spinsLeft: 0,
  bonusAvailable: false,
  isBonus: false,
  gameOver: true,
};

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
}

async function mockSession(page: Page): Promise<void> {
  await page.route("**/api/session**", (route: Route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(idleSession) }));
}

test("portrait prize menu fits and exposes every rule", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSession(page);
  await page.goto("/");
  await ready(page);
  await page.getByRole("button", { name: "See every winning line" }).click();

  const dialog = page.locator("#intro");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".welcome-prize")).toHaveCount(7);
  expect(await dialog.locator(".welcome-prize").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")))).toEqual(PAYTABLE.map((rule) => rule.ariaLabel));
  const fit = await dialog.locator(".welcome__card").evaluate((node) => {
    const box = node.getBoundingClientRect();
    return box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight
      && node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1;
  });
  expect(fit).toBe(true);
  await page.getByRole("button", { name: "Back to menu" }).click();
});

test("final popup reopens prizes on the winning rule", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await mockSession(page);
  await page.route("**/api/spin", (route: Route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(finalWin) }));
  await page.goto("/");
  await ready(page);
  await page.getByRole("button", { name: "Let's play!" }).click();
  await page.getByRole("button", { name: "Spin the reels" }).click({ force: true });
  await expect(page.getByRole("heading", { name: "15%" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "View prize table" }).click();
  await expect(page.locator(".welcome-prize")).toHaveCount(7);
  await expect(page.locator('[data-rule-id="keith-2-any"]')).toBeVisible();
  await expect(page.locator('[data-rule-id="keith-2-any"]')).toHaveClass(/is-winning/);
});
