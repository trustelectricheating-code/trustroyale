import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

type Manifest = { assets: Array<{ key: string; group: string }> };

test("asset board renders the complete manifest without broken images", async ({ page }) => {
  const manifest = JSON.parse(await readFile(path.join(process.cwd(), "public/assets/manifest.json"), "utf8")) as Manifest;
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/assets.html");
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true" || Boolean(document.documentElement.dataset.error));
  expect(await page.evaluate(() => document.documentElement.dataset.error), "asset board boot error").toBeUndefined();
  await expect(page.locator("[data-asset-key]")).toHaveCount(manifest.assets.length);

  const renderedKeys = await page.locator("[data-asset-key]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-asset-key")));
  expect(renderedKeys).toEqual(manifest.assets.map((asset) => asset.key));
  await page.locator("img").evaluateAll(async (nodes) => {
    const images = nodes as HTMLImageElement[];
    await Promise.all(images.map((image) => image.complete ? undefined : new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    })));
  });
  expect(await page.locator("img").evaluateAll((nodes) => (nodes as HTMLImageElement[]).every((image) => image.complete && image.naturalWidth > 0)), "all board images load").toBe(true);
  await expect(page.locator(".face-row")).toHaveCount(4);
  await expect(page.locator(".face-row [data-asset-key]")).toHaveCount(16);
  await expect(page.locator(".pulse-preview__rings")).toHaveCount(1);
  await expect(page.locator("[data-audio-key]")).toHaveCount(manifest.assets.filter((asset) => asset.group === "audio").length);
  expect(consoleErrors).toEqual([]);
});
