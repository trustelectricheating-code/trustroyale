import { expect, test } from "@playwright/test";
import path from "node:path";
import { mockTermsGame } from "./helpers/terms";

test.skip(!process.env.CAPTURE_TERMS, "Terms screenshots run only with CAPTURE_TERMS=1");

for (const [width, height] of [[390, 844], [844, 390], [1440, 900]] as const) {
  test(`terms screenshots ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockTermsGame(page);
    await page.goto("/");
    await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
    await page.evaluate(() => document.fonts.ready);
    const output = path.join(process.cwd(), "test-results/terms");
    await page.screenshot({ path: path.join(output, `${width}x${height}-welcome.png`) });
    await page.getByRole("link", { name: "terms and conditions", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Terms and conditions" })).toBeVisible();
    await page.screenshot({ path: path.join(output, `${width}x${height}-popup.png`) });
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Let's play!" }).click();
    await page.locator("#spin").click();
    await expect(page.locator(".result-popup--win")).toBeVisible();
    await expect(page.getByRole("link", { name: "Terms and conditions", exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(output, `${width}x${height}-win.png`) });
  });
}
