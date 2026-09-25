import { Application } from "pixi.js";
import "./styles/main.css";
import { createBackground, drawBackground } from "./scene/background";
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

  const background = createBackground();
  const cabinet = await createCabinet();
  app.stage.addChild(background, cabinet.machine, cabinet.chipTray, cabinet.rightPanel);

  let pendingFrame = 0;
  const renderLayout = () => {
    pendingFrame = 0;
    const layout = computeLayout(window.innerWidth, window.innerHeight, readSafeAreaInsets());
    document.documentElement.dataset.orientation = layout.orientation;
    document.documentElement.style.setProperty("--ui-scale", String(Math.max(0.62, Math.min(1.25, layout.machine.scale))));
    placeElement(marquee, layout.marquee);
    placeElement(paytable, layout.paytable);
    placeElement(spin, layout.spinButton);
    drawBackground(background, layout);
    layoutCabinet(cabinet, layout);
    app.render();
  };
  const scheduleLayout = () => {
    if (pendingFrame) cancelAnimationFrame(pendingFrame);
    pendingFrame = requestAnimationFrame(renderLayout);
  };

  window.addEventListener("resize", scheduleLayout, { passive: true });
  window.addEventListener("orientationchange", scheduleLayout, { passive: true });
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
