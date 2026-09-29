import { expect, test, type Locator, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { computeLayout } from "../../src/scene/layout";
import { CABINET_ART } from "../../src/scene/cabinetArt";

const freshSession = { spinsLeft: 3, bonusAvailable: false, state: "idle", best: null, win: null };
const loss = (spinNo: number, spinsLeft: number, bonusAvailable = false, gameOver = false) => ({
  spinId: `00000000-0000-4000-8000-00000000000${spinNo}`,
  spinNo,
  reels: ["seven", "cherry", "sweets"],
  strip: [["scott", "fiona", "gia"], ["seven", "cherry", "sweets"], ["neos", "keith", "seven"]],
  outcome: "retry", ruleId: null, discount: null, couponCode: null, winRef: null, best: null,
  nearMiss: spinNo === 2, spinsLeft, bonusAvailable, isBonus: spinNo === 4, gameOver,
});
const banked15 = {
  spinId: "00000000-0000-4000-8000-000000000015", spinNo: 1,
  reels: ["keith", "keith", "keith"],
  strip: [["seven", "cherry", "sweets"], ["keith", "keith", "keith"], ["neos", "scott", "gia"]],
  outcome: "win", ruleId: "keith-3", discount: 15, couponCode: null, winRef: "TR-BANK15",
  best: { spinId: "00000000-0000-4000-8000-000000000015", ruleId: "keith-3", discount: 15, winRef: "TR-BANK15" },
  nearMiss: false, spinsLeft: 2, bonusAvailable: false, isBonus: false, gameOver: false,
};
const final20 = {
  spinId: "00000000-0000-4000-8000-000000000020", spinNo: 3,
  reels: ["scott", "scott", "scott"],
  strip: [["seven", "cherry", "sweets"], ["scott", "scott", "scott"], ["neos", "keith", "gia"]],
  outcome: "win", ruleId: "scott-3", discount: 20, couponCode: "ROYALE20", winRef: "TR-FINAL20",
  best: { spinId: "00000000-0000-4000-8000-000000000020", ruleId: "scott-3", discount: 20, winRef: "TR-FINAL20" },
  nearMiss: false, spinsLeft: 0, bonusAvailable: false, isBonus: false, gameOver: true,
};

async function mockSession(page: Page, body: object = freshSession): Promise<void> {
  await page.route("**/api/session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) }));
}

async function ready(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  const missing = await page.evaluate(() => (window as Window & { __trustRoyaleDebug?: { missingReelTextures: string[] } }).__trustRoyaleDebug?.missingReelTextures);
  expect(missing).toEqual([]);
}

async function enterGame(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: "Welcome to Trust Royale" })).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.locator("#intro")).not.toBeVisible();
}

test("production CSP is present and fresh players see all four intro pages", async ({ page }) => {
  await mockSession(page);
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain("script-src 'self'");
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  await expect(page.getByRole("heading", { name: "Welcome to Trust Royale" })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Win on any try and keep spinning. Your best prize counts, up to 20%.")) .toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.locator(".intro-prize")).toHaveCount(7);
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Your code appears at the end" })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Here are your 3 lucky chips — one per spin!" })).toBeVisible();
  await page.getByRole("button", { name: "Let's play!" }).click();
  await expect(page.locator("#spin")).toBeEnabled();
  await expect(page.locator("#spin")).toHaveText("SPIN");
});

test("loading click is remembered as intro entry and never becomes a spin", async ({ page }) => {
  let spinRequests = 0;
  await page.route("**/api/session**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(freshSession) });
  });
  await page.route("**/api/spin", async (route) => {
    spinRequests += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(loss(1, 2)) });
  });
  await page.goto("/");
  await page.locator("#loading").click();
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  await expect(page.getByRole("heading", { name: "Welcome to Trust Royale" })).toBeVisible();
  await page.waitForTimeout(1_000);
  expect(spinRequests).toBe(0);
});

