import { Assets, BlurFilter, Container, Graphics, Sprite, Texture } from "pixi.js";
import { gsap } from "gsap";
import { SYMBOLS, SYMBOL_IDS, type SymbolId } from "../config/symbols";
import { CABINET_ART } from "./cabinetArt";

export type ReelStrip = [[SymbolId, SymbolId, SymbolId], [SymbolId, SymbolId, SymbolId], [SymbolId, SymbolId, SymbolId]];
export interface ReelsScene {
  container: Container;
  columns: Container[];
  sprites: Sprite[][];
  medallionMasks: Graphics[][];
  paylineSprites: Sprite[];
  paylineFlash: Graphics;
  strip: ReelStrip;
}

export const REEL_ROW_LAYOUT = [
  { y: 0.02, scale: 0.7, alpha: 0.5 },
  { y: 0.5, scale: 1, alpha: 1 },
  { y: 0.98, scale: 0.7, alpha: 0.5 },
] as const;

function texture(symbol: SymbolId, frame: "idle" | "half" | "closed" | "win" = "idle"): Texture {
  const frames = SYMBOLS[symbol].frames as Record<string, string | undefined>;
  const key = frames[frame] ?? SYMBOLS[symbol].frames.idle;
  return Assets.get<Texture>(key) ?? Texture.EMPTY;
}

export function usesCircularMask(symbol: SymbolId): boolean { return SYMBOLS[symbol].kind === "face"; }

function setSymbol(scene: ReelsScene, column: number, row: number, symbol: SymbolId, frame: "idle" | "half" | "closed" | "win" = "idle"): void {
  const sprite = scene.sprites[column][row];
  sprite.texture = texture(symbol, frame);
  sprite.mask = usesCircularMask(symbol) ? scene.medallionMasks[column][row] : null;
}

function setStrip(scene: ReelsScene, strip: ReelStrip): void {
  scene.strip = strip;
  for (let column = 0; column < 3; column += 1) for (let row = 0; row < 3; row += 1) {
    setSymbol(scene, column, row, strip[row][column]);
  }
}

