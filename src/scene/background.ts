import { Container, Graphics } from "pixi.js";
import type { SceneLayout } from "./layout";

export function createBackground(): Container {
  const layer = new Container();
  layer.label = "Monte Carlo velvet background";
  return layer;
}

export function drawBackground(layer: Container, layout: SceneLayout): void {
  layer.removeChildren().forEach((child) => child.destroy());
  const { width, height } = layout.viewport;

  const base = new Graphics()
    .rect(0, 0, width, height).fill({ color: 0x160206 })
    .circle(width * 0.5, height * 0.12, Math.max(width, height) * 0.72).fill({ color: 0x5e0915, alpha: 0.72 })
    .circle(width * 0.5, height * 0.48, Math.max(width, height) * 0.45).fill({ color: 0x240208, alpha: 0.68 });
  layer.addChild(base);

  const curtainWidth = Math.max(width * 0.22, 90);
  const curtains = new Graphics();
  for (let i = 0; i < 7; i += 1) {
    const stripe = curtainWidth / 7;
    const shade = i % 2 === 0 ? 0x8c111e : 0x4b0710;
    curtains
      .rect(i * stripe, 0, stripe + 1, height).fill({ color: shade, alpha: 0.6 - i * 0.035 })
      .rect(width - (i + 1) * stripe, 0, stripe + 1, height).fill({ color: shade, alpha: 0.6 - i * 0.035 });
  }
  layer.addChild(curtains);

  const ropes = new Graphics()
    .moveTo(0, height * 0.42)
    .bezierCurveTo(curtainWidth * 0.38, height * 0.48, curtainWidth * 0.7, height * 0.48, curtainWidth, height * 0.34)
    .stroke({ color: 0xd4a437, width: Math.max(2, width * 0.004), alpha: 0.9 })
    .moveTo(width, height * 0.42)
    .bezierCurveTo(width - curtainWidth * 0.38, height * 0.48, width - curtainWidth * 0.7, height * 0.48, width - curtainWidth, height * 0.34)
    .stroke({ color: 0xd4a437, width: Math.max(2, width * 0.004), alpha: 0.9 });
  layer.addChild(ropes);

  const lights = new Graphics();
  const lightCount = Math.max(8, Math.floor(width / 120));
  for (let i = 0; i < lightCount; i += 1) {
    const x = ((i + 0.5) / lightCount) * width;
    const y = height * (0.08 + (i % 3) * 0.055);
    const radius = Math.max(2, Math.min(8, width * 0.004));
    lights.circle(x, y, radius * 3).fill({ color: 0xffc83f, alpha: 0.05 });
    lights.circle(x, y, radius).fill({ color: 0xffe8a3, alpha: 0.65 });
  }
  layer.addChild(lights);

  const floor = new Graphics()
    .rect(0, height * 0.78, width, height * 0.22).fill({ color: 0x090102, alpha: 0.55 })
    .moveTo(0, height * 0.9).lineTo(width, height * 0.9).stroke({ color: 0xd4a437, width: 1, alpha: 0.12 });
  layer.addChild(floor);
}
