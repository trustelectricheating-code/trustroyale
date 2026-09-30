import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { computeLayout } from "../../src/scene/layout";
import { CABINET_ART } from "../../src/scene/cabinetArt";

test.skip(!process.env.CAPTURE_ROUND1, "Evidence capture runs only with CAPTURE_ROUND1=1");

const output = path.join(process.cwd(), "reference/_work/round1");
const fresh = { spinsLeft: 3, bonusAvailable: false, state: "idle", best: null, win: null };
const best15 = { spinId: "00000000-0000-4000-8000-000000000015", ruleId: "keith-3", discount: 15, winRef: "TR-BANK15" };
const loss = (spinNo: number, spinsLeft: number, nearMiss = false, bonusAvailable = false, gameOver = false) => ({
  spinId: `00000000-0000-4000-8000-00000000000${spinNo}`, spinNo,
  reels: ["seven", "cherry", "sweets"],
  strip: [["scott", "fiona", "gia"], ["seven", "cherry", "sweets"], ["neos", "keith", "seven"]],
  outcome: "retry", ruleId: null, discount: null, couponCode: null, winRef: null, best: null,
  nearMiss, spinsLeft, bonusAvailable, isBonus: spinNo === 4, gameOver,
});
const banked15 = {
  spinId: best15.spinId, spinNo: 1, reels: ["keith", "keith", "keith"],
  strip: [["seven", "cherry", "sweets"], ["keith", "keith", "keith"], ["neos", "scott", "gia"]],
  outcome: "win", ruleId: "keith-3", discount: 15, couponCode: null, winRef: best15.winRef, best: best15,
  nearMiss: false, spinsLeft: 2, bonusAvailable: false, isBonus: false, gameOver: false,
};
const faceLine = {
  ...loss(1, 2),
  reels: ["scott", "keith", "neos"],
  strip: [["seven", "cherry", "sweets"], ["scott", "keith", "neos"], ["fiona", "gia", "seven"]],
};
const final20 = {
  spinId: "00000000-0000-4000-8000-000000000020", spinNo: 3, reels: ["scott", "scott", "scott"],
  strip: [["seven", "cherry", "sweets"], ["scott", "scott", "scott"], ["neos", "keith", "gia"]],
  outcome: "win", ruleId: "scott-3", discount: 20, couponCode: "ROYALE20", winRef: "TR-FINAL20",
  best: { spinId: "00000000-0000-4000-8000-000000000020", ruleId: "scott-3", discount: 20, winRef: "TR-FINAL20" },
  nearMiss: false, spinsLeft: 0, bonusAvailable: false, isBonus: false, gameOver: true,
};

function reelClip(width: number, height: number) {
  const layout = computeLayout(width, height, { top: 0, right: 0, bottom: 0, left: 0 });
  const scale = layout.machine.scale;
  const pad = Math.max(12, 24 * scale);
  return {
    x: Math.max(0, layout.machine.x + CABINET_ART.reelWindow.x * scale - pad),
    y: Math.max(0, layout.machine.y + CABINET_ART.reelWindow.y * scale - pad),
    width: Math.min(width, CABINET_ART.reelWindow.width * scale + pad * 2),
    height: Math.min(height, CABINET_ART.reelWindow.height * scale + pad * 2),
  };
}

async function waitReady(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
}

async function press(locator: Locator): Promise<void> {
  await locator.evaluate((node: HTMLButtonElement) => node.click());
}

async function enter(page: Page): Promise<void> {
  await press(page.getByRole("button", { name: "Skip" }));
}

