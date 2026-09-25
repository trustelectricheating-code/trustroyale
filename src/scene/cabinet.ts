import { Assets, Container, Graphics, Sprite, Text, TextStyle, Texture } from "pixi.js";
import { CABINET_ART, CABINET_DESIGN } from "./cabinetArt";
import type { SceneLayout } from "./layout";

const ASSETS = {
  cabinet: "/assets/mock/cabinet.webp",
  scott: "/assets/mock/scott-medallion.webp",
  fiona: "/assets/mock/fiona-medallion.webp",
  keith: "/assets/mock/keith-medallion.webp",
  neos: "/assets/emblem/neos.svg",
  cherry: "/assets/mock/cherry.webp",
  seven: "/assets/mock/seven.webp",
  sweets: "/assets/mock/sweets.webp",
} as const;

export interface CabinetScene { machine: Container }

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

function reelSymbol(texture: Texture, masked: boolean, x: number, y: number, size: number, scaleX: number, scaleY: number): Container | Sprite {
  const node = masked ? maskedMedallion(texture, x, y, size) : centredSprite(texture, x, y, size);
  node.scale.set(scaleX, scaleY);
  return node;
}

function createDrum(textures: Record<keyof typeof ASSETS, Texture>, index: number): Container {
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
    [[textures.seven, false], [textures.scott, true], [textures.cherry, false]],
    [[textures.fiona, true], [textures.neos, false], [textures.sweets, false]],
    [[textures.keith, true], [textures.cherry, false], [textures.seven, false]],
  ] as const;
  const positions = [
    { y: 11, size: 89, sx: 0.82, sy: 0.43 },
    { y: height * 0.5, size: 116, sx: 1, sy: 1 },
    { y: height - 8, size: 89, sx: 0.82, sy: 0.43 },
  ];
  sets[index].forEach(([texture, masked], row) => {
    const position = positions[row];
    drum.addChild(reelSymbol(texture, masked, width * 0.5, position.y, position.size, position.sx, position.sy));
  });

  drum.addChild(new Graphics()
    .rect(0, 0, width, 42).fill({ color: 0x230b07, alpha: 0.64 })
    .rect(0, height - 42, width, 42).fill({ color: 0x230b07, alpha: 0.64 })
    .ellipse(width * 0.5, height * 0.48, width * 0.39, height * 0.42).fill({ color: 0xffffff, alpha: 0.07 })
    .rect(width * 0.22, 0, width * 0.13, height).fill({ color: 0xffffff, alpha: 0.11 })
    .roundRect(1, 1, width - 2, height - 2, 18).stroke({ color: 0xffda78, width: 3, alpha: 0.7 }));
  return drum;
}

function readout(text: string, x: number, y: number): Text {
  const node = new Text({
    text,
    style: new TextStyle({
      fill: 0xffe8a3,
      fontFamily: "Arial, sans-serif",
      fontSize: 15,
      fontWeight: "700",
      align: "center",
      letterSpacing: 1.2,
      lineHeight: 18,
      dropShadow: { color: 0xff9d24, alpha: 0.65, blur: 4, distance: 0 },
    }),
  });
  node.anchor.set(0.5);
  node.position.set(x, y);
  return node;
}

export async function createCabinet(): Promise<CabinetScene> {
  const entries = Object.entries(ASSETS) as [keyof typeof ASSETS, string][];
  const loaded = await Assets.load<Texture>(entries.map(([, url]) => url));
  const textures = Object.fromEntries(entries.map(([key, url]) => [key, loaded[url]])) as Record<keyof typeof ASSETS, Texture>;
  const machine = new Container();
  machine.label = "Photoreal Trust Royale cabinet with three cylindrical reels";

  machine.addChild(new Graphics().ellipse(360, 1050, 330, 30).fill({ color: 0x000000, alpha: 0.48 }));
  for (let index = 0; index < 3; index += 1) machine.addChild(createDrum(textures, index));

  const cabinet = new Sprite(textures.cabinet);
  cabinet.width = CABINET_DESIGN.width;
  cabinet.height = CABINET_DESIGN.height;
  machine.addChild(cabinet);

  const { reelWindow } = CABINET_ART;
  machine.addChild(new Graphics()
    .roundRect(reelWindow.x - 3, reelWindow.y - 3, reelWindow.width + 6, reelWindow.height + 6, 28)
      .stroke({ color: 0xffe3a0, width: 4, alpha: 0.86 })
    .rect(reelWindow.x + 5, reelWindow.y + reelWindow.height * 0.48, reelWindow.width - 10, 3)
      .fill({ color: 0xe32935, alpha: 0.82 })
    .moveTo(reelWindow.x + 18, reelWindow.y + 9)
      .lineTo(reelWindow.x + reelWindow.width * 0.42, reelWindow.y + 9)
      .lineTo(reelWindow.x + reelWindow.width * 0.24, reelWindow.y + reelWindow.height - 9)
      .lineTo(reelWindow.x + 7, reelWindow.y + reelWindow.height - 9)
      .closePath().fill({ color: 0xffffff, alpha: 0.085 }));

  machine.addChild(
    readout("SPINS LEFT\n3", CABINET_ART.leftReadout.x, CABINET_ART.leftReadout.y),
    readout("TOP PRIZE\n25%", CABINET_ART.rightReadout.x, CABINET_ART.rightReadout.y),
  );
  return { machine };
}

export function layoutCabinet(scene: CabinetScene, layout: SceneLayout): void {
  scene.machine.position.set(layout.machine.x, layout.machine.y);
  scene.machine.scale.set(layout.machine.scale);
}
