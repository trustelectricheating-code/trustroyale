import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { PAYTABLE } from "../../src/config/paytable";

const VIEWPORTS = [
  { name: "phone-small", width: 320, height: 568 },
  { name: "phone-portrait", width: 390, height: 844 },
  { name: "phone-landscape", width: 844, height: 390 },
  { name: "ipad-portrait", width: 1024, height: 1366 },
  { name: "desktop", width: 1920, height: 1080 },
  { name: "desktop-wide", width: 2560, height: 1440 },
  { name: "desktop-ultrawide", width: 3440, height: 1440 },
] as const;

async function waitUntilReady(page: Page): Promise<void> {
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true" || Boolean(document.documentElement.dataset.error));
  expect(await page.evaluate(() => document.documentElement.dataset.error), "boot error").toBeUndefined();
}

async function verifyEveryPrizeSlide(page: Page, viewportName: string): Promise<void> {
  for (let index = 0; index < 7; index += 1) {
    await page.locator("#paytable .prize-carousel__dots button").nth(index).click();
    await expect(page.locator("#paytable")).toHaveAttribute("data-active-index", String(index));
    const result = await page.locator("[data-prize-slide]").evaluate((slide) => {
      const icons = Array.from(slide.querySelectorAll<HTMLImageElement>(".prize-carousel__icons img"));
      const textBox = (selector: string) => {
        const node = slide.querySelector<HTMLElement>(selector)!;
        const range = document.createRange();
        range.selectNodeContents(node);
        return { name: selector, box: range.getBoundingClientRect() };
      };
      const boxes = [
        ...icons.map((icon, index) => ({ name: `icon-${index}`, box: icon.getBoundingClientRect() })),
        textBox(".prize-carousel__value-main"),
        textBox(".prize-carousel__value-off"),
        textBox(".prize-carousel__label"),
      ];
      const intersections: Array<[string, string]> = [];
      for (let left = 0; left < boxes.length; left += 1) {
        for (let right = left + 1; right < boxes.length; right += 1) {
          const a = boxes[left].box;
          const b = boxes[right].box;
          if (a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5) {
            intersections.push([boxes[left].name, boxes[right].name]);
          }
        }
      }
      const label = slide.querySelector<HTMLElement>(".prize-carousel__label")!;
      const labelBox = label.getBoundingClientRect();
      const slideBox = slide.getBoundingClientRect();
      const controlsBox = slide.parentElement!.querySelector<HTMLElement>(".prize-carousel__controls")!.getBoundingClientRect();
      const allLinkBox = slide.parentElement!.querySelector<HTMLElement>(".prize-carousel__all")!.getBoundingClientRect();
      const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
      const inside = (inner: DOMRect, outer: DOMRect) => inner.left >= outer.left - 0.5
        && inner.right <= outer.right + 0.5
        && inner.top >= outer.top - 0.5
        && inner.bottom <= outer.bottom + 0.5;
      const clippingAncestors: string[] = [];
      for (let ancestor = label.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if ([style.overflow, style.overflowX, style.overflowY].some((value) => value === "hidden" || value === "clip")
          && !inside(labelBox, ancestor.getBoundingClientRect())) {
          clippingAncestors.push(ancestor.id || ancestor.className || ancestor.tagName);
        }
      }
      const lineHeight = Number.parseFloat(getComputedStyle(label).lineHeight);
      return {
        iconCount: icons.length,
        imagesLoaded: icons.every((image) => image.complete && image.naturalWidth > 0),
        intersections,
        boxes: boxes.map(({ name, box }) => ({ name, left: box.left, right: box.right, top: box.top, bottom: box.bottom })),
        labelLines: label.getBoundingClientRect().height / lineHeight,
        labelClipped: label.scrollHeight > label.clientHeight + 1,
        labelText: label.textContent?.trim(),
        labelInsideSlide: inside(labelBox, slideBox),
        clippingAncestors,
        labelControlsOverlap: intersects(labelBox, controlsBox),
        labelAllLinkOverlap: intersects(labelBox, allLinkBox),
      };
    });
    expect(result.iconCount, `${viewportName} slide ${index} icons`).toBe(3);
    expect(result.imagesLoaded, `${viewportName} slide ${index} images`).toBe(true);
    expect(result.intersections, `${viewportName} slide ${index} overlap ${JSON.stringify(result.boxes)}`).toEqual([]);
    expect(result.labelLines, `${viewportName} slide ${index} label lines`).toBeLessThanOrEqual(2.05);
    expect(result.labelClipped, `${viewportName} slide ${index} full label`).toBe(false);
    expect(result.labelText, `${viewportName} slide ${index} full rule text`).toBe(PAYTABLE[index].fullLabel);
    expect(result.labelInsideSlide, `${viewportName} slide ${index} label inside slide`).toBe(true);
    expect(result.clippingAncestors, `${viewportName} slide ${index} ancestor clipping`).toEqual([]);
    expect(result.labelControlsOverlap, `${viewportName} slide ${index} controls overlap`).toBe(false);
    expect(result.labelAllLinkOverlap, `${viewportName} slide ${index} all-prizes overlap`).toBe(false);
  }
}

