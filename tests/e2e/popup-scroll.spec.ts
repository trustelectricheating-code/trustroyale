import { expect, test, type Locator, type Page } from "@playwright/test";

// Harry 6 Oct: "the menu cta popup not scroll to bottom". On a short desktop window the welcome menu and the
// claim step were taller than the window with overflow hidden, so their buttons could not be reached.
const win = { spinId: "00000000-0000-4000-8000-000000000020", ruleId: "scott-3", discount: 20, winRef: "TR-FINAL20" };
const wonSession = { spinsLeft: 0, bonusAvailable: false, state: "won", best: win, win: { ...win, reels: ["scott", "scott", "scott"] } };
const idleSession = { spinsLeft: 3, bonusAvailable: false, state: "idle", best: null, win: null };
const SHORT_WINDOWS = [[1280, 600], [1366, 657]] as const;

async function wheelTo(page: Page, target: Locator, height: number): Promise<void> {
  await page.mouse.move(640, 300);
  for (let step = 0; step < 20; step += 1) {
    const box = await target.boundingBox();
    if (box && box.y >= 0 && box.y + box.height <= height) return;
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(60);
  }
  throw new Error("The target never scrolled into view by mouse wheel");
}

for (const [width, height] of SHORT_WINDOWS) {
  test(`the welcome menu scrolls inside itself to Let's play! at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.route("**/api/session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(idleSession) }));
    await page.goto("/");
    await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
    const play = page.getByRole("button", { name: "Let's play!" });
    await expect(play).toBeAttached();
    // Since 918f6df (welcome chips) the menu fits some short windows outright; when it does not,
    // it must scroll inside itself. Either way "Let's play!" has to be reachable.
    if (await page.locator("#intro").evaluate((node) => node.scrollHeight > node.clientHeight)) await wheelTo(page, play, height);
    else await expect(play).toBeInViewport();
    await play.click();
    await expect(page.locator("#intro")).not.toHaveJSProperty("open", true);
  });

  test(`the claim step scrolls inside itself to the submit button at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wonSession) }));
    await page.route("**/api/lead", (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, winRef: "TR-FINAL20" }) }));
    await page.goto("/");
    await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
    await page.getByRole("button", { name: "Claim my 20% offer" }).click();
    await page.getByLabel("Full name").fill("Jane Smith");
    await page.getByLabel("Phone number").fill("07911 123456");
    await page.getByLabel("Region").selectOption("London");
    await page.getByLabel("Email").fill("jane@example.com");
    // Scroll the popup back to the top so the wheel has to do the work.
    await page.locator("dialog.result-popup").evaluate((node) => { node.scrollTop = 0; });
    const dialog = page.locator("dialog.result-popup");
    const submit = page.locator("[data-claim-submit]");
    // With one name field the form fits some short windows outright; when it does not, it must scroll inside itself.
    if (await dialog.evaluate((node) => node.scrollHeight > node.clientHeight)) await wheelTo(page, submit, height);
    else await expect(submit).toBeInViewport();
    await submit.click();
    await expect(page.getByRole("heading", { name: "Your 20% offer is claimed" })).toBeVisible();
  });
}