test("only deliberate spin actions issue requests, including retry and Last Chance", async ({ page }) => {
  test.setTimeout(65_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockSession(page);
  const results = [loss(1, 2), loss(2, 1), loss(3, 0, true), loss(4, 0, false, true)];
  let requests = 0;
  await page.route("**/api/spin", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(results[requests++]) }));
  await ready(page);
  await enterGame(page);

  await page.locator("#prizes").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Line up the middle row" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Space");
  await page.waitForTimeout(10_000);
  expect(requests).toBe(0);

  const button = page.locator("#spin");
  await button.click();
  await expect(page.getByRole("heading", { name: "So close — spin again!" })).toBeVisible();
  await page.waitForTimeout(10_000);
  expect(requests).toBe(1);
  await button.click();
  await expect(page.getByText("One symbol away")) .toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await button.click();
  await expect(page.getByRole("heading", { name: "Last Chance!" })).toBeVisible();
  await page.keyboard.press("Enter");
  expect(requests).toBe(3);
  await page.getByRole("button", { name: "Spin now" }).click();
  await expect(page.getByRole("heading", { name: "Thanks for playing" })).toBeVisible();
  expect(requests).toBe(4);
});

test("touch tap at 390x844 starts exactly one spin", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await mockSession(page);
  let requests = 0;
  await page.route("**/api/spin", (route) => { requests += 1; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(loss(1, 2)) }); });
  await ready(page);
  await enterGame(page);
  await page.locator("#spin").tap();
  await expect(page.getByRole("heading", { name: "So close — spin again!" })).toBeVisible();
  expect(requests).toBe(1);
  await context.close();
});

test("spin motion and sound start before a delayed API response", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/spin", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(loss(1, 2)) });
  });
  await ready(page);
  await enterGame(page);
  const timing = await page.evaluate(() => {
    const pressed = performance.now();
    document.querySelector<HTMLButtonElement>("#spin")?.click();
    return {
      pressed,
      motion: Number(document.documentElement.dataset.spinMotionAt),
      sound: Number(document.documentElement.dataset.spinSoundAt),
      spinning: document.documentElement.dataset.spinning,
    };
  });
  expect(timing.spinning).toBe("true");
  expect(timing.motion - timing.pressed).toBeLessThan(100);
  expect(timing.sound - timing.pressed).toBeLessThan(100);
  await page.waitForTimeout(250);
  await expect(page.locator("html")).toHaveAttribute("data-spinning", "true");
  await expect(page.getByRole("heading", { name: "So close — spin again!" })).toBeVisible({ timeout: 10_000 });
});

test("failed spin restores the machine without stuck motion or sound", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/spin", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "server_error" }) });
  });
  await ready(page);
  await enterGame(page);
  expect(await page.evaluate(() => { document.querySelector<HTMLButtonElement>("#spin")?.click(); return document.documentElement.dataset.spinning; })).toBe("true");
  await expect(page.getByRole("heading", { name: "Machine hiccup, try again" })).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-spinning", "true");
  await expect(page.locator("html")).toHaveAttribute("data-last-stopped-sound", "reel.loop");
  await expect(page.locator("#spin")).toBeEnabled();
});

test("intro and popup menu buttons play the soft click, including the first gesture", async ({ page }) => {
  test.setTimeout(60_000);
  const expectLarge = async (button: Locator): Promise<void> => {
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(48);
    expect(box?.width).toBeGreaterThanOrEqual(48);
  };
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockSession(page);
  await page.route("**/api/spin", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(loss(1, 2)) }));
  await ready(page);
  expect(await page.locator("html").getAttribute("data-sound-play-count")).toBeNull();
  await expectLarge(page.getByRole("button", { name: "Next" }));
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-last-sound", "button");
  const afterNext = Number(await page.locator("html").getAttribute("data-sound-play-count"));
  await expectLarge(page.getByRole("button", { name: "Back" }));
  await page.getByRole("button", { name: "Back" }).click();
  await expect.poll(async () => Number(await page.locator("html").getAttribute("data-sound-play-count"))).toBeGreaterThan(afterNext);
  await page.getByRole("button", { name: "Skip" }).click();
  const afterSkip = Number(await page.locator("html").getAttribute("data-sound-play-count"));
  await expectLarge(page.getByRole("button", { name: "Prizes" }));
  await page.getByRole("button", { name: "Prizes" }).click();
  await page.getByRole("button", { name: "Close" }).click();
  await expect.poll(async () => Number(await page.locator("html").getAttribute("data-sound-play-count"))).toBeGreaterThan(afterSkip + 1);
  await page.locator("#spin").click();
  await expect(page.getByRole("heading", { name: "So close — spin again!" })).toBeVisible();
  await expectLarge(page.getByRole("button", { name: "Continue" }));
  const beforeContinue = Number(await page.locator("html").getAttribute("data-sound-play-count"));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect.poll(async () => Number(await page.locator("html").getAttribute("data-sound-play-count"))).toBeGreaterThan(beforeContinue);
});

