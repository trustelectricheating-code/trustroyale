import { Assets, BlurFilter, Container, Graphics, Sprite, Texture } from "pixi.js";
import { gsap } from "gsap";
import { SYMBOLS, type SymbolId } from "../config/symbols";
import { CABINET_ART } from "./cabinetArt";

export type ReelStrip = [[SymbolId, SymbolId, SymbolId], [SymbolId, SymbolId, SymbolId], [SymbolId, SymbolId, SymbolId]];
export interface ReelsScene {
  container: Container;
  columns: Container[];
  sprites: Sprite[][];
  paylineSprites: Sprite[];
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

function setStrip(scene: ReelsScene, strip: ReelStrip): void {
  scene.strip = strip;
  for (let column = 0; column < 3; column += 1) for (let row = 0; row < 3; row += 1) {
    scene.sprites[column][row].texture = texture(strip[row][column]);
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
  const cellWidth = reelWindow.width / 3;
  const paylineSize = Math.min(cellWidth - 10, reelWindow.height * 0.62);
  for (let column = 0; column < 3; column += 1) {
    const reel = new Container();
    reel.position.x = cellWidth * column;
    const reelSprites: Sprite[] = [];
    for (let row = 0; row < 3; row += 1) {
      const sprite = new Sprite(Texture.EMPTY);
      sprite.anchor.set(0.5);
      const rowLayout = REEL_ROW_LAYOUT[row];
      sprite.position.set(cellWidth / 2, reelWindow.height * rowLayout.y);
      sprite.width = paylineSize * rowLayout.scale;
      sprite.height = sprite.width;
      sprite.alpha = rowLayout.alpha;
      reel.addChild(sprite);
      reelSprites.push(sprite);
    }
    columns.push(reel);
    sprites.push(reelSprites);
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
  const scene = { container, columns, sprites, paylineSprites: sprites.map((reel) => reel[1]), strip: initial };
  setStrip(scene, initial);
  return scene;
}

export async function animateSpin(scene: ReelsScene, strip: ReelStrip, reducedMotion = false, onStop?: (reel: 1 | 2 | 3) => void): Promise<void> {
  document.documentElement.dataset.spinning = "true";
  document.querySelectorAll<HTMLElement>("[data-reel]").forEach((node) => { node.dataset.stopped = "false"; });
  if (reducedMotion) {
    setStrip(scene, strip);
    document.querySelectorAll<HTMLElement>("[data-reel]").forEach((node, index) => { node.dataset.stopped = "true"; onStop?.((index + 1) as 1 | 2 | 3); });
    delete document.documentElement.dataset.spinning;
    return;
  }
  const blur = scene.columns.map(() => new BlurFilter({ strength: 0, quality: 2 }));
  scene.columns.forEach((column, index) => { column.filters = [blur[index]]; });
  await new Promise<void>((resolve) => {
    const timeline = gsap.timeline({ onComplete: resolve });
    scene.columns.forEach((column, index) => {
      timeline.to(blur[index], { strength: 10, duration: 0.18 }, 0)
        .to(column, { y: "+=42", duration: 0.13, repeat: 5 + index * 2, ease: "none" }, 0.05)
        .call(() => {
          for (let row = 0; row < 3; row += 1) scene.sprites[index][row].texture = texture(strip[row][index]);
          document.querySelector<HTMLElement>(`[data-reel="${index}"]`)?.setAttribute("data-stopped", "true");
          onStop?.((index + 1) as 1 | 2 | 3);
        }, [], 0.78 + index * 0.22)
        .to(column, { y: 0, duration: 0.28, ease: "back.out(2)" }, 0.78 + index * 0.22)
        .to(blur[index], { strength: 0, duration: 0.18 }, 0.78 + index * 0.22);
    });
  });
  setStrip(scene, strip);
  scene.columns.forEach((column) => { column.filters = []; });
  delete document.documentElement.dataset.spinning;
}

export function setPaylineFrame(scene: ReelsScene, index: number, frame: "idle" | "half" | "closed" | "win"): void {
  scene.paylineSprites[index].texture = texture(scene.strip[1][index], frame);
}
