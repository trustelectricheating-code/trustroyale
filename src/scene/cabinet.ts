import { Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import { CABINET_ART, CABINET_DESIGN } from "./cabinetArt";
import type { SceneLayout } from "./layout";

const ASSETS = {
  cabinet: "/assets/cabinet/body.webp",
  scott: "/assets/mock/scott-medallion.webp",
  fiona: "/assets/mock/fiona-medallion.webp",
  gia: "/assets/mock/gia-medallion.webp",
  keith: "/assets/mock/keith-medallion.webp",
  neos: "/assets/symbols/neos-chip-red.webp",
  cherry: "/assets/mock/cherry-reel.webp",
  seven: "/assets/mock/seven-reel.webp",
  sweets: "/assets/mock/sweets-reel.webp",
} as const;

export interface ReelSymbolMetric {
  symbol: string;
  drum: number;
  row: number;
  drumWidth: number;
  width: number;
  height: number;
}

export interface CabinetScene {
  machine: Container;
  reelMount: Container;
  reelSymbols: ReelSymbolMetric[];
  bulbs: Graphics[];
}

export function cabinetBulbAlpha(index: number, count: number, timeSeconds: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0.78;
  const duration = 3;
  const pattern = Math.floor(timeSeconds / duration) % 4;
  const progress = (timeSeconds % duration) / duration;
  if (pattern === 0) {
    const distance = Math.abs(index - Math.floor(progress * count));
    return distance <= 1 ? 1 : 0.18;
  }
  if (pattern === 1) return index % 2 === Math.floor(progress * 8) % 2 ? 0.95 : 0.2;
  if (pattern === 2) return index / Math.max(1, count - 1) <= progress ? 0.95 : 0.16;
  return 0.28 + (Math.sin(progress * Math.PI * 8) * 0.5 + 0.5) * 0.72;
}

function centredSprite(texture: Texture, x: number, y: number, width: number, height = width): Sprite {
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  sprite.position.set(x, y);
  sprite.width = width;
  sprite.height = height;
  return sprite;
}

function maskedMedallion(texture: Texture, x: number, y: number, size: number): Container {
  const holder = new Container();
  holder.position.set(x, y);
  const sprite = centredSprite(texture, 0, 0, size);
  const mask = new Graphics().circle(0, 0, size * 0.49).fill(0xffffff);
  sprite.mask = mask;
  holder.addChild(sprite, mask);
  return holder;
}

function reelSymbol(texture: Texture, masked: boolean, neos: boolean, x: number, y: number, size: number, scaleX: number, scaleY: number): Container {
  let node: Container;
  if (neos) {
    node = new Container();
    node.position.set(x, y);
    node.addChild(centredSprite(texture, 0, 0, size));
  } else if (masked) {
    node = maskedMedallion(texture, x, y, size);
  } else {
    node = new Container();
    node.position.set(x, y);
    node.addChild(centredSprite(texture, 0, 0, size));
  }
  node.scale.set(scaleX, scaleY);
  return node;
}

function createDrum(textures: Record<keyof typeof ASSETS, Texture>, index: number, metrics: ReelSymbolMetric[]): Container {
  const { reelWindow } = CABINET_ART;
  const gap = 9;
  const width = (reelWindow.width - gap * 4) / 3;
  const height = reelWindow.height - 14;
  const drum = new Container();
  drum.position.set(reelWindow.x + gap + index * (width + gap), reelWindow.y + 7);

  const mask = new Graphics().roundRect(0, 0, width, height, 19).fill(0xffffff);
  drum.mask = mask;
  drum.addChild(mask);
  drum.addChild(new Graphics()
    .roundRect(0, 0, width, height, 19).fill({ color: 0xf4e3bd })
    .ellipse(width * 0.5, height * 0.5, width * 0.51, height * 0.56).fill({ color: 0xfff8df, alpha: 0.78 })
    .rect(0, 0, width * 0.12, height).fill({ color: 0x5b250e, alpha: 0.17 })
    .rect(width * 0.88, 0, width * 0.12, height).fill({ color: 0x5b250e, alpha: 0.17 }));

  const sets = [
    [["seven", textures.seven, false, false], ["scott", textures.scott, true, false], ["cherry", textures.cherry, false, false]],
    [["fiona", textures.fiona, true, false], ["gia", textures.gia, true, false], ["sweets", textures.sweets, false, false]],
    [["keith", textures.keith, true, false], ["neos", textures.neos, false, true], ["seven", textures.seven, false, false]],
  ] as const;
  const positions = [
    { y: -5, size: 82, sx: 0.88, sy: 0.55 },
    { y: height * 0.5, size: 82, sx: 1, sy: 1 },
    { y: height + 5, size: 82, sx: 0.88, sy: 0.55 },
  ];
  sets[index].forEach(([symbol, texture, masked, neos], row) => {
    const position = positions[row];
    const node = reelSymbol(texture, masked, neos, width * 0.5, position.y, position.size, position.sx, position.sy);
    drum.addChild(node);
    metrics.push({ symbol, drum: index, row, drumWidth: width, width: node.width, height: node.height });
  });

  const curvature = new Graphics()
    .rect(0, height * 0.32, width, height * 0.36).fill({ color: 0xffffff, alpha: 0.1 })
    .rect(0, 0, width * 0.1, height).fill({ color: 0x4a3625, alpha: 0.15 })
    .rect(width * 0.9, 0, width * 0.1, height).fill({ color: 0x4a3625, alpha: 0.15 })
    .rect(width * 0.26, 0, width * 0.08, height).fill({ color: 0xffffff, alpha: 0.055 });
  const shadeBands = 9;
  const bandHeight = height * 0.045;
  for (let band = 0; band < shadeBands; band += 1) {
    const alpha = 0.29 * ((shadeBands - band) / shadeBands) ** 2;
    curvature.rect(0, band * bandHeight, width, bandHeight + 1).fill({ color: 0x3d3024, alpha });
    curvature.rect(0, height - (band + 1) * bandHeight, width, bandHeight + 1).fill({ color: 0x3d3024, alpha });
  }
  curvature.roundRect(1, 1, width - 2, height - 2, 18).stroke({ color: 0xffda78, width: 3, alpha: 0.7 });
  drum.addChild(curvature);
  return drum;
}

export async function createCabinet(): Promise<CabinetScene> {
  const entries = Object.entries(ASSETS) as [keyof typeof ASSETS, string][];
  const loaded = await Assets.load<Texture>(entries.map(([, url]) => url));
  const textures = Object.fromEntries(entries.map(([key, url]) => [key, loaded[url]])) as Record<keyof typeof ASSETS, Texture>;
  const machine = new Container();
  const reelSymbols: ReelSymbolMetric[] = [];
  const bulbs: Graphics[] = [];
  machine.label = "Photoreal Trust Royale cabinet with three cylindrical reels";

  machine.addChild(new Graphics().ellipse(360, 1050, 330, 30).fill({ color: 0x000000, alpha: 0.48 }));
  const { reelWindow } = CABINET_ART;
  machine.addChild(new Graphics()
    .roundRect(reelWindow.x - 4, reelWindow.y - 4, reelWindow.width + 8, reelWindow.height + 8, 28)
    .fill({ color: 0x100b09 }));
  for (let index = 0; index < 3; index += 1) machine.addChild(createDrum(textures, index, reelSymbols));

  const reelMount = new Container();
  machine.addChild(reelMount);

  const cabinet = new Sprite(textures.cabinet);
  cabinet.width = CABINET_DESIGN.width;
  cabinet.height = CABINET_DESIGN.height;
  machine.addChild(cabinet);

  const bulbLayer = new Container();
  CABINET_ART.marqueeBulbs.forEach(([x, y]) => {
    const bulb = new Graphics()
      .circle(x, y, 10).fill({ color: 0xffb52e, alpha: 0.16 })
      .circle(x, y, 5).fill({ color: 0xffd66d, alpha: 0.88 })
      .circle(x - 1, y - 1, 2).fill({ color: 0xffffe1 });
    bulbs.push(bulb);
    bulbLayer.addChild(bulb);
  });
  machine.addChild(bulbLayer);

  machine.addChild(new Graphics()
    .roundRect(reelWindow.x - 3, reelWindow.y - 3, reelWindow.width + 6, reelWindow.height + 6, 28)
      .stroke({ color: 0xffe3a0, width: 4, alpha: 0.86 })
    .moveTo(reelWindow.x + 18, reelWindow.y + 9)
      .lineTo(reelWindow.x + reelWindow.width * 0.42, reelWindow.y + 9)
      .lineTo(reelWindow.x + reelWindow.width * 0.24, reelWindow.y + reelWindow.height - 9)
      .lineTo(reelWindow.x + 7, reelWindow.y + reelWindow.height - 9)
      .closePath().fill({ color: 0xffffff, alpha: 0.055 })
    .moveTo(reelWindow.x + 4, reelWindow.y + reelWindow.height * 0.5)
      .lineTo(reelWindow.x + 17, reelWindow.y + reelWindow.height * 0.44)
      .lineTo(reelWindow.x + 17, reelWindow.y + reelWindow.height * 0.56)
      .closePath().fill({ color: 0xffd66d })
    .moveTo(reelWindow.x + reelWindow.width - 4, reelWindow.y + reelWindow.height * 0.5)
      .lineTo(reelWindow.x + reelWindow.width - 17, reelWindow.y + reelWindow.height * 0.44)
      .lineTo(reelWindow.x + reelWindow.width - 17, reelWindow.y + reelWindow.height * 0.56)
      .closePath().fill({ color: 0xffd66d }));

  return { machine, reelMount, reelSymbols, bulbs };
}

export function animateCabinet(scene: CabinetScene, timeSeconds: number, reducedMotion: boolean): void {
  scene.bulbs.forEach((bulb, index) => {
    bulb.alpha = cabinetBulbAlpha(index, scene.bulbs.length, timeSeconds, reducedMotion);
  });
}

export function layoutCabinet(scene: CabinetScene, layout: SceneLayout): void {
  scene.machine.position.set(layout.machine.x, layout.machine.y);
  scene.machine.scale.set(layout.machine.scale);
}
