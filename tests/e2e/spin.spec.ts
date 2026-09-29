import { expect, test, type Page, type Route } from "@playwright/test";
import path from "node:path";

const session = { spinsLeft: 3, bonusAvailable: false, state: "idle", win: null };
const loss = (spinNo: number, spinsLeft: number, bonusAvailable = false) => ({
  spinId: `00000000-0000-4000-8000-00000000000${spinNo}`,
  spinNo,
  reels: ["seven", "cherry", "sweets"],
  strip: [["scott", "fiona", "gia"], ["seven", "cherry", "sweets"], ["neos", "keith", "seven"]],
  outcome: "retry", ruleId: null, discount: null, winRef: null, nearMiss: spinNo === 2,
  spinsLeft, bonusAvailable, isBonus: spinNo === 4,
});
const win = {
  spinId: "00000000-0000-4000-8000-000000000020", spinNo: 1,
  reels: ["scott", "scott", "scott"],
  strip: [["seven", "cherry", "sweets"], ["scott", "scott", "scott"], ["neos", "keith", "gia"]],
  outcome: "win", ruleId: "scott-3", discount: 20, winRef: "TR-ABC234", nearMiss: false,
  spinsLeft: 0, bonusAvailable: false, isBonus: false,
};

async function mockSession(page: Page): Promise<void> {
  await page.route("**/api/session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
}

async function ready(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
}

async function closeRetry(page: Page): Promise<void> {
  await expect(page.getByText("So close — spin again!")) .toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
}

test("PLAY, staggered reels, retry, Last Chance, and game over", async ({ page }) => {
  await mockSession(page);
  const results = [loss(1, 2), loss(2, 1), loss(3, 0, true), loss(4, 0)];
  let next = 0;
  await page.route("**/api/spin", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(results[next++]) }));
  await ready(page);

  const button = page.locator("#spin");
  await expect(button).toHaveText("PLAY");
  await button.click();
  await expect(button).toHaveText("SPIN");
  await expect(page.locator("#spins-left")).toHaveText("Spins left: 3");

  await button.click();
  await expect(button).toBeDisabled();
  await expect.poll(async () => {
    const stopped = await page.locator("[data-reel]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-stopped")));
    return new Set(stopped).size;
  }, { timeout: 2_000, intervals: [25] }).toBeGreaterThan(1);
  await closeRetry(page);
  await expect(button).toBeEnabled();
  await expect(page.locator("#spins-left")).toHaveText("Spins left: 2");

  await button.click();
  await closeRetry(page);
  await expect(page.getByText("One symbol away")) .toBeHidden();
  await button.click();
  await expect(page.getByRole("heading", { name: "Last Chance!" })).toBeVisible();
  await expect(page.locator("#spins-left")).toHaveText("Spins left: 0");
  await page.getByRole("button", { name: "Spin now" }).click();
  await expect(page.getByRole("heading", { name: "Thanks for playing" })).toBeVisible();
});

test("win popup, keyboard controls, and server errors never show a win", async ({ page }) => {
  await mockSession(page);
  let status = 200;
  await page.route("**/api/spin", async (route: Route) => {
    if (status === 500) await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "server_error" }) });
    else await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(win) });
  });
  await ready(page);
  await page.keyboard.press("Enter");
  await expect(page.locator("#spin")).toHaveText("SPIN");
  await page.keyboard.press("Space");
  await expect(page.locator("#spin")).toBeDisabled();
  await expect(page.getByRole("heading", { name: "You've won 20% off your order" })).toBeVisible();
  await expect(page.getByText("TR-ABC234")).toBeVisible();

  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  status = 500;
  await page.locator("#spin").click();
  await page.locator("#spin").click();
  await expect(page.getByRole("heading", { name: "Machine hiccup, try again" })).toBeVisible();
  await expect(page.getByText(/You've won/)).toHaveCount(0);
});

for (const viewport of [{ name: "desktop", width: 1920, height: 1080 }, { name: "mobile", width: 390, height: 844 }]) {
  test(`captures Phase D states at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockSession(page);
    await page.route("**/api/spin", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(win) }));
    await ready(page);
    const directory = path.join(process.cwd(), "reference/_work/phase-d");
    await page.screenshot({ path: path.join(directory, `landing-${viewport.width}x${viewport.height}.png`) });
    await page.locator("#spin").click();
    await page.locator("#spin").click();
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(directory, `mid-spin-${viewport.width}x${viewport.height}.png`) });
    await expect(page.getByRole("heading", { name: "You've won 20% off your order" })).toBeVisible();
    await page.screenshot({ path: path.join(directory, `win-20-${viewport.width}x${viewport.height}.png`) });
  });
}
