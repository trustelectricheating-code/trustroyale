import { Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import type { SceneLayout } from "./layout";

const ASSETS = {
  hallLandscape: "/assets/mock/casino-hall-landscape.webp",
  hallPortrait: "/assets/mock/casino-hall-portrait.webp",
  chipRed: "/assets/fx/chip-red-face.webp",
  chipGold: "/assets/fx/chip-gold-face.webp",
  chipNavy: "/assets/fx/chip-navy-face.webp",
  chipWhite: "/assets/fx/chip-white-face.webp",
  chipRedFar: "/assets/fx/chip-red-tilt.webp",
  chipGoldFar: "/assets/fx/chip-gold-tilt.webp",
  chipNavyFar: "/assets/fx/chip-navy-tilt.webp",
  chipWhiteFar: "/assets/fx/chip-white-tilt.webp",
  coin: "/assets/mock/coin.webp",
  coinFar: "/assets/mock/coin-far.webp",
} as const;

type Depth = "far" | "mid";
export type FloatingKind = "chip" | "coin" | "card";

export interface FloatingItemSpec {
  kind: FloatingKind;
  depth: Depth;
  nx: number;
  ny: number;
  texture: number;
  baseRotation: number;
  baseSize: number;
}

export const FLOATING_ITEM_SPECS: readonly FloatingItemSpec[] = [
  { kind: "coin", depth: "far", nx: 0.08, ny: 0.13, texture: 0, baseRotation: -0.05, baseSize: 0.44 },
  { kind: "chip", depth: "mid", nx: 0.91, ny: 0.14, texture: 2, baseRotation: 0.06, baseSize: 0.68 },
  { kind: "card", depth: "mid", nx: 0.15, ny: 0.27, texture: 0, baseRotation: -0.06, baseSize: 0.58 },
  { kind: "coin", depth: "far", nx: 0.86, ny: 0.31, texture: 0, baseRotation: 0.04, baseSize: 0.44 },
  { kind: "chip", depth: "far", nx: 0.07, ny: 0.72, texture: 1, baseRotation: 0.05, baseSize: 0.44 },
  { kind: "card", depth: "mid", nx: 0.88, ny: 0.68, texture: 0, baseRotation: 0.06, baseSize: 0.58 },
  { kind: "coin", depth: "mid", nx: 0.14, ny: 0.88, texture: 0, baseRotation: -0.04, baseSize: 0.64 },
  { kind: "chip", depth: "mid", nx: 0.86, ny: 0.89, texture: 3, baseRotation: -0.05, baseSize: 0.68 },
  { kind: "coin", depth: "far", nx: 0.94, ny: 0.48, texture: 0, baseRotation: 0.04, baseSize: 0.44 },
  { kind: "coin", depth: "mid", nx: 0.08, ny: 0.46, texture: 0, baseRotation: 0.03, baseSize: 0.62 },
  { kind: "chip", depth: "far", nx: 0.92, ny: 0.79, texture: 0, baseRotation: -0.04, baseSize: 0.43 },
  { kind: "card", depth: "far", nx: 0.07, ny: 0.58, texture: 0, baseRotation: 0.05, baseSize: 0.44 },
  { kind: "coin", depth: "far", nx: 0.93, ny: 0.6, texture: 0, baseRotation: -0.03, baseSize: 0.42 },
  { kind: "chip", depth: "mid", nx: 0.13, ny: 0.38, texture: 1, baseRotation: 0.05, baseSize: 0.64 },
  { kind: "chip", depth: "far", nx: 0.89, ny: 0.39, texture: 3, baseRotation: -0.05, baseSize: 0.43 },
  { kind: "chip", depth: "far", nx: 0.11, ny: 0.8, texture: 2, baseRotation: 0.04, baseSize: 0.43 },
] as const;

export function floatingItemCount(width: number, height: number): number {
  return Math.min(width, height) < 600 ? 9 : FLOATING_ITEM_SPECS.length;
}

export interface FloatingItem {
  node: Container;
  depth: Depth;
  nx: number;
  ny: number;
  phase: number;
  baseRotation: number;
  baseSize: number;
  baseX: number;
  baseY: number;
  kind: FloatingKind;
}

export interface EnvironmentScene {
  back: Container;
  front: Container;
  hallLandscape: Sprite;
  hallPortrait: Sprite;
  items: FloatingItem[];
  pointer: { x: number; y: number };
  reducedMotion: boolean;
}

function sprite(texture: Texture, size: number): Sprite {
  const node = new Sprite(texture);
  node.anchor.set(0.5);
  node.width = size;
  node.height = size;
  return node;
}

function neosMark(size: number, colour: number): Graphics {
  const scale = size / 160;
  return new Graphics()
    .circle(0, -62 * scale, 12 * scale).fill(colour)
    .roundRect(-45 * scale, -38 * scale, 90 * scale, 18 * scale, 9 * scale).fill(colour)
    .roundRect(-9 * scale, -38 * scale, 18 * scale, 112 * scale, 9 * scale).fill(colour);
}

function chip(texture: Texture): Container {
  const node = new Container();
  node.addChild(sprite(texture, 120));
  node.addChild(neosMark(38, 0xffe6a0));
  return node;
}

function card(): Container {
  const node = new Container();
  const back = new Graphics()
    .roundRect(-39, -55, 78, 110, 9).fill({ color: 0xf2dfbd }).stroke({ color: 0xffe8a3, width: 3 })
    .roundRect(-33, -49, 66, 98, 7).fill({ color: 0x7c0715 }).stroke({ color: 0xd4a437, width: 2 })
    .roundRect(-27, -43, 54, 86, 5).stroke({ color: 0xffd878, width: 1, alpha: 0.38 });
  node.addChild(back, neosMark(58, 0xffd878));
  return node;
}

export async function createBackground(): Promise<EnvironmentScene> {
  const entries = Object.entries(ASSETS) as [keyof typeof ASSETS, string][];
  const loaded = await Assets.load<Texture>(entries.map(([, url]) => url));
  const textures = Object.fromEntries(entries.map(([key, url]) => [key, loaded[url]])) as Record<keyof typeof ASSETS, Texture>;
  const back = new Container();
  const front = new Container();
  const hallLandscape = new Sprite(textures.hallLandscape);
  const hallPortrait = new Sprite(textures.hallPortrait);
  back.addChild(hallLandscape, hallPortrait);

  const farLayer = new Container();
  const midLayer = new Container();
  back.addChild(farLayer, midLayer);

  const itemTextures = [textures.chipRed, textures.chipGold, textures.chipNavy, textures.chipWhite];
  const farTextures = [textures.chipRedFar, textures.chipGoldFar, textures.chipNavyFar, textures.chipWhiteFar];
  const items: FloatingItem[] = [];
  FLOATING_ITEM_SPECS.forEach((spec, index) => {
    const node = spec.kind === "card"
      ? card()
      : spec.kind === "coin"
        ? new Container({ children: [sprite(spec.depth === "mid" ? textures.coin : textures.coinFar, 110)] })
        : spec.depth === "mid"
          ? chip(itemTextures[spec.texture % itemTextures.length])
          : new Container({ children: [sprite(farTextures[spec.texture % farTextures.length], 120)] });
    node.rotation = spec.baseRotation;
    (spec.depth === "far" ? farLayer : midLayer).addChild(node);
    items.push({ ...spec, node, phase: index * 0.83, baseX: 0, baseY: 0 });
  });

  return {
    back, front, hallLandscape, hallPortrait, items,
    pointer: { x: 0, y: 0 },
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

function cover(node: Sprite, textureWidth: number, textureHeight: number, width: number, height: number): void {
  const scale = Math.max(width / textureWidth, height / textureHeight);
  node.width = textureWidth * scale;
  node.height = textureHeight * scale;
  node.position.set((width - node.width) / 2, (height - node.height) / 2);
}

export function drawBackground(scene: EnvironmentScene, layout: SceneLayout): void {
  const { width, height } = layout.viewport;
  const portrait = layout.orientation === "portrait";
  scene.hallLandscape.visible = !portrait;
  scene.hallPortrait.visible = portrait;
  cover(scene.hallLandscape, 1672, 941, width, height);
  cover(scene.hallPortrait, 941, 1672, width, height);

  const count = floatingItemCount(width, height);
  const phonePortrait = portrait && Math.min(width, height) < 600;
  const phoneTopY = (layout.paytable.y + layout.paytable.height + layout.machine.y) / 2;
  const phoneBottomY = (layout.machine.y + layout.machine.height + height) / 2;
  const phonePositions = [
    [0.09, phoneTopY], [0.29, phoneTopY], [0.5, phoneTopY], [0.71, phoneTopY], [0.91, phoneTopY],
    [0.12, phoneBottomY], [0.37, phoneBottomY], [0.63, phoneBottomY], [0.88, phoneBottomY],
  ] as const;
  scene.items.forEach((item, index) => {
    item.node.visible = index < count;
    const responsive = Math.max(0.5, Math.min(1.25, width / 1280, height / 760));
    const scale = item.baseSize * responsive;
    const radius = (item.kind === "card" ? 62 : 64) * scale + 14;
    const targetX = phonePortrait && phonePositions[index] ? phonePositions[index][0] * width : item.nx * width;
    const targetY = phonePortrait && phonePositions[index] ? phonePositions[index][1] : item.ny * height;
    item.baseX = Math.max(radius, Math.min(width - radius, targetX));
    item.baseY = Math.max(radius, Math.min(height - radius, targetY));
    item.node.position.set(item.baseX, item.baseY);
    item.node.scale.set(scale);
  });
}

export function animateBackground(scene: EnvironmentScene, timeSeconds: number): void {
  if (scene.reducedMotion) return;
  scene.items.forEach((item) => {
    if (!item.node.visible) return;
    const speed = item.depth === "far" ? 0.35 : 0.55;
    const parallax = item.depth === "far" ? 4 : 8;
    item.node.x = item.baseX + Math.cos(timeSeconds * speed + item.phase) * 2 + scene.pointer.x * parallax;
    item.node.y = item.baseY + Math.sin(timeSeconds * speed + item.phase) * 4 + scene.pointer.y * parallax;
    const rotationRange = item.kind === "card" ? Math.PI / 30 : Math.PI / 36;
    item.node.rotation = item.baseRotation + Math.sin(timeSeconds * speed * 0.7 + item.phase) * rotationRange;
  });
}