test("best-of-three waits for presses and reveals only final coupon", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockSession(page);
  const second = { ...loss(2, 1), best: banked15.best };
  const results = [banked15, second, final20];
  let requests = 0;
  await page.route("**/api/spin", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(results[requests++]) }));
  await ready(page);
  await enterGame(page);
  const button = page.locator("#spin");
  await button.click();
  await expect(page.getByRole("heading", { name: "15% banked!" })).toBeVisible();
  await expect(page.locator("#tries-tracker")).toContainText("Best: 15%");
  await expect(page.getByText("ROYALE20")).toHaveCount(0);
  await page.waitForTimeout(1_000);
  expect(requests).toBe(1);
  await button.click();
  await expect(page.getByRole("heading", { name: "So close — spin again!" })).toBeVisible();
  await button.click();
  await expect(page.getByRole("heading", { name: "You've won 20% off your order" })).toBeVisible();
  await expect(page.getByText("ROYALE20")).toBeVisible();
  expect(requests).toBe(3);
  await page.getByRole("button", { name: "View prize table" }).click();
  await expect(page.locator('[data-rule-id="scott-3"]')).toHaveClass(/is-winning/);
});

test("returning mid-game player skips intro and resumes tracker", async ({ page }) => {
  await mockSession(page, { spinsLeft: 1, bonusAvailable: false, state: "idle", best: banked15.best, win: null });
  await ready(page);
  await expect(page.locator("#intro")).not.toBeVisible();
  await expect(page.locator("#tries-tracker")).toHaveAttribute("aria-label", "1 chip left");
  await expect(page.locator("#tries-tracker")).toContainText("Best: 15%");
});

test("non-face payline symbols contain artwork, never blank white discs", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockSession(page);
  await page.route("**/api/spin", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(loss(1, 2)) }));
  await ready(page); await enterGame(page);
  await page.locator("#spin").click();
  await expect(page.getByRole("heading", { name: "So close — spin again!" })).toBeVisible();
  const screenshot = path.join(mkdtempSync(path.join(tmpdir(), "trust-royale-pixels-")), "payline.png");
  await page.screenshot({ path: screenshot });
  const viewport = page.viewportSize()!;
  const layout = computeLayout(viewport.width, viewport.height, { top: 0, right: 0, bottom: 0, left: 0 });
  const scale = layout.machine.scale;
  const cell = CABINET_ART.reelWindow.width * scale / 3;
  const size = Math.floor(Math.min(cell * 0.72, CABINET_ART.reelWindow.height * scale * 0.52));
  const y = Math.floor(layout.machine.y + (CABINET_ART.reelWindow.y + CABINET_ART.reelWindow.height / 2) * scale - size / 2);
  for (let column = 0; column < 3; column += 1) {
    const x = Math.floor(layout.machine.x + (CABINET_ART.reelWindow.x + CABINET_ART.reelWindow.width * (column + 0.5) / 3) * scale - size / 2);
    const whiteRatio = Number(execFileSync("magick", [screenshot, "-crop", `${size}x${size}+${x}+${y}`, "-colorspace", "gray", "-threshold", "92%", "-format", "%[fx:mean]", "info:"]).toString());
    expect(whiteRatio, `payline column ${column + 1}`).toBeLessThan(0.5);
  }
});