for (const viewport of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
  test(`round 1 evidence ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(300_000);
    mkdirSync(path.join(output, "spin-frames"), { recursive: true });
    mkdirSync(path.join(output, "best-of-three"), { recursive: true });
    mkdirSync(path.join(output, "chip-vanish"), { recursive: true });
    await page.setViewportSize(viewport);
    let session: object = fresh;
    let results: object[] = [];
    let request = 0;
    await page.route("**/api/session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
    await page.route("**/api/spin", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(results[request++]) }));

    await waitReady(page);
    for (let pageIndex = 1; pageIndex <= 5; pageIndex += 1) {
      await page.screenshot({ path: path.join(output, `keith-intro-${pageIndex}-${viewport.width}x${viewport.height}.png`) });
      if (pageIndex < 5) await press(page.getByRole("button", { name: "Next" }));
    }
    await press(page.getByRole("button", { name: "Let's play!" }));
    await page.waitForTimeout(220);
    await page.screenshot({ path: path.join(output, `chip-handover-${viewport.width}x${viewport.height}.png`) });
    await expect(page.locator("#intro")).not.toBeVisible();
    await page.screenshot({ path: path.join(output, `idle-${viewport.width}x${viewport.height}.png`) });
    await page.screenshot({ path: path.join(output, `chip-tray-3-${viewport.width}x${viewport.height}.png`) });
    await page.screenshot({ path: path.join(output, `cabinet-match-${viewport.width}x${viewport.height}.png`) });
    await page.screenshot({ path: path.join(output, `reel-drums-closeup-${viewport.width}x${viewport.height}.png`), clip: reelClip(viewport.width, viewport.height) });
    const spinBox = await page.locator("#spin").boundingBox();
    if (spinBox) {
      const pad = 55;
      await page.screenshot({ path: path.join(output, `spin-closeup-${viewport.width}x${viewport.height}.png`), clip: {
        x: Math.max(0, spinBox.x - pad), y: Math.max(0, spinBox.y - pad),
        width: Math.min(viewport.width - Math.max(0, spinBox.x - pad), spinBox.width + pad * 2),
        height: Math.min(viewport.height - Math.max(0, spinBox.y - pad), spinBox.height + pad * 2),
      } });
    }

    results = [loss(1, 2)]; request = 0;
    await press(page.locator("#spin"));
    await page.waitForFunction(() => document.documentElement.dataset.spinning === "true");
    await page.waitForTimeout(650);
    await page.screenshot({ path: path.join(output, `mid-spin-${viewport.width}x${viewport.height}.png`) });
    await page.screenshot({ path: path.join(output, `reel-drums-mid-spin-${viewport.width}x${viewport.height}.png`), clip: reelClip(viewport.width, viewport.height) });
    await page.waitForFunction(() => document.documentElement.dataset.spinning !== "true");
    for (let frame = 0; frame < 4; frame += 1) {
      await page.screenshot({ path: path.join(output, "chip-vanish", `${viewport.width}x${viewport.height}-${String(frame + 1).padStart(2, "0")}.png`) });
      await page.waitForTimeout(90);
    }
    await expect(page.getByRole("heading", { name: "So close. Spin again!" })).toBeVisible();
    await page.screenshot({ path: path.join(output, `landed-loss-${viewport.width}x${viewport.height}.png`) });
    await page.screenshot({ path: path.join(output, `chip-tray-2-${viewport.width}x${viewport.height}.png`) });

    session = fresh; results = [loss(2, 2, true)]; request = 0;
    await page.reload(); await page.waitForFunction(() => document.documentElement.dataset.ready === "true"); await enter(page);
    await press(page.locator("#spin"));
    await page.waitForFunction(() => document.documentElement.dataset.nearMiss === "true");
    await page.waitForTimeout(1_700);
    await page.screenshot({ path: path.join(output, `near-miss-${viewport.width}x${viewport.height}.png`) });
    await expect(page.getByRole("heading", { name: "So close. Spin again!" })).toBeVisible();

    session = fresh; results = [faceLine]; request = 0;
    await page.reload(); await page.waitForFunction(() => document.documentElement.dataset.ready === "true"); await enter(page);
    await press(page.locator("#spin"));
    await expect(page.getByRole("heading", { name: "So close. Spin again!" })).toBeVisible();
    await press(page.getByRole("button", { name: "Continue" }));
    await page.screenshot({ path: path.join(output, `face-payline-scott-keith-t-${viewport.width}x${viewport.height}.png`), clip: reelClip(viewport.width, viewport.height) });

    session = fresh; results = [final20]; request = 0;
    await page.reload(); await page.waitForFunction(() => document.documentElement.dataset.ready === "true"); await enter(page);
    await press(page.locator("#spin"));
    await page.waitForFunction(() => document.documentElement.dataset.spinning === "true");
    await page.waitForFunction(() => document.documentElement.dataset.spinning !== "true");
    await page.screenshot({ path: path.join(output, `win-line-${viewport.width}x${viewport.height}.png`) });
    await expect(page.getByRole("heading", { name: "You've won 20% off your order" })).toBeVisible();
    await page.screenshot({ path: path.join(output, `win-popup-${viewport.width}x${viewport.height}.png`) });
    await press(page.getByRole("button", { name: "View prize table" }));
    await page.screenshot({ path: path.join(output, `prizes-highlighted-${viewport.width}x${viewport.height}.png`) });

    session = { spinsLeft: 1, bonusAvailable: false, state: "idle", best: best15, win: null };
    await page.reload(); await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
    await page.screenshot({ path: path.join(output, `chip-tray-1-${viewport.width}x${viewport.height}.png`) });
    session = { spinsLeft: 0, bonusAvailable: true, state: "last_chance", best: null, win: null };
    await page.reload(); await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
    await page.screenshot({ path: path.join(output, `last-chance-gold-chip-${viewport.width}x${viewport.height}.png`) });
    await page.evaluate(() => document.querySelector<HTMLDialogElement>("#result-popup")?.close());
    await page.screenshot({ path: path.join(output, `chip-tray-gold-${viewport.width}x${viewport.height}.png`) });

    session = { spinsLeft: 0, bonusAvailable: false, state: "game_over", best: null, win: null };
    await page.reload(); await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
    await page.evaluate(() => document.querySelector<HTMLDialogElement>("#result-popup")?.close());
    await page.screenshot({ path: path.join(output, `chip-tray-0-${viewport.width}x${viewport.height}.png`) });

    session = fresh; results = [banked15, { ...loss(2, 1), best: best15 }, final20]; request = 0;
    await page.reload(); await page.waitForFunction(() => document.documentElement.dataset.ready === "true"); await enter(page);
    await page.screenshot({ path: path.join(output, "best-of-three", `00-start-${viewport.width}x${viewport.height}.png`) });
    await press(page.locator("#spin"));
    await expect(page.getByRole("heading", { name: "15% banked!" })).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: path.join(output, "best-of-three", `01-banked-15-${viewport.width}x${viewport.height}.png`) });
    await press(page.getByRole("button", { name: "Continue" }));
    await press(page.locator("#spin"));
    await expect(page.getByRole("heading", { name: "So close. Spin again!" })).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: path.join(output, "best-of-three", `02-loss-keeps-15-${viewport.width}x${viewport.height}.png`) });
    await press(page.getByRole("button", { name: "Continue" }));
    await press(page.locator("#spin"));
    await expect(page.getByRole("heading", { name: "You've won 20% off your order" })).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: path.join(output, "best-of-three", `03-final-20-${viewport.width}x${viewport.height}.png`) });
  });
}

test("ten-frame spin sequence and frame-rate sample", async ({ page }) => {
  test.setTimeout(90_000);
  mkdirSync(path.join(output, "spin-frames"), { recursive: true });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.route("**/api/session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fresh) }));
  await page.route("**/api/spin", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(loss(1, 2, true)) }));
  await waitReady(page); await enter(page);
  await press(page.locator("#spin"));
  const fps = await page.evaluate(() => new Promise<number>((resolve) => {
    let frames = 0; const start = performance.now();
    const tick = (now: number) => { frames += 1; if (now - start >= 2_000) resolve(frames / ((now - start) / 1_000)); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }));
  await expect(page.getByRole("heading", { name: "So close. Spin again!" })).toBeVisible({ timeout: 15_000 });
  await page.reload(); await page.waitForFunction(() => document.documentElement.dataset.ready === "true"); await enter(page);
  await press(page.locator("#spin"));
  for (let frame = 0; frame < 10; frame += 1) {
    await page.screenshot({ path: path.join(output, "spin-frames", `${String(frame + 1).padStart(2, "0")}.png`) });
    await page.waitForTimeout(240);
  }
  console.log(`ROUND1_CAPTURE_FPS=${fps.toFixed(1)}`);
});
