import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

test.skip(!process.env.CAPTURE_ITEM18, "Item 18 evidence runs only with CAPTURE_ITEM18=1");

const sizes = [
  [320, 568], [375, 667], [390, 844], [430, 932], [768, 1024], [1024, 768],
  [1366, 768], [1440, 900], [1920, 1080], [2560, 1440], [844, 390],
] as const;

const fresh = { spinsLeft: 3, bonusAvailable: false, state: "idle", best: null, win: null };
const idle = (spinsLeft: number, best: object | null = null) => ({ spinsLeft, bonusAvailable: false, state: "idle", best, win: null });
const best10 = { spinId: "00000000-0000-4000-8000-000000000010", ruleId: "neos-3", discount: 10, winRef: "TR-BANK10" };
const best15 = { spinId: "00000000-0000-4000-8000-000000000015", ruleId: "keith-3", discount: 15, winRef: "TR-BANK15" };
const best20 = { spinId: "00000000-0000-4000-8000-000000000020", ruleId: "scott-3", discount: 20, winRef: "TR-FINAL20" };

const loss = (spinNo: number, spinsLeft: number, bonusAvailable = false, gameOver = false) => ({
  spinId: `00000000-0000-4000-8000-00000000000${spinNo}`, spinNo,
  reels: ["seven", "cherry", "sweets"],
  strip: [["scott", "fiona", "gia"], ["seven", "cherry", "sweets"], ["neos", "keith", "seven"]],
  outcome: "retry", ruleId: null, discount: null, winRef: null, best: null,
  nearMiss: true, spinsLeft, bonusAvailable, isBonus: spinNo === 4, gameOver,
});
const win = (discount: 10 | 15 | 20, best: typeof best10 | typeof best15 | typeof best20, spinsLeft: number, gameOver: boolean) => {
  const symbols = discount === 10 ? ["neos", "neos", "neos"] : discount === 15 ? ["keith", "keith", "keith"] : ["scott", "scott", "scott"];
  return {
    spinId: best.spinId, spinNo: 3 - spinsLeft, reels: symbols,
    strip: [["seven", "cherry", "sweets"], symbols, ["neos", "keith", "gia"]],
    outcome: "win", ruleId: best.ruleId, discount,
    winRef: best.winRef, best, nearMiss: false, spinsLeft, bonusAvailable: false, isBonus: false, gameOver,
  };
};
const final20 = win(20, best20, 0, true);
const finished = { spinsLeft: 0, bonusAvailable: false, state: "won", best: best20, win: { ...best20, reels: final20.reels } };

async function press(locator: Locator): Promise<void> {
  await locator.evaluate((node: HTMLButtonElement) => node.click());
}

