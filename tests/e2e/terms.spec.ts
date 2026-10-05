import { expect, test, type Locator } from "@playwright/test";
import { mockTermsGame } from "./helpers/terms";

async function onScreen(locator: Locator, width: number, height: number): Promise<void> {
  await expect(locator).toBeVisible();
  const box = (await locator.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
  expect(box.y + box.height).toBeLessThanOrEqual(height);
}

for (const [width, height] of [[390, 844], [667, 375], [844, 390], [932, 430], [1440, 900]] as const) {
  test(`terms preserve welcome and win screens at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const requests = await mockTermsGame(page);
    await page.goto("/");
    await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
    const agreement = page.locator(".welcome__agreement");
    await expect(agreement).toHaveText("By pressing Let's play! you agree to our terms and conditions.");
    await onScreen(agreement, width, height);
    const play = page.getByRole("button", { name: "Let's play!" });
    await onScreen(play, width, height);
    const welcomeLink = page.getByRole("link", { name: "terms and conditions", exact: true });
    await welcomeLink.focus();
    await page.keyboard.press("Enter");
    const terms = page.getByRole("dialog", { name: "Terms and conditions", exact: true });
    await onScreen(terms, width, height);
    await expect(terms).toHaveAttribute("aria-modal", "true");
    await expect(terms.locator(".terms-dialog__list > li")).toHaveText([
      "Trust Royale is a promotional game run by Trust Electric Heating.",
      "Each game gives you 3 spins. Every completed game wins a discount, and only your best prize counts.",
      "Win probability. Each game's prize is picked at random by our system, and how or when you press SPIN does not change it: 20% off: 1 in 10 games (10%)15% off: 5 in 10 games (50%)10% off: 4 in 10 games (40%)",
      "The discount applies to NEOS radiators only. It does not apply to delivery or installation.",
      "The Ocean range, and any other range of products, are not included in this offer.",
      "After you win, our chief chatters will contact you with the next steps to use your discount.",
    ]);
    expect(await terms.evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(18);
    await page.keyboard.press("Tab");
    const close = terms.getByRole("button", { name: "Close", exact: true });
    await expect(close).toBeFocused();
    await terms.locator(".terms-dialog__list > li").last().scrollIntoViewIfNeeded();
    await onScreen(terms.locator(".terms-dialog__list > li").last(), width, height);
    await onScreen(close, width, height);
    await close.click();
    await expect(terms).not.toBeVisible();
    await expect(welcomeLink).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("data-intro", "open");
    expect(requests.spinRequests).toBe(0);
    await welcomeLink.click();
    expect(await terms.evaluate((node) => node.scrollTop)).toBe(0);
    await page.keyboard.press("Escape");
    await expect(terms).not.toBeVisible();
    await expect(welcomeLink).toBeFocused();
    await play.click();
    await expect(page.locator("#intro")).not.toBeVisible();
    expect(requests.spinRequests).toBe(0);
    await page.locator("#spin").click();
    await expect(page.locator(".result-popup--win")).toBeVisible();
    const winLink = page.getByRole("link", { name: "Terms and conditions", exact: true });
    await onScreen(winLink, width, height);
    expect((await winLink.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await winLink.click();
    await expect(terms).toBeVisible();
    await expect(terms).toContainText("Win probability.");
    await expect(terms).toContainText("The discount applies to NEOS radiators only.");
    await close.click();
    await expect(winLink).toBeFocused();
    await winLink.click();
    await page.keyboard.press("Escape");
    await expect(terms).not.toBeVisible();
    await expect(winLink).toBeFocused();
    await expect(page.locator(".result-popup--win")).toBeVisible();
    expect(requests.spinRequests).toBe(1);
  });
}
