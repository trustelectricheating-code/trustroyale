import { expect, test, type Page, type Route } from "@playwright/test";
import { PRIZE_CAROUSEL_RULES } from "../../src/config/paytable";

const idleSession = { spinsLeft: 3, bonusAvailable: false, state: "idle", win: null };
const keithWin = {
  spinId: "00000000-0000-4000-8000-000000000015",
  spinNo: 1,
  reels: ["keith", "keith", "cherry"],
  strip: [["seven", "sweets", "neos"], ["keith", "keith", "cherry"], ["fiona", "gia", "scott"]],
  outcome: "win",
  ruleId: "keith-2-any",
  discount: 15,
  couponCode: "ROYALE15",
  winRef: "TR-KEI215",
  nearMiss: false,
  spinsLeft: 0,
  bonusAvailable: false,
  isBonus: false,
};

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
}

async function mockSession(page: Page): Promise<void> {
  await page.route("**/api/session**", (route: Route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(idleSession) }));
}

test("portrait paytable stays above the reels and expands accessibly", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSession(page);
  await page.goto("/");
  await ready(page);

  const paytable = page.locator("#paytable");
  const expand = page.getByRole("button", { name: "See all prizes" });
  await expect(paytable).toBeVisible();
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  expect(await paytable.evaluate((node) => node.getBoundingClientRect().bottom)).toBeLessThan(844 * 0.4);

  await expand.click();
  await expect(expand).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#prize-overlay .prize-overlay__rule")).toHaveCount(7);
  await page.getByRole("button", { name: "Close all prizes" }).click();
  await expect(expand).toHaveAttribute("aria-expanded", "false");
});

test("desktop lists all rules and highlights the winning rule", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await mockSession(page);
  await page.route("**/api/spin", (route: Route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(keithWin) }));
  await page.goto("/");
  await ready(page);

  await page.getByRole("button", { name: "See all prizes" }).click();
  const rows = page.locator("#prize-overlay .prize-overlay__rule");
  await expect(rows).toHaveCount(7);
  await expect(rows.locator(".prize-overlay__label")).toHaveText(PRIZE_CAROUSEL_RULES.map(({ fullLabel }) => fullLabel));
  await page.getByRole("button", { name: "Close all prizes" }).click();

  await page.getByRole("button", { name: "Play" }).click();
  await page.getByRole("button", { name: "Spin the reels" }).click();
  await expect(page.getByRole("heading", { name: "You've won 15% off your order" })).toBeVisible();
  await expect(page.locator('[data-rule-id="keith-2-any"]')).toHaveClass(/is-winning/);
});
