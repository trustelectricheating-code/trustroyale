import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

test.skip(!process.env.CAPTURE_CASINO_REFRESH, "Casino refresh evidence runs only with CAPTURE_CASINO_REFRESH=1");

const output = path.join(process.cwd(), "test-results/casino-refresh");
const fresh = { spinsLeft: 3, bonusAvailable: false, state: "idle", best: null, win: null };
const best15 = { spinId: "00000000-0000-4000-8000-000000000015", ruleId: "keith-3", discount: 15, winRef: "TR-BANK15" };
const banked15 = {
  spinId: best15.spinId, spinNo: 1, reels: ["keith", "keith", "keith"],
  strip: [["seven", "cherry", "sweets"], ["keith", "keith", "keith"], ["neos", "scott", "gia"]],
  outcome: "win", ruleId: best15.ruleId, discount: 15, winRef: best15.winRef, best: best15,
  nearMiss: false, spinsLeft: 2, bonusAvailable: false, isBonus: false, gameOver: false,
};
const loss = {
  spinId: "00000000-0000-4000-8000-000000000002", spinNo: 2, reels: ["seven", "cherry", "sweets"],
  strip: [["scott", "fiona", "gia"], ["seven", "cherry", "sweets"], ["neos", "keith", "seven"]],
  outcome: "retry", ruleId: null, discount: null, winRef: null, best: best15,
  nearMiss: true, spinsLeft: 1, bonusAvailable: false, isBonus: false, gameOver: false,
};
const best20 = { spinId: "00000000-0000-4000-8000-000000000020", ruleId: "scott-3", discount: 20, winRef: "TR-FINAL20" };
const final20 = {
  spinId: best20.spinId, spinNo: 3, reels: ["scott", "scott", "scott"],
  strip: [["seven", "cherry", "sweets"], ["scott", "scott", "scott"], ["neos", "keith", "gia"]],
  outcome: "win", ruleId: best20.ruleId, discount: 20, winRef: best20.winRef, best: best20,
  nearMiss: false, spinsLeft: 0, bonusAvailable: false, isBonus: false, gameOver: true,
};

async function mockGame(page: Page): Promise<void> {
  let spin = 0;
  const results = [banked15, loss, final20];
  await page.route("**/api/session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fresh) }));
  await page.route("**/api/spin", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(results[spin++]) }));
}

for (const [width, height] of [[390, 844], [844, 390], [932, 430], [1440, 900]] as const) {
  test(`casino refresh evidence ${width}x${height}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockGame(page);
    await page.goto("/");
    await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
    await page.screenshot({ path: path.join(output, `${width}x${height}-intro.png`) });
    await page.getByRole("button", { name: "Let's play!" }).click();
    await page.locator("#spin").click();
    await expect(page.getByText(/^You've banked 15% off! \d spins? left\.$/)).toBeVisible();
    await page.screenshot({ path: path.join(output, `${width}x${height}-mid-game.png`) });
    await page.locator("#spin").click();
    await expect(page.getByText("So close! Spin again.", { exact: true })).toBeVisible();
    await page.locator("#spin").click();
    await expect(page.getByText("You have won 20% off your order, our chief chatters will be contacting you shortly with the next steps")).toBeVisible();
    await page.screenshot({ path: path.join(output, `${width}x${height}-win-message.png`) });
  });
}

test("casino refresh rotate evidence", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockGame(page);
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  await page.getByRole("button", { name: "Let's play!" }).click();
  await page.locator("#spin").click();
  await expect(page.locator("html")).toHaveAttribute("data-background-ready", "true");
  await page.screenshot({ path: path.join(output, "rotate-portrait-started.png") });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator("html")).toHaveAttribute("data-background-orientation", "landscape");
  await expect(page.locator("html")).toHaveAttribute("data-background-ready", "true");
  await page.screenshot({ path: path.join(output, "rotate-landscape-after-start.png") });
});
