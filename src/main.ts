import { Application } from "pixi.js";
import { gsap } from "gsap";
import "./styles/main.css";
import { animateBackground, createBackground, drawBackground } from "./scene/background";
import { createCabinet, layoutCabinet } from "./scene/cabinet";
import { computeLayout, type LayoutRect, type SafeAreaInsets } from "./scene/layout";

function readSafeAreaInsets(): SafeAreaInsets {
  const probe = document.createElement("div");
  probe.className = "safe-area-probe";
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = {
    top: Number.parseFloat(style.paddingTop) || 0,
    right: Number.parseFloat(style.paddingRight) || 0,
    bottom: Number.parseFloat(style.paddingBottom) || 0,
    left: Number.parseFloat(style.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

function placeElement(element: HTMLElement, frame: LayoutRect): void {
  element.style.left = `${frame.x}px`;
  element.style.top = `${frame.y}px`;
  element.style.width = `${frame.width}px`;
  element.style.height = `${frame.height}px`;
}

async function boot(): Promise<void> {
  const host = document.querySelector<HTMLDivElement>("#canvas-host");
  const marquee = document.querySelector<HTMLElement>("#marquee");
  const paytable = document.querySelector<HTMLElement>("#paytable");
  const spin = document.querySelector<HTMLButtonElement>("#spin");
  const loading = document.querySelector<HTMLElement>("#loading");
  if (!host || !marquee || !paytable || !spin || !loading) throw new Error("Game shell is incomplete");

  const app = new Application();
  await app.init({
    resizeTo: window,
    antialias: true,
    backgroundAlpha: 0,
    resolution: Math.min(window.devicePixelRatio, 2),
    autoDensity: true,
    preference: "webgl",
  });
  app.canvas.setAttribute("aria-label", "Trust Royale casino cabinet");
  host.appendChild(app.canvas);

  const [environment, cabinet] = await Promise.all([createBackground(), createCabinet()]);
  app.stage.addChild(environment.back, cabinet.machine, environment.front);

  const motion = gsap.timeline({ repeat: -1, yoyo: true });
  motion
    .to(".scene-effects__beam--left", { rotation: 8, transformOrigin: "50% 0%", duration: 5, ease: "sine.inOut" }, 0)
    .to(".scene-effects__beam--right", { rotation: -8, transformOrigin: "50% 0%", duration: 6, ease: "sine.inOut" }, 0)
    .to(".scene-effects__spark", { opacity: 0.18, scale: 0.65, duration: 1.3, stagger: 0.28, ease: "sine.inOut" }, 0);
  const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const updateMotion = () => {
    environment.reducedMotion = motionQuery.matches;
    document.querySelectorAll<SVGSVGElement>("svg").forEach((svg) => {
      if (motionQuery.matches) svg.pauseAnimations();
      else svg.unpauseAnimations();
    });
    if (motionQuery.matches) motion.pause(0);
    else motion.resume();
  };
  motionQuery.addEventListener("change", updateMotion);
  updateMotion();

  const updatePointer = (x: number, y: number) => {
    gsap.to(environment.pointer, { x, y, duration: 0.55, ease: "power2.out", overwrite: true });
  };
  window.addEventListener("pointermove", (event) => {
    updatePointer((event.clientX / window.innerWidth - 0.5) * 2, (event.clientY / window.innerHeight - 0.5) * 2);
  }, { passive: true });
  const orientationWithPermission = typeof DeviceOrientationEvent === "undefined"
    ? undefined
    : DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
  if (orientationWithPermission && typeof orientationWithPermission.requestPermission !== "function") {
    window.addEventListener("deviceorientation", (event) => {
      updatePointer(Math.max(-1, Math.min(1, (event.gamma ?? 0) / 25)), Math.max(-1, Math.min(1, (event.beta ?? 0) / 35)));
    }, { passive: true });
  }

  let pendingFrame = 0;
  const renderLayout = () => {
    pendingFrame = 0;
    const layout = computeLayout(window.innerWidth, window.innerHeight, readSafeAreaInsets());
    document.documentElement.dataset.orientation = layout.orientation;
    document.documentElement.style.setProperty("--ui-scale", String(Math.max(0.62, Math.min(1.25, layout.machine.scale))));
    placeElement(marquee, layout.marquee);
    placeElement(paytable, layout.paytable);
    placeElement(spin, layout.spinButton);
    drawBackground(environment, layout);
    layoutCabinet(cabinet, layout);
  };
  const scheduleLayout = () => {
    if (pendingFrame) cancelAnimationFrame(pendingFrame);
    pendingFrame = requestAnimationFrame(renderLayout);
  };

  window.addEventListener("resize", scheduleLayout, { passive: true });
  window.addEventListener("orientationchange", scheduleLayout, { passive: true });
  app.ticker.add(() => animateBackground(environment, performance.now() / 1000));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      app.stop();
      motion.pause();
    } else {
      app.start();
      if (!motionQuery.matches) motion.resume();
    }
  });
  renderLayout();
  loading.remove();
  document.documentElement.dataset.ready = "true";
}

boot().catch((error: unknown) => {
  document.documentElement.dataset.error = error instanceof Error ? error.message : String(error);
  const loading = document.querySelector<HTMLElement>("#loading");
  if (loading) loading.textContent = "Unable to prepare preview";
  console.error(error);
});