test("full-screen mock fits all required viewports", async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await waitUntilReady(page);
    const reelSymbols = await page.evaluate(() => (
      window as Window & { __trustRoyaleDebug?: { reelSymbols: Array<{ symbol: string; drumWidth: number; width: number; height: number }> } }
    ).__trustRoyaleDebug?.reelSymbols);
    expect(reelSymbols, `${viewport.name} reel debug metrics`).toHaveLength(9);
    expect(reelSymbols?.some((symbol) => symbol.symbol === "gia"), `${viewport.name} Gia on reels`).toBe(true);
    for (const symbol of reelSymbols ?? []) {
      expect(symbol.width, `${viewport.name} ${symbol.symbol} width`).toBeLessThanOrEqual(symbol.drumWidth * 0.64);
      expect(symbol.height, `${viewport.name} ${symbol.symbol} height`).toBeLessThanOrEqual(symbol.drumWidth * 0.64);
    }
    await expect(page.locator("#paytable [data-prize-slide]"), `${viewport.name} featured prize`).toHaveCount(1);
    await expect(page.locator("#paytable .prize-carousel__dots button"), `${viewport.name} prize dots`).toHaveCount(7);
    await expect(page.locator("#prize-overlay .prize-overlay__rule"), `${viewport.name} all-prizes rows`).toHaveCount(7);
    expect(await page.locator("#prize-overlay .prize-overlay__rule").evaluateAll((rules) => rules.map((rule) => rule.getAttribute("aria-label")))).toEqual([
      "Scott times three, 20 percent",
      "Fiona times three, 20 percent",
      "Gia times three, 20 percent",
      "Keith times three, 15 percent",
      "Two of Scott, Fiona, Gia, or Keith plus one different person, 15 percent",
      "Keith times two plus any, 15 percent",
      "Neos times three, 10 percent",
    ]);
    await expect(page.locator(".marquee__frame-bulb"), `${viewport.name} title bulbs`).toHaveCount(34);
    if (viewport.width === 390 || viewport.width === 1920 || viewport.width === 2560) {
      await page.getByRole("button", { name: "See all prizes" }).click();
      const overlayImages = page.locator("#prize-overlay .prize-overlay__icons img");
      await expect(overlayImages, `${viewport.name} overlay images`).toHaveCount(21);
      expect(await overlayImages.evaluateAll((images) => images.every((image) => (image as HTMLImageElement).naturalWidth > 0)), `${viewport.name} overlay images loaded`).toBe(true);
      const overlayNeos = page.locator('#prize-overlay .prize-overlay__icons img[alt="Neos"]');
      await expect(overlayNeos, `${viewport.name} Neos medallions`).toHaveCount(3);
      expect(await overlayNeos.evaluateAll((images) => images.every((image) => {
        const node = image as HTMLImageElement;
        return new URL(node.src).pathname === "/assets/mock/neos-medallion.webp"
          && node.getBoundingClientRect().width >= 32
          && node.getBoundingClientRect().width === node.getBoundingClientRect().height;
      })), `${viewport.name} Neos uses reel medallion asset at readable size`).toBe(true);
      await page.getByRole("button", { name: "Close all prizes" }).click();
    }
    await verifyEveryPrizeSlide(page, viewport.name);
    const dimensions = await page.evaluate(() => {
      const bounds = document.querySelector("canvas")?.getBoundingClientRect();
      const marquee = document.querySelector("#marquee")?.getBoundingClientRect();
      const marqueeTitle = document.querySelector(".marquee__title")?.getBoundingClientRect();
      return {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        innerWidth,
        innerHeight,
        canvas: bounds && { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom },
        marquee: marquee && { left: marquee.left, top: marquee.top, right: marquee.right, bottom: marquee.bottom },
        marqueeTitle: marqueeTitle && { left: marqueeTitle.left, top: marqueeTitle.top, right: marqueeTitle.right, bottom: marqueeTitle.bottom },
      };
    });
    expect(dimensions.scrollWidth, `${viewport.name} horizontal overflow`).toBeLessThanOrEqual(dimensions.innerWidth);
    expect(dimensions.scrollHeight, `${viewport.name} vertical overflow`).toBeLessThanOrEqual(dimensions.innerHeight);
    expect(dimensions.canvas, `${viewport.name} canvas exists`).not.toBeNull();
    expect(dimensions.canvas!.left).toBeLessThanOrEqual(0);
    expect(dimensions.canvas!.top).toBeLessThanOrEqual(0);
    expect(dimensions.canvas!.right).toBeGreaterThanOrEqual(dimensions.innerWidth);
    expect(dimensions.canvas!.bottom).toBeGreaterThanOrEqual(dimensions.innerHeight);
    expect(dimensions.marqueeTitle!.left, `${viewport.name} title left inset`).toBeGreaterThan(dimensions.marquee!.left);
    expect(dimensions.marqueeTitle!.top, `${viewport.name} title top inset`).toBeGreaterThan(dimensions.marquee!.top);
    expect(dimensions.marqueeTitle!.right, `${viewport.name} title right inset`).toBeLessThan(dimensions.marquee!.right);
    expect(dimensions.marqueeTitle!.bottom, `${viewport.name} title bottom inset`).toBeLessThan(dimensions.marquee!.bottom);
    await page.screenshot({ path: path.join(process.cwd(), "tests/e2e/__screenshots__", `${viewport.name}-${viewport.width}x${viewport.height}.png`) });
  }

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  await waitUntilReady(page);
  const firstPrize = await page.locator("#paytable").getAttribute("data-active-index");
  await page.waitForTimeout(3200);
  await expect(page.locator("#paytable"), "carousel autoplay").not.toHaveAttribute("data-active-index", firstPrize ?? "0");
  expect(await page.locator(".prize-carousel__value").evaluate((node) => node.getBoundingClientRect().height), "desktop prize text height").toBeGreaterThanOrEqual(48);
  await page.getByRole("button", { name: "See all prizes" }).click();
  await expect(page.locator("#prize-overlay")).toBeVisible();
  await page.getByRole("button", { name: "Close all prizes" }).click();
  await page.getByRole("button", { name: "Next prize" }).click();
  const manuallySelectedPrize = await page.locator("#paytable").getAttribute("data-active-index");
  await page.waitForTimeout(3200);
  await expect(page.locator("#paytable"), "manual navigation pauses autoplay").toHaveAttribute("data-active-index", manuallySelectedPrize ?? "0");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await waitUntilReady(page);
  const reducedMotionPrize = await page.locator("#paytable").getAttribute("data-active-index");
  await page.waitForTimeout(3200);
  await expect(page.locator("#paytable"), "reduced motion disables autoplay").toHaveAttribute("data-active-index", reducedMotionPrize ?? "0");
  await page.goto("/?title=topper");
  await waitUntilReady(page);
  await expect(page.locator(".marquee__frame-bulbs"), "topper reuses cabinet arch bulbs").toBeHidden();
});
