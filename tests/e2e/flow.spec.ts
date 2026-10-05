import { expect, test, type Locator, type Page } from "@playwright/test";
import { CABINET_ART } from "../../src/scene/cabinetArt";
import { computeLayout, type LayoutRect } from "../../src/scene/layout";
import { flowRetry, flowWin, mockFlow } from "./helpers/flow";

async function ready(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
}

async function trackBannerDurations(page: Page): Promise<void> {
  await page.evaluate(() => {
    const message = document.querySelector("#spin-message")!;
    const durations: number[] = [];
    (window as Window & { __flowBannerDurations?: number[] }).__flowBannerDurations = durations;
    let shownAt: number | undefined;
    new MutationObserver(() => {
      if (message.classList.contains("is-visible")) shownAt ??= performance.now();
      else if (shownAt !== undefined) { durations.push(performance.now() - shownAt); shownAt = undefined; }
    }).observe(message, { attributes: true, attributeFilter: ["class"] });
  });
}

async function bannerDurations(page: Page): Promise<number[]> {
  return page.evaluate(() => (window as Window & { __flowBannerDurations?: number[] }).__flowBannerDurations!);
}

async function startHandover(page: Page) {
  return page.getByRole("button", { name: "Let's play!" }).evaluate((button: HTMLButtonElement) => {
    button.click();
    // Inspect the start atomically; staggered flights only last 720–900 ms.
    return {
      flying: Array.from(document.querySelectorAll(".welcome__handover-chip"), (chip) => {
        const mark = chip.querySelector(".tries-tracker__mark");
        return { face: chip.querySelector("img")?.getAttribute("src"), emblem: mark?.getAttribute("src"), filter: mark ? getComputedStyle(mark).filter : null };
      }),
      targets: Array.from(document.querySelectorAll("#tries-tracker .tries-tracker__chip"), (chip) => ({ visibility: getComputedStyle(chip).visibility, width: chip.getBoundingClientRect().width })),
    };
  });
}

