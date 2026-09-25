import { Assets, Container, Graphics, Sprite, Text, TextStyle, Texture } from "pixi.js";
import type { SceneLayout } from "./layout";

const ASSETS = {
  scott: "/assets/mock/scott-medallion.webp",
  fiona: "/assets/mock/fiona-medallion.webp",
  keith: "/assets/mock/keith-medallion.webp",
  neos: "/assets/emblem/neos.svg",
  cherry: "/assets/moodboard/cherry-classic.svg",
  seven: "/assets/moodboard/seven-classic.svg",
  sweets: "/assets/moodboard/sweets-classic.svg",
  chipRed: "/assets/moodboard/chip-red.svg",
  chipGold: "/assets/moodboard/chip-gold.svg",
  chipNavy: "/assets/moodboard/chip-navy.svg",
  chipWhite: "/assets/moodboard/chip-white.svg",
} as const;

export interface CabinetScene {
  machine: Container;
  chipTray: Container;
  rightPanel: Container;
}

function label(text: string, size: number, colour = 0xffe8a3): Text {
  return new Text({
    text,
    style: new TextStyle({ fill: colour, fontFamily: "Georgia, serif", fontSize: size, fontWeight: "700", letterSpacing: size * 0.08, align: "center" }),
  });
}

function symbol(texture: Texture, x: number, y: number, size: number): Sprite {
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  sprite.position.set(x, y);
  sprite.width = size;
  sprite.height = size;
  return sprite;
}

function maskedMedallion(texture: Texture, x: number, y: number, size: number): Container {
  const container = new Container();
  container.position.set(x, y);
  const sprite = symbol(texture, 0, 0, size);
  const mask = new Graphics().circle(0, 0, size * 0.49).fill(0xffffff);
  sprite.mask = mask;
  container.addChild(sprite, mask);
  return container;
}

