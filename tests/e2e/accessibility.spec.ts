import { expect, test, type Page, type Route } from "@playwright/test";

const session = { spinsLeft: 3, bonusAvailable: false, state: "idle", best: null, win: null };
const win = {
  spinId: "00000000-0000-4000-8000-000000000020", spinNo: 1,
  reels: ["scott", "scott", "scott"],
  strip: [["seven", "cherry", "sweets"], ["scott", "scott", "scott"], ["neos", "keith", "gia"]],
  outcome: "win", ruleId: "scott-3", discount: 20, winRef: "TR-ABC234", nearMiss: false,
  spinsLeft: 0, bonusAvailable: false, isBonus: false, gameOver: true,
  best: { spinId: "00000000-0000-4000-8000-000000000020", ruleId: "scott-3", discount: 20, winRef: "TR-ABC234" },
};

async function mockApis(page: Page): Promise<void> {
  await page.route("**/api/session**", (route: Route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  await page.route("**/api/spin", (route: Route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(win) }));
}

test("result dialog announces, traps focus, and shows keyboard focus", async ({ page }) => {
  await mockApis(page);
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  await page.getByRole("button", { name: "Let's play!" }).click();
  await page.getByRole("button", { name: "Spin the reels" }).click({ force: true });

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog).toHaveAttribute("aria-live", "assertive");
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "View prize table" })).toBeFocused();
  expect(await page.getByRole("button", { name: "View prize table" }).evaluate((node) => getComputedStyle(node).outlineStyle)).not.toBe("none");
  const contrast = await page.getByRole("button", { name: "View prize table" }).evaluate((node) => {
    const parse = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const luminance = (rgb: number[]) => rgb.map((channel) => channel / 255).map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const style = getComputedStyle(node);
    const values = [luminance(parse(style.color)), luminance(parse(style.backgroundColor))].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  for (let index = 0; index < 4; index += 1) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.querySelector("#result-popup")?.contains(document.activeElement))).toBe(true);
});
