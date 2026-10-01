import { expect, test, type Route } from "@playwright/test";
import path from "node:path";

test.skip(!process.env.CAPTURE_PHASE_5_8, "Superseded Phase 5–8 captures run only with CAPTURE_PHASE_5_8=1");

const idleSession = { spinsLeft: 3, bonusAvailable: false, state: "idle", win: null };
const win = {
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
const wonSession = {
  spinsLeft: 0,
  bonusAvailable: false,
  state: "won",
  win: { spinId: win.spinId, winRef: win.winRef, ruleId: win.ruleId, discount: win.discount, couponCode: win.couponCode, reels: win.reels },
};

test("capture Phase 5–8 review states", async ({ page }) => {
  test.setTimeout(120_000);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  let returning = false;
  await page.route("**/api/session**", (route: Route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(returning ? wonSession : idleSession) }));
  await page.route("**/api/spin", (route: Route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(win) }));
  const output = path.join(process.cwd(), "reference/_work/phase-d");

  for (const viewport of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
    returning = false;
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(output, `landing-${viewport.width}x${viewport.height}.png`) });

    await page.getByRole("button", { name: "Play" }).click();
    await page.getByRole("button", { name: "Spin the reels" }).click();
    await expect(page.getByRole("heading", { name: "15%" })).toBeVisible();
    await page.getByRole("button", { name: "Copy code" }).click();
    await expect(page.getByText("Copied!")).toBeVisible();
    await page.screenshot({ path: path.join(output, `coupon-copied-${viewport.width}x${viewport.height}.png`) });

    returning = true;
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
    await expect(page.getByText("ROYALE15")).toBeVisible();
    await page.screenshot({ path: path.join(output, `returning-winner-${viewport.width}x${viewport.height}.png`) });

    await page.getByRole("button", { name: "View prize table" }).click();
    await expect(page.locator('[data-rule-id="keith-2-any"]')).toBeVisible();
    await expect(page.locator('[data-rule-id="keith-2-any"]')).toHaveClass(/is-winning/);
    await page.screenshot({ path: path.join(output, `prize-highlight-${viewport.width}x${viewport.height}.png`) });
  }

  returning = true;
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  await expect(page.getByText("ROYALE15")).toBeVisible();
  const fit = await page.evaluate(() => {
    const popup = document.querySelector("#result-popup")!.getBoundingClientRect();
    return { pageScroll: document.documentElement.scrollHeight <= innerHeight, popupFits: popup.top >= 0 && popup.bottom <= innerHeight };
  });
  expect(fit).toEqual({ pageScroll: true, popupFits: true });
  await page.screenshot({ path: path.join(output, "win-popup-320x568.png") });
});