async function onScreen(locator: Locator, width: number, height: number): Promise<LayoutRect> {
  await expect(locator).toBeVisible();
  const box = (await locator.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
  expect(box.y + box.height).toBeLessThanOrEqual(height);
  return box;
}

function overlaps(a: LayoutRect, b: LayoutRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function messageFits(page: Page, width: number, height: number): Promise<void> {
  const message = page.locator("#spin-message");
  const frame = await onScreen(message, width, height);
  expect(await message.evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(22);
  const layout = computeLayout(width, height, { top: 0, right: 0, bottom: 0, left: 0 });
  const reel = CABINET_ART.reelWindow;
  const middleRow = {
    x: layout.machine.x + reel.x * layout.machine.scale,
    y: layout.machine.y + (reel.y + reel.height / 3) * layout.machine.scale,
    width: reel.width * layout.machine.scale,
    height: reel.height * layout.machine.scale / 3,
  };
  expect(overlaps(frame, middleRow)).toBe(false);
  expect(overlaps(frame, (await page.locator("#spin").boundingBox())!)).toBe(false);
  expect(overlaps(frame, (await page.locator("#tries-tracker").boundingBox())!)).toBe(false);
  expect(await message.evaluate((node) => getComputedStyle(node).pointerEvents)).toBe("none");
}

async function spinStopsReady(page: Page): Promise<void> {
  await page.locator("#spin").click();
  await page.waitForFunction(() => document.documentElement.dataset.spinning !== "true");
  // Read immediately, without an assertion's retry hiding a post-reel delay.
  expect(await page.locator("#spin").isEnabled()).toBe(true);
}

for (const [width, height] of [[390, 844], [667, 375], [844, 390], [932, 430], [1440, 900]] as const) {
  test(`three spins need only SPIN and result banners fit ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const requests = await mockFlow(page, [flowRetry(1, 2), flowWin(15, 2, 1), flowWin(20, 3, 0, true)]);
    await ready(page);
    await trackBannerDurations(page);
    await expect(page.locator("#intro [data-intro-mute], #intro .welcome__sound")).toHaveCount(0);
    await expect(page.locator("#intro").getByRole("button", { name: /sound/i })).toHaveCount(0);
    const chips = page.locator(".welcome__rule-chip");
    await expect(chips).toHaveCount(3);
    for (const [index, colour] of ["white", "red", "navy"].entries()) {
      await expect(chips.nth(index).locator("img").first()).toHaveAttribute("src", `/assets/fx/chip-${colour}-face.webp`);
      const mark = chips.nth(index).locator(".tries-tracker__mark");
      await expect(mark).toHaveAttribute("src", "/assets/emblem/neos.svg");
      await expect(mark).toBeVisible();
      expect(await mark.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
      expect(await mark.evaluate((node) => getComputedStyle(node).filter)).toBe("grayscale(1) brightness(0) invert(1)");
      const chipBox = (await chips.nth(index).boundingBox())!;
      const markBox = (await mark.boundingBox())!;
      expect(markBox.width).toBeCloseTo(chipBox.width * .4, 1);
      expect(markBox.x + markBox.width / 2).toBeCloseTo(chipBox.x + chipBox.width / 2, 1);
      expect(markBox.y + markBox.height / 2).toBeCloseTo(chipBox.y + chipBox.height / 2, 1);
    }
    await onScreen(page.locator(".welcome__card"), width, height);
    await onScreen(page.locator(".welcome__agreement"), width, height);
    const play = page.getByRole("button", { name: "Let's play!" });
    await onScreen(play, width, height);
    await play.click();
    await expect(page.locator("#mute")).toBeVisible();
    await expect(page.locator("#tries-tracker .tries-tracker__chip:visible")).toHaveCount(3);
    await expect(page.locator(".welcome__handover-chip")).toHaveCount(0);
    const message = page.locator("#spin-message");
    await expect(message).toHaveAttribute("role", "status");
    await expect(message).toHaveAttribute("aria-live", "polite");
    await expect(message).toHaveAttribute("aria-atomic", "true");
    await spinStopsReady(page);
    await expect(message).toHaveText("So close! Spin again.");
    await expect(message).toHaveClass(/is-visible/);
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(0);
    expect(await message.evaluate((node) => node.contains(document.activeElement))).toBe(false);
    await messageFits(page, width, height);
    await expect(message).toBeEmpty({ timeout: 4_500 });
    expect(requests.spinRequests).toBe(1);
    await spinStopsReady(page);
    await expect(message).toHaveText("You've banked 15% off! 1 spin left.");
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await messageFits(page, width, height);
    await expect(message).toBeEmpty({ timeout: 4_000 });
    const durations = await bannerDurations(page);
    expect(durations).toHaveLength(2);
    for (const duration of durations) {
      expect(duration).toBeGreaterThanOrEqual(2_900);
      expect(duration).toBeLessThanOrEqual(4_500);
    }
    expect(requests.spinRequests).toBe(2);
    await page.locator("#spin").click();
    await expect(page.locator(".result-popup--win")).toBeVisible();
    await expect(page.getByText("You have won 20% off your order, our chief chatters will be contacting you shortly with the next steps")).toBeVisible();
    await expect(message).toBeEmpty();
    expect(requests.spinRequests).toBe(3);
  });
}

test("SPIN immediately clears a near-miss banner and old timers cannot clear the next banner", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requests = await mockFlow(page, [flowRetry(1, 2, true), flowWin(15, 2, 1)]);
  await ready(page);
  await trackBannerDurations(page);
  await page.getByRole("button", { name: "Let's play!" }).click();
  await spinStopsReady(page);
  const message = page.locator("#spin-message");
  await expect(message.locator("p")).toHaveText(["So close! Spin again.", "One symbol away."]);
  await page.locator("#spin").click();
  await expect(message).toBeEmpty();
  await expect(message).toHaveCSS("opacity", "0");
  await page.waitForFunction(() => document.documentElement.dataset.spinning !== "true");
  await expect(message).toHaveText("You've banked 15% off! 1 spin left.");
  await expect(message).toBeEmpty({ timeout: 4_500 });
  const durations = await bannerDurations(page);
  expect(durations).toHaveLength(2);
  expect(durations[0]).toBeLessThan(2_900);
  expect(durations[1]).toBeGreaterThanOrEqual(2_900);
  expect(requests.spinRequests).toBe(2);
});

test("normal-motion banked reels unlock SPIN immediately and the banner cannot intercept it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const requests = await mockFlow(page, [flowWin(15, 1, 2), flowRetry(2, 1)]);
  await ready(page);
  await page.getByRole("button", { name: "Let's play!" }).click();
  await spinStopsReady(page);
  await expect(page.locator("#spin-message")).toHaveText("You've banked 15% off! 2 spins left.");
  await page.locator("#spin").click();
  await expect(page.locator("#spin-message")).toBeEmpty();
  await expect(page.locator("html")).toHaveAttribute("data-spinning", "true");
  await expect.poll(() => requests.spinRequests).toBe(2);
});

test("returning Last Chance session uses the same non-blocking banner and SPIN control", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requests = await mockFlow(page, [{ ...flowWin(20, 4, 0, true), isBonus: true }], { spinsLeft: 0, bonusAvailable: true, state: "last_chance", best: null, win: null });
  await ready(page);
  await expect(page.locator("#spin-message")).toContainText("Last Chance!");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.locator("#spin")).toBeEnabled();
  await expect(page.locator("#tries-tracker")).toHaveAttribute("aria-label", "1 Last Chance chip left");
  await expect(page.locator('[data-chip="gold"]')).toHaveCount(1);
  await page.locator("#spin").click();
  await expect(page.locator(".result-popup--win")).toBeVisible();
  expect(requests.spinRequests).toBe(1);
});

test("branded flying chips replace hidden tracker chips and reveal them on landing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await mockFlow(page, [flowRetry(1, 2)]);
  await ready(page);
  const start = await startHandover(page);
  expect(start.flying).toEqual(["white", "red", "navy"].map((colour) => ({ face: `/assets/fx/chip-${colour}-face.webp`, emblem: "/assets/emblem/neos.svg", filter: "grayscale(1) brightness(0) invert(1)" })));
  expect(start.targets).toHaveLength(3);
  for (const target of start.targets) {
    expect(target.visibility).toBe("hidden");
    expect(target.width).toBeGreaterThan(0);
  }
  const flying = page.locator(".welcome__handover-chip");
  const targets = page.locator("#tries-tracker .tries-tracker__chip");
  await expect(flying).toHaveCount(0, { timeout: 3_000 });
  for (let index = 0; index < 3; index += 1) await expect(targets.nth(index)).toBeVisible();
  await expect(page.locator("#spin")).toBeEnabled();
});

for (const interruption of ["resize", "early SPIN"] as const) {
  test(`handover interrupted by ${interruption} never leaves tracker chips hidden`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await mockFlow(page, [flowRetry(1, 2)]);
    await ready(page);
    const start = await startHandover(page);
    expect(start.flying).toHaveLength(3);
    expect(start.targets.map(({ visibility }) => visibility)).toEqual(["hidden", "hidden", "hidden"]);
    if (interruption === "resize") {
      await page.setViewportSize({ width: 844, height: 390 });
      await expect(page.locator("#tries-tracker .tries-tracker__chip:visible")).toHaveCount(3);
    }
    await page.locator("#spin").click();
    await expect(page.locator(".welcome__handover-chip")).toHaveCount(0);
    await expect(page.locator("#spin-message")).toHaveText("So close! Spin again.");
    await expect(page.locator("#tries-tracker .tries-tracker__chip")).toHaveCount(2);
    await expect(page.locator("#tries-tracker .tries-tracker__chip:visible")).toHaveCount(2);
  });
}

test("missing handover artwork and returning mid-game sessions leave tracker chips visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await mockFlow(page, [flowRetry(1, 2)]);
  await ready(page);
  await page.locator(".welcome__keith").evaluate((node) => node.remove());
  await page.getByRole("button", { name: "Let's play!" }).click();
  await expect(page.locator(".welcome__handover-chip")).toHaveCount(0);
  await expect(page.locator("#tries-tracker .tries-tracker__chip:visible")).toHaveCount(3);
  await page.unroute("**/api/session**");
  await page.route("**/api/session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ spinsLeft: 1, bonusAvailable: false, state: "idle", best: flowWin(15, 1, 2).best, win: null }) }));
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  await expect(page.locator("#intro")).not.toBeVisible();
  await expect(page.locator(".welcome__handover-chip")).toHaveCount(0);
  await expect(page.locator("#tries-tracker .tries-tracker__chip:visible")).toHaveCount(1);
  await expect(page.locator("#spin")).toBeEnabled();
});
