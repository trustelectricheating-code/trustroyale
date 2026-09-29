import { Assets, Container, Sprite, Texture } from "pixi.js";
import { gsap } from "gsap";
import type { EnvironmentScene } from "./background";

export interface ChipsScene {
  tick(timeSeconds: number, frameMs: number): void;
  settle(): void;
  setReducedMotion(reduced: boolean): void;
  positions(): number[][];
}

export function createChips(scene: EnvironmentScene, reducedMotion: boolean): ChipsScene {
  let reduced = reducedMotion;
  let landing = true;
  let slowFrames = 0;
  let activeCount = scene.items.filter(({ node }) => node.visible).length;

  return {
    tick(timeSeconds, frameMs) {
      if (frameMs > 20) slowFrames += 1;
      else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames >= 12 && activeCount > 9) {
        activeCount = Math.max(9, activeCount - 2);
        scene.items.forEach((item, index) => { if (index >= activeCount) item.node.visible = false; });
        slowFrames = 0;
      }
      if (!landing || reduced) return;
      scene.items.forEach((item, index) => {
        if (!item.node.visible || index >= activeCount) return;
        const speed = item.depth === "far" ? 0.35 : 0.55;
        const parallax = item.depth === "far" ? 4 : 8;
        item.node.x = item.baseX + Math.cos(timeSeconds * speed + item.phase) * 2 + scene.pointer.x * parallax;
        item.node.y = item.baseY + Math.sin(timeSeconds * speed + item.phase) * 4 + scene.pointer.y * parallax;
        const rotationRange = item.kind === "card" ? Math.PI / 30 : Math.PI / 36;
        item.node.rotation = item.baseRotation + Math.sin(timeSeconds * speed * 0.7 + item.phase) * rotationRange;
      });
    },
    settle() {
      landing = false;
      scene.items.forEach((item, index) => {
        gsap.killTweensOf(item.node);
        if (reduced) {
          item.node.position.set(item.baseX, item.baseY);
          item.node.alpha = index < activeCount ? 0.72 : 0;
          return;
        }
        gsap.fromTo(item.node, { y: item.node.y - 8 }, { x: item.baseX, y: item.baseY, rotation: item.baseRotation, duration: 0.5 + (index % 3) * 0.08, delay: index * 0.018, ease: "bounce.out" });
      });
    },
    setReducedMotion(value) { reduced = value; if (reduced && landing) scene.items.forEach((item) => item.node.position.set(item.baseX, item.baseY)); },
    positions: () => scene.items.filter(({ node }) => node.visible).map(({ node }) => [node.x, node.y, node.rotation]),
  };
}

export function burstWin(layer: Container, reducedMotion: boolean): void {
  if (reducedMotion) return;
  const textures = ["fx.confetti", "fx.coin", "fx.sparkle"].map((key) => Assets.get<Texture>(key) ?? Texture.EMPTY);
  for (let index = 0; index < 18; index += 1) {
    const particle = new Sprite(textures[index % textures.length]);
    particle.anchor.set(0.5);
    particle.position.set(innerWidth / 2, innerHeight * 0.42);
    particle.scale.set(index % 3 === 1 ? 0.16 : 0.1);
    layer.addChild(particle);
    gsap.to(particle, {
      x: innerWidth / 2 + (index - 8.5) * Math.min(44, innerWidth / 22),
      y: innerHeight * (0.34 + (index % 6) * 0.075),
      rotation: (index - 9) * 0.55,
      alpha: 0,
      duration: 1.35,
      ease: "power2.out",
      onComplete: () => particle.destroy(),
    });
  }
}
