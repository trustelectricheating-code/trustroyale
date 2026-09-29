import { gsap } from "gsap";

export type MarqueePattern = "idle" | "spin" | "win";

export interface MarqueeScene {
  setPattern(pattern: MarqueePattern): void;
  setReducedMotion(reduced: boolean): void;
  pause(): void;
  resume(): void;
}

export function createMarquee(root: HTMLElement, reducedMotion: boolean): MarqueeScene {
  const bulbs = Array.from(root.querySelectorAll<SVGElement>(".marquee__frame-bulb .marquee__bulb-lit"));
  let reduced = reducedMotion;
  let current: MarqueePattern = "idle";
  let timeline = gsap.timeline();
  root.classList.add("marquee--runtime");

  const render = (): void => {
    timeline.kill();
    gsap.killTweensOf(bulbs);
    if (reduced) {
      gsap.set(bulbs, { opacity: 0.62 });
      timeline = gsap.timeline({ repeat: -1, yoyo: true }).to(bulbs, { opacity: 0.78, duration: 2.4, ease: "sine.inOut" });
      return;
    }
    if (current === "win") {
      timeline = gsap.timeline({ repeat: 3, yoyo: true })
        .to(bulbs, { opacity: 1, duration: 0.12 })
        .to(bulbs, { opacity: 0.2, duration: 0.12 });
      return;
    }
    const step = current === "spin" ? 0.018 : 0.055;
    gsap.set(bulbs, { opacity: 0.18 });
    timeline = gsap.timeline({ repeat: -1 });
    bulbs.forEach((bulb, index) => timeline.to(bulb, { opacity: 1, duration: 0.09, repeat: 1, yoyo: true }, index * step));
  };

  render();
  return {
    setPattern(pattern) { if (pattern !== current) { current = pattern; render(); } },
    setReducedMotion(value) { if (value !== reduced) { reduced = value; render(); } },
    pause() { timeline.pause(); },
    resume() { timeline.resume(); },
  };
}