export async function createCabinet(): Promise<CabinetScene> {
  const assetEntries = Object.entries(ASSETS) as [keyof typeof ASSETS, string][];
  const loaded = await Assets.load<Texture>(assetEntries.map(([, url]) => url));
  const textures = Object.fromEntries(assetEntries.map(([key, url]) => [key, loaded[url]])) as Record<keyof typeof ASSETS, Texture>;
  const machine = new Container();
  machine.label = "Static three-reel cabinet";

  const shadow = new Graphics().roundRect(24, 24, 672, 1000, 82).fill({ color: 0x000000, alpha: 0.48 });
  const body = new Graphics()
    .roundRect(0, 0, 720, 1000, 82).fill({ color: 0x180205 }).stroke({ color: 0x7a5410, width: 18 })
    .roundRect(20, 20, 680, 960, 66).fill({ color: 0x8c111e }).stroke({ color: 0xffe8a3, width: 7 })
    .roundRect(42, 76, 636, 700, 42).fill({ color: 0x090708 }).stroke({ color: 0xd4a437, width: 13 })
    .roundRect(62, 98, 596, 656, 30).fill({ color: 0xf5ead5 }).stroke({ color: 0x7a5410, width: 5 });
  machine.addChild(shadow, body);

  const frameBulbs = new Graphics();
  let bulbIndex = 0;
  const addBulb = (x: number, y: number) => {
    const bright = bulbIndex++ % 2 === 0;
    frameBulbs.circle(x, y, bright ? 8 : 6).fill({ color: bright ? 0xffefad : 0x9b6510, alpha: bright ? 0.96 : 0.65 });
    if (bright) frameBulbs.circle(x, y, 14).fill({ color: 0xffc83f, alpha: 0.1 });
  };
  for (let x = 78; x <= 642; x += 47) {
    addBulb(x, 83);
    addBulb(x, 769);
  }
  for (let y = 128; y <= 722; y += 49) {
    addBulb(50, y);
    addBulb(670, y);
  }
  machine.addChild(frameBulbs);

  const ornaments = new Graphics()
    .moveTo(32, 138).bezierCurveTo(70, 110, 80, 66, 118, 48).stroke({ color: 0xffe8a3, width: 5, alpha: 0.75 })
    .moveTo(688, 138).bezierCurveTo(650, 110, 640, 66, 602, 48).stroke({ color: 0xffe8a3, width: 5, alpha: 0.75 })
    .circle(118, 48, 7).fill({ color: 0xd4a437 })
    .circle(602, 48, 7).fill({ color: 0xd4a437 });
  machine.addChild(ornaments);

  const reelWidth = 596 / 3;
  const rowHeight = 656 / 3;
  const reelLines = new Graphics();
  for (let reel = 1; reel < 3; reel += 1) reelLines.rect(62 + reel * reelWidth - 2, 98, 4, 656).fill({ color: 0x7a5410, alpha: 0.72 });
  for (let row = 1; row < 3; row += 1) reelLines.rect(62, 98 + row * rowHeight - 1, 596, 2).fill({ color: 0xd4a437, alpha: 0.28 });
  reelLines.rect(54, 98 + rowHeight, 612, rowHeight).stroke({ color: 0xe81e2c, width: 7, alpha: 0.8 });
  machine.addChild(reelLines);

  const reelSymbols = [
    [{ texture: textures.cherry }, { texture: textures.scott, masked: true }, { texture: textures.seven }],
    [{ texture: textures.fiona, masked: true }, { texture: textures.neos }, { texture: textures.sweets }],
    [{ texture: textures.keith, masked: true }, { texture: textures.cherry }, { texture: textures.neos }],
  ];
  for (let reel = 0; reel < 3; reel += 1) {
    for (let row = 0; row < 3; row += 1) {
      const reelSymbol = reelSymbols[reel][row];
      const x = 62 + reelWidth * (reel + 0.5);
      const y = 98 + rowHeight * (row + 0.5);
      machine.addChild(reelSymbol.masked ? maskedMedallion(reelSymbol.texture, x, y, 150) : symbol(reelSymbol.texture, x, y, 150));
    }
  }

  const reelDepth = new Graphics();
  for (let band = 0; band < 5; band += 1) {
    reelDepth.rect(62, 98 + band * 12, 596, 12).fill({ color: 0x35120c, alpha: 0.18 - band * 0.028 });
    reelDepth.rect(62, 754 - (band + 1) * 12, 596, 12).fill({ color: 0x35120c, alpha: 0.18 - band * 0.028 });
  }
  reelDepth
    .rect(62, 98, 14, 656).fill({ color: 0x2b0908, alpha: 0.13 })
    .rect(644, 98, 14, 656).fill({ color: 0x2b0908, alpha: 0.13 });
  machine.addChild(reelDepth);

  const glass = new Graphics()
    .moveTo(80, 112).lineTo(270, 112).lineTo(125, 735).lineTo(76, 735).closePath().fill({ color: 0xffffff, alpha: 0.09 })
    .moveTo(320, 112).lineTo(385, 112).lineTo(245, 735).lineTo(205, 735).closePath().fill({ color: 0xffffff, alpha: 0.055 });
  machine.addChild(glass);

  const lower = new Graphics()
    .roundRect(64, 806, 592, 130, 28).fill({ color: 0x0a0808 }).stroke({ color: 0xd4a437, width: 7 })
    .roundRect(82, 832, 120, 78, 16).fill({ color: 0x241017 }).stroke({ color: 0x7a5410, width: 3 })
    .roundRect(518, 832, 120, 78, 16).fill({ color: 0x241017 }).stroke({ color: 0x7a5410, width: 3 });
  machine.addChild(lower);
  const spinsText = label("SPINS LEFT\n3", 18);
  spinsText.anchor.set(0.5);
  spinsText.position.set(142, 871);
  const prizeText = label("TOP PRIZE\n25%", 18);
  prizeText.anchor.set(0.5);
  prizeText.position.set(578, 871);
  machine.addChild(spinsText, prizeText);
  machine.addChild(new Graphics()
    .roundRect(82, 980, 116, 60, 18).fill({ color: 0x6f4809 }).stroke({ color: 0xffe8a3, width: 5 })
    .roundRect(522, 980, 116, 60, 18).fill({ color: 0x6f4809 }).stroke({ color: 0xffe8a3, width: 5 }));

  const chipTray = new Container();
  chipTray.label = "Neos casino chip tray";
  chipTray.addChild(new Graphics().ellipse(260, 69, 245, 25).fill({ color: 0x070203, alpha: 0.82 }).stroke({ color: 0xd4a437, width: 7 }));
  const chipTextures = [textures.chipRed, textures.chipGold, textures.chipNavy, textures.chipWhite, textures.chipRed];
  const positions = [[92, 35, -0.22], [178, 45, 0.1], [260, 28, -0.05], [342, 45, 0.2], [428, 35, -0.12]] as const;
  positions.forEach(([x, y, rotation], index) => {
    const chip = symbol(chipTextures[index], x, y, 86);
    chip.rotation = rotation;
    chipTray.addChild(chip);
  });
  const trayLabel = label("NEOS PRIVATE TABLE", 25);
  trayLabel.anchor.set(0.5);
  trayLabel.position.set(260, 112);
  chipTray.addChild(trayLabel);

  const rightPanel = new Container();
  rightPanel.label = "Neos casino side table";
  rightPanel.addChild(new Graphics()
    .roundRect(0, 0, 390, 620, 24).fill({ color: 0x100105, alpha: 0.96 }).stroke({ color: 0xd4a437, width: 5 })
    .roundRect(12, 12, 366, 596, 17).stroke({ color: 0x7a5410, width: 2 })
    .moveTo(28, 102).lineTo(362, 102).stroke({ color: 0xd4a437, width: 2, alpha: 0.45 })
    .ellipse(195, 390, 160, 38).fill({ color: 0x050102, alpha: 0.9 }).stroke({ color: 0xd4a437, width: 6 }));
  const panelTitle = label("NEOS CLUB", 30);
  panelTitle.anchor.set(0.5);
  panelTitle.position.set(195, 60);
  rightPanel.addChild(panelTitle, maskedMedallion(textures.keith, 195, 220, 178));
  const panelChipPositions = [[68, 360, -0.18], [132, 375, 0.08], [195, 350, -0.04], [258, 375, 0.16], [322, 360, -0.1]] as const;
  panelChipPositions.forEach(([x, y, rotation], index) => {
    const chip = symbol(chipTextures[index], x, y, 78);
    chip.rotation = rotation;
    rightPanel.addChild(chip);
  });
  const panelLabel = label("NEOS CHIP RESERVE", 22);
  panelLabel.anchor.set(0.5);
  panelLabel.position.set(195, 460);
  const panelNote = label("MONTE CARLO TABLE", 16, 0xe9d7b8);
  panelNote.anchor.set(0.5);
  panelNote.position.set(195, 535);
  rightPanel.addChild(panelLabel, panelNote);

  return { machine, chipTray, rightPanel };
}

function place(container: Container, frame: SceneLayout["machine"]): void {
  container.position.set(frame.x, frame.y);
  container.scale.set(frame.scale);
}

export function layoutCabinet(scene: CabinetScene, layout: SceneLayout): void {
  place(scene.machine, layout.machine);
  scene.chipTray.visible = layout.orientation === "portrait";
  scene.rightPanel.visible = layout.orientation === "landscape";
  if (scene.chipTray.visible) place(scene.chipTray, layout.chipTray);
  if (scene.rightPanel.visible) place(scene.rightPanel, layout.chipTray);
}
