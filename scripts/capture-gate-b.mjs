import { chromium } from "@playwright/test";
import path from "node:path";

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const browser = await chromium.launch(executablePath ? { executablePath } : undefined);
const root = process.cwd();
const results = [];

for (const viewport of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
  const measureContext = await browser.newContext({ viewport });
  const measurePage = await measureContext.newPage();
  await measurePage.goto("http://127.0.0.1:4173");
  await measurePage.waitForFunction(() => document.documentElement.dataset.ready === "true");
  const fps = await measurePage.evaluate(() => new Promise((resolve) => {
    let frames = 0;
    const started = performance.now();
    const sample = (now) => {
      frames += 1;
      if (now - started >= 1500) resolve(frames / ((now - started) / 1000));
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
  await measureContext.close();

  const context = await browser.newContext({ viewport, recordVideo: { dir: "test-results/gate-b-video", size: viewport } });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173");
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  const video = page.video();
  await page.mouse.move(viewport.width * 0.2, viewport.height * 0.35);
  await page.waitForTimeout(3000);
  await page.mouse.move(viewport.width * 0.8, viewport.height * 0.62);
  await page.waitForTimeout(3000);
  if (viewport.width === 1920) {
    const clip = await page.locator("#marquee").evaluate((node) => {
      const title = node.getBoundingClientRect();
      const machineWidth = title.width / 0.74;
      const machineHeight = machineWidth * 1.5;
      const machineX = title.x - machineWidth * 0.13;
      const machineY = title.y - machineHeight * 0.055;
      return {
        x: machineX + machineWidth * 0.18,
        y: machineY + machineHeight * 0.27,
        width: machineWidth * 0.64,
        height: machineHeight * 0.27,
      };
    });
    await page.screenshot({ path: path.join(root, "reference/_work/gate-b-reels-closeup.png"), clip });
  }
  await page.close();
  const output = path.join(root, `reference/_work/gate-b-motion-${viewport.width}.webm`);
  await video.saveAs(output);
  await context.close();
  results.push({ viewport: `${viewport.width}x${viewport.height}`, fps: Number(fps.toFixed(1)), output });
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
