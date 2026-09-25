import { Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import type { SceneLayout } from "./layout";

const ASSETS = {
  hallLandscape: "/assets/mock/casino-hall-landscape.webp",
  hallPortrait: "/assets/mock/casino-hall-portrait.webp",
  wheel: "/assets/mock/roulette-wheel-soft.webp",
  chipRed: "/assets/mock/chip-red-blank.webp",
  chipGold: "/assets/mock/chip-gold-blank.webp",
  chipNavy: "/assets/mock/chip-navy-blank.webp",
  chipWhite: "/assets/mock/chip-white-blank.webp",
  chipRedFar: "/assets/mock/chip-red-far.webp",
  chipGoldFar: "/assets/mock/chip-gold-far.webp",
  chipNavyFar: "/assets/mock/chip-navy-far.webp",
  chipWhiteFar: "/assets/mock/chip-white-far.webp",
  chipRedNear: "/assets/mock/chip-red-near.webp",
  chipGoldNear: "/assets/mock/chip-gold-near.webp",
  chipNavyNear: "/assets/mock/chip-navy-near.webp",
  chipWhiteNear: "/assets/mock/chip-white-near.webp",
  coin: "/assets/mock/coin.webp",
  coinFar: "/assets/mock/coin-far.webp",
  coinNear: "/assets/mock/coin-near.webp",
  neos: "/assets/emblem/neos.svg",
} as const;

type Depth = "far" | "mid" | "near";

interface FloatingItem {
  node: Container;
  depth: Depth;
  nx: number;
  ny: number;
  phase: number;
  baseRotation: number;
  baseSize: number;
  baseX: number;
  baseY: number;
}

export interface EnvironmentScene {
  back: Container;
  front: Container;
  hallLandscape: Sprite;
  hallPortrait: Sprite;
  wheel: Container;
  wheelHead: Sprite;
  ball: Graphics;
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

function chip(texture: Texture, emblem: Texture): Container {
  const node = new Container();
  node.addChild(sprite(texture, 120));
  const mark = sprite(emblem, 38);
  mark.tint = 0xffe8a3;
  node.addChild(mark);
  return node;
}

function card(index: number): Container {
  const node = new Container();
  const back = new Graphics()
    .roundRect(-39, -55, 78, 110, 9).fill({ color: 0xf2dfbd }).stroke({ color: 0xffe8a3, width: 3 })
    .roundRect(-33, -49, 66, 98, 7).fill({ color: 0x7c0715 }).stroke({ color: 0xd4a437, width: 2 })
    .circle(0, 0, 20).stroke({ color: 0xffd878, width: 2, alpha: 0.72 })
    .moveTo(-24, 0).lineTo(24, 0).stroke({ color: 0xffd878, width: 2, alpha: 0.72 })
    .moveTo(0, -34).lineTo(0, 34).stroke({ color: 0xffd878, width: 2, alpha: 0.72 });
  node.addChild(back);
  node.rotation = index % 2 ? -0.18 : 0.22;
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

  const wheel = new Container();
  wheel.addChild(new Graphics().ellipse(0, 28, 270, 65).fill({ color: 0x000000, alpha: 0.48 }));
  const wheelTilt = new Container();
  wheelTilt.scale.y = 0.48;
  const outerBowl = sprite(textures.wheel, 560);
  const wheelHead = sprite(textures.wheel, 560);
  const wheelHeadMask = new Graphics().circle(0, 0, 191).fill(0xffffff);
  wheelHead.mask = wheelHeadMask;
  wheelTilt.addChild(outerBowl, wheelHead, wheelHeadMask);
  const ball = new Graphics().circle(0, 0, 10).fill({ color: 0xfff8df }).stroke({ color: 0x9a6518, width: 2 });
  wheelTilt.addChild(ball);
  wheel.addChild(wheelTilt);
  back.addChild(wheel);

  const farLayer = new Container();
  const midLayer = new Container();
  const nearLayer = new Container();
  back.addChild(farLayer, midLayer);
  front.addChild(nearLayer);

  const itemTextures = [textures.chipRed, textures.chipGold, textures.chipNavy, textures.chipWhite];
  const farTextures = [textures.chipRedFar, textures.chipGoldFar, textures.chipNavyFar, textures.chipWhiteFar];
  const nearTextures = [textures.chipRedNear, textures.chipGoldNear, textures.chipNavyNear, textures.chipWhiteNear];
  const items: FloatingItem[] = [];
  const pattern = [
    [0.05, 0.18], [0.15, 0.7], [0.28, 0.12], [0.44, 0.84], [0.58, 0.13],
    [0.72, 0.74], [0.88, 0.18], [0.95, 0.62], [0.08, 0.48], [0.35, 0.62],
    [0.63, 0.48], [0.82, 0.42], [0.2, 0.31], [0.48, 0.28], [0.76, 0.3],
    [0.02, 0.88], [0.3, 0.94], [0.68, 0.92], [0.97, 0.9], [0.54, 0.68],
    [0.12, 0.06], [0.4, 0.04], [0.62, 0.05], [0.9, 0.07], [0.22, 0.82],
    [0.78, 0.84], [0.02, 0.32], [0.98, 0.34], [0.39, 0.44], [0.61, 0.58],
  ] as const;

  pattern.forEach(([nx, ny], index) => {
    const depth: Depth = index % 5 === 0 ? "near" : index % 3 === 0 ? "far" : "mid";
    const depthTextures = depth === "near" ? nearTextures : farTextures;
    const node = index % 7 === 0
      ? card(index)
      : index % 4 === 3
        ? new Container({ children: [sprite(depth === "mid" ? textures.coin : depth === "near" ? textures.coinNear : textures.coinFar, 110)] })
        : depth === "mid"
          ? chip(itemTextures[index % itemTextures.length], textures.neos)
          : new Container({ children: [sprite(depthTextures[index % depthTextures.length], 120)] });
    (depth === "near" ? nearLayer : depth === "far" ? farLayer : midLayer).addChild(node);
    items.push({ node, depth, nx, ny, phase: index * 0.71, baseRotation: node.rotation + index * 0.13, baseSize: depth === "near" ? 1.15 : depth === "far" ? 0.52 : 0.82, baseX: 0, baseY: 0 });
  });

  return {
    back, front, hallLandscape, hallPortrait, wheel, wheelHead, ball, items,
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

  const wheelSize = portrait ? layout.machine.width * 0.82 : layout.machine.width * 1.04;
  scene.wheel.position.set(
    layout.machine.x + layout.machine.width * (portrait ? 0.9 : 0.96),
    layout.machine.y + layout.machine.height * (portrait ? 0.29 : 0.48),
  );
  scene.wheel.scale.set(wheelSize / 560);

  const count = width < 600 ? 16 : width < 1100 ? 22 : 30;
  scene.items.forEach((item, index) => {
    item.node.visible = index < count;
    const edgeBias = item.depth === "near" ? 0.04 : 0;
    const nx = item.nx > 0.25 && item.nx < 0.75 && item.ny > 0.2 && item.ny < 0.76
      ? item.nx < 0.5 ? 0.16 : 0.84
      : item.nx;
    item.baseX = (edgeBias + nx * (1 - edgeBias * 2)) * width;
    item.baseY = item.ny * height;
    item.node.position.set(item.baseX, item.baseY);
    const responsive = Math.min(width / 1280, height / 760);
    item.node.scale.set(item.baseSize * Math.max(0.48, responsive));
  });
}

export function animateBackground(scene: EnvironmentScene, timeSeconds: number): void {
  if (scene.reducedMotion) return;
  scene.wheelHead.rotation = timeSeconds * Math.PI * 0.18;
  const ballAngle = -timeSeconds * Math.PI * 0.26;
  scene.ball.position.set(Math.cos(ballAngle) * 225, Math.sin(ballAngle) * 225);
  scene.items.forEach((item) => {
    if (!item.node.visible) return;
    const speed = item.depth === "near" ? 1.2 : item.depth === "far" ? 0.45 : 0.72;
    const parallax = item.depth === "near" ? 22 : item.depth === "far" ? 5 : 11;
    item.node.x = item.baseX + scene.pointer.x * parallax;
    item.node.y = item.baseY + Math.sin(timeSeconds * speed + item.phase) * (5 + parallax * 0.2) + scene.pointer.y * parallax;
    item.node.rotation = item.baseRotation + Math.sin(timeSeconds * speed * 0.7 + item.phase) * 0.24;
    const flip = Math.max(0.12, Math.abs(Math.cos(timeSeconds * speed * 0.55 + item.phase)));
    const scale = item.node.scale.y;
    item.node.scale.x = scale * flip;
  });
}
