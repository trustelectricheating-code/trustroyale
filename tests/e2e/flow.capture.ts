import { expect, test } from "@playwright/test";
import path from "node:path";
import { flowRetry, flowWin, mockFlow } from "./helpers/flow";

test.skip(!process.env.CAPTURE_FLOW, "Flow screenshots run only with CAPTURE_FLOW=1");

for (const [width, height] of [[390, 844], [844, 390], [1440, 900]] as const) {
  test(`flow screenshots ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockFlow(page, [flowRetry(1, 2), flowWin(15, 2, 1)]);
    await page.goto("/");
    await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
    await page.evaluate(() => document.fonts.ready);
    const output = path.join(process.cwd(), "test-results/flow");
    if (width !== 1440) {
      await expect(page.locator(".welcome__rule-chip .tries-tracker__mark")).toHaveCount(3);
      await page.screenshot({ path: path.join(output, `${width}x${height}-welcome.png`) });
    }
    await page.getByRole("button", { name: "Let's play!" }).click();
    await page.locator("#spin").click();
    await expect(page.locator("#spin-message")).toHaveText("So close! Spin again.");
    await page.screenshot({ path: path.join(output, `${width}x${height}-retry.png`) });
    await page.locator("#spin").click();
    await expect(page.locator("#spin-message")).toHaveText("You've banked 15% off! 1 spin left.");
    await page.screenshot({ path: path.join(output, `${width}x${height}-banked.png`) });
  });
}
