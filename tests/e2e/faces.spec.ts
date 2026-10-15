import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { CABINET_ART } from "../../src/scene/cabinetArt";
import { computeLayout } from "../../src/scene/layout";
import { SYMBOLS } from "../../src/config/symbols";

const session = { spinsLeft: 3, bonusAvailable: false, state: "idle", best: null, win: null };
const faceResult = {
  spinId: "00000000-0000-4000-8000-000000000017", spinNo: 1,
  reels: ["scott", "keith", "fiona"],
  strip: [["seven", "cherry", "sweets"], ["scott", "keith", "fiona"], ["neos", "gia", "seven"]],
  outcome: "retry", ruleId: null, discount: null, winRef: null, best: null,
  nearMiss: false, spinsLeft: 2, bonusAvailable: false, isBonus: false, gameOver: false,
};

test("every reel frame loads and face payline medallions render artwork", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  await page.route("**/api/spin", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(faceResult) }));
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");

  const manifest = JSON.parse(readFileSync(path.join(process.cwd(), "public/assets/manifest.json"), "utf8")) as { assets: { key: string; file: string }[] };
  const files = new Map(manifest.assets.map(({ key, file }) => [key, file]));
  const frameUrls = Object.values(SYMBOLS).flatMap(({ frames }) => Object.values(frames).map((key) => `/assets/${files.get(key)}`));
  const loaded = await page.evaluate(async (urls) => Promise.all(urls.map((src) => new Promise<boolean>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 1 && image.naturalHeight > 1);
    image.onerror = () => resolve(false);
    image.src = src;
  }))), frameUrls);
  expect(loaded).not.toContain(false);

  await page.getByRole("button", { name: "Let's play!" }).click();
  await page.locator("#spin").click();
  await expect(page.getByText("So close! Spin again.", { exact: true })).toBeVisible();
  const screenshot = path.join(mkdtempSync(path.join(tmpdir(), "trust-royale-faces-")), "payline.png");
  await page.screenshot({ path: screenshot });
  const viewport = page.viewportSize()!;
  const layout = computeLayout(viewport.width, viewport.height, { top: 0, right: 0, bottom: 0, left: 0 });
  const scale = layout.machine.scale;
  const cell = CABINET_ART.reelWindow.width * scale / 3;
  const size = Math.floor(Math.min(cell * 0.72, CABINET_ART.reelWindow.height * scale * 0.52));
  const y = Math.floor(layout.machine.y + (CABINET_ART.reelWindow.y + CABINET_ART.reelWindow.height / 2) * scale - size / 2);
  for (let column = 0; column < 3; column += 1) {
    const x = Math.floor(layout.machine.x + (CABINET_ART.reelWindow.x + CABINET_ART.reelWindow.width * (column + 0.5) / 3) * scale - size / 2);
    const whiteRatio = Number(execFileSync("magick", [screenshot, "-crop", `${size}x${size}+${x}+${y}`, "-colorspace", "gray", "-threshold", "92%", "-format", "%[fx:mean]", "info:"]).toString());
    expect(whiteRatio, `face payline column ${column + 1}`).toBeLessThan(0.5);
  }
});
