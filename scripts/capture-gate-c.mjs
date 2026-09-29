import { chromium } from "@playwright/test";
import path from "node:path";
import process from "node:process";

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
const output = path.join(process.cwd(), "reference", "_work");
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(`${baseUrl}/assets.html`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
await page.screenshot({ path: path.join(output, "gate-c-board-1920.png"), fullPage: true });
await page.locator("#group-faces").screenshot({ path: path.join(output, "gate-c-faces.png") });
await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
await page.screenshot({ path: path.join(output, "gate-c-board-390.png"), fullPage: true });
await browser.close();