for (const [width, height] of sizes) {
  test(`item 18 screen matrix ${width}x${height}`, async ({ page }) => {
    test.setTimeout(600_000);
    const directory = path.join(process.cwd(), "reference/_work/round1/screens", `${width}x${height}`);
    mkdirSync(directory, { recursive: true });
    let session: object = fresh;
    let spinStatus = 200;
    let spinBody: object = loss(1, 2);
    let spinDelay = 0;
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
    await page.route("**/api/spin", async (route) => {
      if (spinDelay) await new Promise((resolve) => setTimeout(resolve, spinDelay));
      await route.fulfill({ status: spinStatus, contentType: "application/json", body: JSON.stringify(spinBody) });
    });
    const shot = async (name: string) => {
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.waitForTimeout(120);
      await page.screenshot({ path: path.join(directory, name), fullPage: true });
    };
    const load = async (nextSession: object) => {
      session = nextSession;
      await page.goto("/");
      await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
    };
    const enter = async () => {
      if (await page.locator("#intro").isVisible()) await press(page.getByRole("button", { name: "Let's play!" }));
      await expect(page.locator("#intro")).not.toBeVisible();
    };
    const spinAndCaptureVanish = async (nextSession: object, reply: object, name: string, lastChance = false) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      spinStatus = 200; spinBody = reply; spinDelay = 0;
      await load(nextSession);
      if (lastChance) await press(page.getByRole("button", { name: "Spin now" }));
      else { await enter(); await press(page.locator("#spin")); }
      await page.waitForFunction(() => document.documentElement.dataset.spinning === "true");
      await page.waitForFunction(() => document.documentElement.dataset.spinning !== "true");
      await page.screenshot({ path: path.join(directory, name), fullPage: true });
      await page.emulateMedia({ reducedMotion: "reduce" });
    };

    await load(fresh);
    await shot("01-menu.png");
    await press(page.getByRole("button", { name: "Let's play!" }));
    await expect(page.locator("#intro")).not.toBeVisible();
    await shot("06-idle-3-chips.png");

    spinStatus = 200; spinBody = loss(1, 2); spinDelay = 2_000;
    await press(page.locator("#spin"));
    await page.waitForFunction(() => document.documentElement.dataset.spinning === "true");
    await shot("07-mid-spin.png");
    await expect(page.getByRole("heading", { name: "So close. Spin again!" })).toBeVisible({ timeout: 15_000 });

    await spinAndCaptureVanish(fresh, loss(1, 2), "08-chip-vanish-white.png");
    await expect(page.getByRole("heading", { name: "So close. Spin again!" })).toBeVisible({ timeout: 15_000 });
    await shot("12-retry-so-close.png");
    await spinAndCaptureVanish(idle(2), loss(2, 1), "09-chip-vanish-red.png");
    await spinAndCaptureVanish(idle(1), loss(3, 0, true), "10-chip-vanish-navy.png");
    await spinAndCaptureVanish({ spinsLeft: 0, bonusAvailable: true, state: "last_chance", best: null, win: null }, loss(4, 0, false, true), "11-chip-vanish-gold.png", true);

    spinStatus = 200; spinBody = win(10, best10, 2, false); spinDelay = 0;
    await load(fresh); await enter(); await press(page.locator("#spin"));
    await expect(page.getByRole("heading", { name: "10% banked!" })).toBeVisible({ timeout: 15_000 });
    await shot("13-banked-10.png");

    spinBody = win(15, best15, 1, false);
    await load(idle(2)); await press(page.locator("#spin"));
    await expect(page.getByRole("heading", { name: "15% banked!" })).toBeVisible({ timeout: 15_000 });
    await shot("14-banked-15.png");

    spinBody = final20;
    await load(idle(1, best15)); await press(page.locator("#spin"));
 await expect(page.getByRole("heading", { name: "20%" })).toBeVisible({ timeout: 15_000 });
    await shot("15-win-20-message.png");

    await load({ spinsLeft: 0, bonusAvailable: true, state: "last_chance", best: null, win: null });
    await expect(page.getByRole("heading", { name: "Last Chance!" })).toBeVisible();
    await shot("16-last-chance-gold.png");
    await load({ spinsLeft: 0, bonusAvailable: false, state: "game_over", best: null, win: null });
    await expect(page.getByRole("heading", { name: "Thanks for playing" })).toBeVisible();
    await shot("17-game-over.png");

    spinStatus = 500; spinBody = { error: "server_error" };
    await load(idle(2)); await press(page.locator("#spin"));
    await expect(page.getByRole("heading", { name: "Machine hiccup, try again" })).toBeVisible({ timeout: 15_000 });
    await shot("18-error-500.png");
    spinStatus = 429; spinBody = { error: "rate_limited" };
    await load(idle(2)); await press(page.locator("#spin"));
    await expect(page.getByRole("heading", { name: "Come back tomorrow" })).toBeVisible({ timeout: 15_000 });
    await shot("19-rate-limited-429.png");

    await load(idle(2)); await press(page.getByRole("button", { name: "Prizes" }));
    await expect(page.locator(".welcome-prize")).toHaveCount(7);
    await shot("20-prize-table.png");
    await load(finished);
 await expect(page.getByRole("heading", { name: "20%" })).toBeVisible();
    await shot("21-returning-finished.png");
    await load(idle(2)); await press(page.locator("#mute"));
    await expect(page.locator("#mute")).toHaveAttribute("aria-label", "Unmute sound");
    await shot("22-muted.png");
  });
}
