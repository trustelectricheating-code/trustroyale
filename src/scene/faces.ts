import { Assets, Container, Sprite, Texture } from "pixi.js";
import { gsap } from "gsap";
import type { PaytableRule } from "../config/paytable";
import { SYMBOLS } from "../config/symbols";
import { setPaylineFrame, type ReelsScene } from "./reels";

const wait = (seconds: number) => new Promise<void>((resolve) => { gsap.delayedCall(seconds, resolve); });

export async function blink(scene: ReelsScene): Promise<void> {
  const faceIndexes = scene.strip[1].map((symbol, index) => SYMBOLS[symbol].kind === "face" ? index : -1).filter((index) => index >= 0);
  for (let repeat = 0; repeat < 3; repeat += 1) {
    for (const frame of ["half", "closed", "half", "idle"] as const) {
      faceIndexes.forEach((index) => setPaylineFrame(scene, index, frame));
      await wait(0.045);
    }
  }
  faceIndexes.forEach((index) => setPaylineFrame(scene, index, "win"));
}

export async function pulse(scene: ReelsScene): Promise<void> {
  const layer = new Container();
  scene.container.addChild(layer);
  scene.strip[1].forEach((symbol, index) => {
    if (symbol !== "neos") return;
    const glow = new Sprite(Assets.get<Texture>("fx.glow") ?? Texture.EMPTY);
    glow.anchor.set(0.5);
    glow.position.copyFrom(scene.paylineSprites[index].position);
    glow.x += scene.columns[index].x;
    glow.tint = 0xffb746;
    glow.alpha = 0.62;
    layer.addChild(glow);
    const ring = new Sprite(Assets.get<Texture>("emblem.neos.pulse") ?? Texture.EMPTY);
    ring.anchor.set(0.5);
    ring.position.copyFrom(scene.paylineSprites[index].position);
    ring.x += scene.columns[index].x;
    ring.alpha = 0.9;
    layer.addChild(ring);
    gsap.fromTo(glow.scale, { x: 0.5, y: 0.5 }, { x: 1.45, y: 1.45, duration: 0.8, ease: "sine.out" });
    gsap.to(glow, { alpha: 0, duration: 0.8 });
    gsap.fromTo(ring.scale, { x: 0.35, y: 0.35 }, { x: 1.8, y: 1.8, duration: 0.8, ease: "power2.out" });
    gsap.to(ring, { alpha: 0, duration: 0.8 });
  });
  await wait(0.82);
  layer.destroy({ children: true });
}

export async function glow(scene: ReelsScene, rule: PaytableRule): Promise<void> {
  const contributing = rule.id === "keith-2-any" ? scene.strip[1].map((symbol) => symbol === "keith") : [true, true, true];
  const targets = scene.paylineSprites.filter((_, index) => contributing[index]);
  gsap.fromTo(targets, { alpha: 0.72 }, { alpha: 1, duration: 0.24, repeat: 3, yoyo: true });
  await wait(0.96);
}

export async function celebrate(scene: ReelsScene, rule: PaytableRule, reducedMotion = false): Promise<void> {
  if (reducedMotion) {
    scene.strip[1].forEach((symbol, index) => { if (SYMBOLS[symbol].kind === "face") setPaylineFrame(scene, index, "win"); });
    return;
  }
  if (rule.celebration === "blink") return blink(scene);
  if (rule.celebration === "pulse") return pulse(scene);
  return glow(scene, rule);
}