export function createReels(initial: ReelStrip = [
  ["seven", "fiona", "keith"], ["scott", "gia", "neos"], ["cherry", "sweets", "seven"],
]): ReelsScene {
  const { reelWindow } = CABINET_ART;
  const container = new Container();
  container.position.set(reelWindow.x, reelWindow.y);
  const mask = new Graphics().roundRect(0, 0, reelWindow.width, reelWindow.height, 24).fill(0xffffff);
  container.mask = mask;
  container.addChild(mask, new Graphics().roundRect(0, 0, reelWindow.width, reelWindow.height, 24).fill({ color: 0xfff2d1 }));
  const columns: Container[] = [];
  const sprites: Sprite[][] = [];
  const medallionMasks: Graphics[][] = [];
  const cellWidth = reelWindow.width / 3;
  const paylineSize = Math.min(cellWidth - 10, reelWindow.height * 0.62);
  for (let column = 0; column < 3; column += 1) {
    const reel = new Container();
    reel.position.x = cellWidth * column;
    const reelSprites: Sprite[] = [];
    const reelMasks: Graphics[] = [];
    for (let row = 0; row < 3; row += 1) {
      const sprite = new Sprite(Texture.EMPTY);
      sprite.anchor.set(0.5);
      const rowLayout = REEL_ROW_LAYOUT[row];
      sprite.position.set(cellWidth / 2, reelWindow.height * rowLayout.y);
      sprite.width = paylineSize * rowLayout.scale;
      sprite.height = sprite.width;
      sprite.alpha = rowLayout.alpha;
      const medallionMask = new Graphics()
        .circle(sprite.x, sprite.y, sprite.width * 0.495)
        .fill(0xffffff);
      reel.addChild(sprite, medallionMask);
      reelSprites.push(sprite);
      reelMasks.push(medallionMask);
    }
    columns.push(reel);
    sprites.push(reelSprites);
    medallionMasks.push(reelMasks);
    container.addChild(reel);
  }
  const shadeCanvas = document.createElement("canvas");
  shadeCanvas.width = Math.ceil(reelWindow.width);
  shadeCanvas.height = Math.ceil(reelWindow.height);
  const context = shadeCanvas.getContext("2d");
  if (context) {
    const gradient = context.createLinearGradient(0, 0, 0, shadeCanvas.height);
    gradient.addColorStop(0, "rgba(45,20,13,.56)");
    gradient.addColorStop(0.28, "rgba(45,20,13,0)");
    gradient.addColorStop(0.72, "rgba(45,20,13,0)");
    gradient.addColorStop(1, "rgba(45,20,13,.56)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, shadeCanvas.width, shadeCanvas.height);
  }
  const cylinderShade = new Sprite(Texture.from(shadeCanvas));
  cylinderShade.width = reelWindow.width;
  cylinderShade.height = reelWindow.height;
  container.addChild(cylinderShade);
  const paylineFlash = new Graphics()
    .roundRect(8, reelWindow.height * 0.2, reelWindow.width - 16, reelWindow.height * 0.6, 22)
    .stroke({ color: 0xffe8a3, width: 6, alpha: 0.95 });
  paylineFlash.alpha = 0;
  container.addChild(paylineFlash);
  const scene = { container, columns, sprites, medallionMasks, paylineSprites: sprites.map((reel) => reel[1]), paylineFlash, strip: initial };
  setStrip(scene, initial);
  return scene;
}

export async function animateSpin(scene: ReelsScene, strip: ReelStrip, reducedMotion = false, onStop?: (reel: 1 | 2 | 3) => void, nearMiss = false): Promise<void> {
  document.documentElement.dataset.spinning = "true";
  document.querySelectorAll<HTMLElement>("[data-reel]").forEach((node) => { node.dataset.stopped = "false"; });
  if (reducedMotion) {
    await new Promise<void>((resolve) => gsap.to(scene.container, { alpha: 0.72, duration: 0.08, yoyo: true, repeat: 1, onRepeat: () => setStrip(scene, strip), onComplete: resolve }));
    document.querySelectorAll<HTMLElement>("[data-reel]").forEach((node, index) => { node.dataset.stopped = "true"; onStop?.((index + 1) as 1 | 2 | 3); });
    delete document.documentElement.dataset.spinning;
    return;
  }
  document.documentElement.dataset.nearMiss = String(nearMiss);
  const blur = scene.columns.map(() => new BlurFilter({ strength: 0, quality: 2 }));
  scene.columns.forEach((column, index) => { column.filters = [blur[index]]; });
  await new Promise<void>((resolve) => {
    const timeline = gsap.timeline({ onComplete: resolve });
    scene.columns.forEach((column, index) => {
      const start = index * 0.045;
      const stopAt = 1.12 + index * 0.24 + (nearMiss && index === 2 ? 0.62 : 0);
      const tracker = { progress: 0 };
      const cycles = 15 + index * 3 + (nearMiss && index === 2 ? 8 : 0);
      timeline.to(column, { y: -14, duration: 0.14, ease: "power2.out" }, start)
        .to(tracker, {
          progress: 1,
          duration: stopAt,
          ease: nearMiss && index === 2 ? "power1.inOut" : "power2.inOut",
          onUpdate: () => {
            const turn = tracker.progress * cycles;
            column.y = -14 + (turn % 1) * 58;
            blur[index].strength = Math.sin(Math.min(1, tracker.progress * 1.22) * Math.PI) * 13;
            const offset = Math.floor(turn);
            for (let row = 0; row < 3; row += 1) {
              const id = SYMBOL_IDS[(offset + row + index * 2) % SYMBOL_IDS.length];
              setSymbol(scene, index, row, id);
            }
          },
        }, start + 0.12)
        .call(() => {
          for (let row = 0; row < 3; row += 1) setSymbol(scene, index, row, strip[row][index]);
          column.y = 24;
          document.querySelector<HTMLElement>(`[data-reel="${index}"]`)?.setAttribute("data-stopped", "true");
          onStop?.((index + 1) as 1 | 2 | 3);
        }, [], start + stopAt + 0.12)
        .to(column, { y: -5, duration: 0.11, ease: "power2.out" }, start + stopAt + 0.12)
        .to(column, { y: 0, duration: 0.24, ease: "bounce.out" }, start + stopAt + 0.23)
        .to(blur[index], { strength: 0, duration: 0.12 }, start + stopAt + 0.12);
    });
    const flashAt = 1.12 + 2 * 0.24 + (nearMiss ? 0.62 : 0) + 0.55;
    timeline.to(scene.paylineFlash, { alpha: 1, duration: 0.08 }, flashAt)
      .to(scene.paylineFlash, { alpha: 0, duration: 0.42, ease: "power2.out" }, flashAt + 0.08);
  });
  setStrip(scene, strip);
  scene.columns.forEach((column) => { column.filters = []; });
  delete document.documentElement.dataset.nearMiss;
  delete document.documentElement.dataset.spinning;
}

export function setPaylineFrame(scene: ReelsScene, index: number, frame: "idle" | "half" | "closed" | "win"): void {
  setSymbol(scene, index, 1, scene.strip[1][index], frame);
}
