import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const browser = await chromium.launch(executablePath ? { executablePath } : undefined);
const outputDir = path.join(process.cwd(), "test-results", "prize-slides");
await mkdir(outputDir, { recursive: true });

for (const viewport of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport });
  await page.goto("http://127.0.0.1:4173");
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  for (let index = 0; index < 7; index += 1) {
    await page.locator(".prize-carousel__dots button").nth(index).click();
    await page.locator("#paytable").screenshot({ path: path.join(outputDir, `${viewport.width}-${index}.png`) });
  }
  await page.getByRole("button", { name: "See all prizes" }).click();
  await page.screenshot({ path: path.join(outputDir, `overlay-${viewport.width}.png`) });
  await page.close();
}

await browser.close();
