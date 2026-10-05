import { expect, test, type Locator, type Page } from "@playwright/test";

const fresh = { spinsLeft: 3, bonusAvailable: false, state: "idle", best: null, win: null };
const best = { spinId: "00000000-0000-4000-8000-000000000020", ruleId: "scott-3", discount: 20, winRef: "TR-SENIOR20" };
const finalWin = {
  spinId: best.spinId, spinNo: 3, reels: ["scott", "scott", "scott"],
  strip: [["seven", "cherry", "sweets"], ["scott", "scott", "scott"], ["neos", "keith", "gia"]],
  outcome: "win", ruleId: best.ruleId, discount: 20, winRef: best.winRef, best,
  nearMiss: false, spinsLeft: 0, bonusAvailable: false, isBonus: false, gameOver: true,
};

async function press(locator: Locator): Promise<void> {
  await locator.evaluate((node: HTMLButtonElement) => node.click());
}

async function minimumSize(locator: Locator, pixels = 56): Promise<void> {
  const box = await locator.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(pixels);
}

async function fontSize(locator: Locator, pixels: number): Promise<void> {
  expect(await locator.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(pixels);
}

test("phone controls and win message are senior friendly", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fresh) }));
  await page.route("**/api/spin", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(finalWin) }));
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");

  await fontSize(page.locator("#intro h1"), 24);
  await fontSize(page.locator(".welcome__rules"), 18);
 const actions = page.locator(".welcome__actions button");
  for (let index = 0; index < await actions.count(); index += 1) await minimumSize(actions.nth(index));
  await expect(page.locator("#intro [data-intro-mute], #intro .welcome__sound")).toHaveCount(0);

  await press(page.getByRole("button", { name: "Let's play!" }));
  await expect(page.locator("#intro")).not.toBeVisible();
  await minimumSize(page.locator("#mute"));
  await minimumSize(page.locator("#prizes"));
  await minimumSize(page.locator("#spin"));
  await press(page.locator("#spin"));
 await expect(page.getByRole("heading", { name: "20%" })).toBeVisible({ timeout: 15_000 });
  await fontSize(page.locator("#result-popup h2"), 24);
  await fontSize(page.locator(".result-popup__instruction"), 18);
  await fontSize(page.locator("#result-popup p").first(), 18);
  // "View prize table" is hidden by design on screens shorter than 600px, so only visible buttons are measured.
  const resultButtons = page.locator("#result-popup button:visible");
  for (let index = 0; index < await resultButtons.count(); index += 1) await minimumSize(resultButtons.nth(index));
  expect(await page.locator("body").innerText()).not.toMatch(/[—–]/);
  expect(await page.locator("#result-popup h2").evaluate((node) => getComputedStyle(node).textWrap)).toBe("balance");
  expect(await page.locator("#result-popup p").first().evaluate((node) => getComputedStyle(node).textWrap)).toBe("pretty");
});
