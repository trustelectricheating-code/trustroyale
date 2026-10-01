import { Application, Assets, Texture } from "pixi.js";
import "pixi.js/unsafe-eval";
import { gsap } from "gsap";
import "./styles/main.css";
import { loadDeferredAssets, loadInitialAssets } from "./assets";
import { GameApiError, getSession, spin, type BestSummary, type SpinResponse, type WinSummary } from "./game/api";
import { GameStateMachine, type GameState } from "./game/state";
import { PAYTABLE } from "./config/paytable";
import { SYMBOLS } from "./config/symbols";
import { createBackground, drawBackground } from "./scene/background";
import { animateCabinet, createCabinet, layoutCabinet } from "./scene/cabinet";
import { DEFAULT_TITLE_PLACEMENT, type TitlePlacement } from "./scene/cabinetArt";
import { celebrate } from "./scene/faces";
import { burstWin, createChips } from "./scene/chips";
import { createMarquee } from "./scene/marquee";
import { computeLayout, type LayoutRect, type SafeAreaInsets } from "./scene/layout";
import { createReels, startFreeSpin } from "./scene/reels";
import { createSound, resultSoundNames } from "./audio/sound";
import { createControls } from "./ui/controls";
import { createPopups } from "./ui/popup";
import { createIntro } from "./ui/intro";

const sound = createSound();
let loadingGesture = false;
const loadingTarget = document.querySelector<HTMLButtonElement>("#loading");
const spinTarget = document.querySelector<HTMLButtonElement>("#spin");
const rememberLoadingGesture = (): void => {
  loadingGesture = true;
  void sound.unlock().then(() => sound.ambient.start());
  if (loadingTarget) loadingTarget.textContent = "Ready when Keith is…";
};
loadingTarget?.addEventListener("click", rememberLoadingGesture);
spinTarget?.addEventListener("click", rememberLoadingGesture);

function readSafeAreaInsets(): SafeAreaInsets {
  const probe = document.createElement("div");
  probe.className = "safe-area-probe";
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = { top: Number.parseFloat(style.paddingTop) || 0, right: Number.parseFloat(style.paddingRight) || 0, bottom: Number.parseFloat(style.paddingBottom) || 0, left: Number.parseFloat(style.paddingLeft) || 0 };
  probe.remove();
  return insets;
}

function placeElement(element: HTMLElement, frame: LayoutRect): void {
  element.style.left = `${frame.x}px`;
  element.style.top = `${frame.y}px`;
  element.style.width = `${frame.width}px`;
  element.style.height = `${frame.height}px`;
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

function warmDeferredAssets(): Promise<void> {
  sound.preload();
  return Promise.all([
    loadDeferredAssets(),
    ...[
      "/assets/keith/wave.webp",
      "/assets/keith/point.webp",
      "/assets/keith/prizes.webp",
      "/assets/keith/chips.webp",
      "/assets/keith/good-luck.webp",
      "/assets/keith/celebrate.webp",
      "/assets/keith/last-chance.webp",
      "/assets/fx/coin.webp",
      "/assets/fx/lightbeam.webp",
      "/assets/fx/confetti.webp",
    ].map(preloadImage),
  ]).then(() => undefined);
}

async function boot(): Promise<void> {
  const host = document.querySelector<HTMLDivElement>("#canvas-host");
  const marquee = document.querySelector<HTMLElement>("#marquee");
  const tracker = document.querySelector<HTMLElement>("#tries-tracker");
  const introDialog = document.querySelector<HTMLDialogElement>("#intro");
  const prizesButton = document.querySelector<HTMLButtonElement>("#prizes");
  const spinButton = document.querySelector<HTMLButtonElement>("#spin");
  const loading = document.querySelector<HTMLElement>("#loading");
  if (!host || !marquee || !tracker || !introDialog || !prizesButton || !spinButton || !loading) throw new Error("Game shell is incomplete");

  await loadInitialAssets();
  const initialSession = await getSession().catch(() => null);
  const controls = createControls(spinButton, sound.isMuted());
  controls.onMute((muted) => sound.setMuted(muted));
  const playMenuClick = async (): Promise<void> => {
    await sound.unlock();
    sound.ambient.start();
    sound.play("button");
  };
  let introDismissed = false;
  const intro = createIntro(introDialog, playMenuClick);
  introDialog.addEventListener("close", () => { introDismissed = true; });
  if (!initialSession || (initialSession.state === "idle" && initialSession.spinsLeft === 3 && !initialSession.best) || loadingGesture) {
    intro.show(() => { introDismissed = true; });
  }
  document.documentElement.dataset.menuReady = "true";
  const app = new Application();
  await app.init({ resizeTo: window, antialias: true, backgroundAlpha: 0, resolution: Math.min(devicePixelRatio, 2), autoDensity: true, preference: "webgl" });
  app.canvas.setAttribute("aria-label", "Trust Royale casino cabinet");
  host.appendChild(app.canvas);
  const [environment, cabinet] = await Promise.all([createBackground(), createCabinet()]);
  const reels = createReels();
  cabinet.reelMount.addChild(reels.container);
  const requestedPlacement = new URLSearchParams(location.search).get("title");
  const titlePlacement: TitlePlacement = requestedPlacement === "topper" || requestedPlacement === "belly" ? requestedPlacement : DEFAULT_TITLE_PLACEMENT;
  document.documentElement.dataset.titlePlacement = titlePlacement;
  app.stage.addChild(environment.back, cabinet.machine, environment.front);
  const motion = gsap.timeline({ repeat: -1, yoyo: true })
    .to(".scene-effects__beam--left", { rotation: 8, transformOrigin: "50% 0%", duration: 5, ease: "sine.inOut" }, 0)
    .to(".scene-effects__beam--right", { rotation: -8, transformOrigin: "50% 0%", duration: 6, ease: "sine.inOut" }, 0);
  const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const marqueeScene = createMarquee(marquee, motionQuery.matches);
  const chipsScene = createChips(environment, motionQuery.matches);
  const missingReelTextures = Object.values(SYMBOLS).map(({ frames }) => frames.idle)
    .filter((key) => { const loaded = Assets.get<Texture>(key); return !loaded || loaded === Texture.EMPTY || loaded === Texture.WHITE; });
  (window as Window & { __trustRoyaleDebug?: { reelSymbols: typeof cabinet.reelSymbols; chipPositions: () => number[][]; missingReelTextures: string[] } }).__trustRoyaleDebug = {
    reelSymbols: cabinet.reelSymbols,
    chipPositions: chipsScene.positions,
    missingReelTextures,
  };
  const updateMotion = () => {
    environment.reducedMotion = motionQuery.matches;
    marqueeScene.setReducedMotion(motionQuery.matches);
    chipsScene.setReducedMotion(motionQuery.matches);
    document.querySelectorAll<SVGSVGElement>("svg").forEach((svg) => motionQuery.matches ? svg.pauseAnimations() : svg.unpauseAnimations());
    if (motionQuery.matches) motion.pause(0); else motion.resume();
  };
  motionQuery.addEventListener("change", updateMotion);
  updateMotion();
  if (introDismissed) chipsScene.settle();
  const popups = createPopups((ruleId) => intro.showPrizes(ruleId), () => sound.play("button"));
  prizesButton.addEventListener("click", () => { sound.play("button"); intro.showPrizes(); });
  const machine = new GameStateMachine("IDLE");
  let spinsLeft = 3;
  let best: BestSummary | undefined;
  let deferredAssetsReady = Promise.resolve();
  let pendingSessionWin: WinSummary | null = null;
  let pendingSessionLastChance = false;
  controls.setState(machine.state);
  controls.setProgress(spinsLeft, false);
  machine.subscribe(({ current }) => {
    controls.setState(current);
    controls.setProgress(spinsLeft, current === "LAST_CHANCE" || (current === "SPINNING" && spinsLeft === 0), best?.discount);
  });

  const displayWin = (win: WinSummary) => {
    localStorage.setItem("trustRoyaleWin", JSON.stringify(win));
    best = win;
    controls.setProgress(spinsLeft, false, win.discount);
    popups.showWin(win);
  };

  const playSpin = async () => {
    if (machine.state !== "IDLE" && machine.state !== "LAST_CHANCE") return;
    popups.close();
    marqueeScene.setPattern("spin");
    machine.send({ type: "SPIN" });
    const spinMotion = startFreeSpin(reels, motionQuery.matches);
    document.documentElement.dataset.spinSoundAt = String(performance.now());
    sound.play("reel.loop");
    try {
      const result: SpinResponse = await spin();
      await spinMotion.finish(result.strip, (reel) => sound.play(`reel.stop.${reel}`), result.nearMiss);
      sound.stop("reel.loop");
      sound.play("coin.use");
      await controls.consumeChip();
      machine.send({ type: "RESULT" });
      spinsLeft = result.spinsLeft;
      if (result.best) best = result.best;
      controls.setProgress(spinsLeft, result.isBonus, best?.discount);
      if (result.outcome === "win" && result.ruleId && result.discount && result.winRef) {
        await deferredAssetsReady;
        const rule = PAYTABLE.find(({ id }) => id === result.ruleId);
        if (!rule) throw new Error(`Unknown paytable rule: ${result.ruleId}`);
        await celebrate(reels, rule, motionQuery.matches);
        await new Promise((resolve) => window.setTimeout(resolve, motionQuery.matches ? 540 : 560));
        for (const name of resultSoundNames("win", result.discount, result.nearMiss)) sound.play(name);
        marqueeScene.setPattern("win");
        burstWin(environment.front, motionQuery.matches);
        machine.send({ type: "RESOLVE", outcome: "win", spinsLeft: result.spinsLeft, bonusAvailable: result.bonusAvailable, isBonus: result.isBonus, gameOver: result.gameOver });
        if (result.gameOver && result.best && result.couponCode) {
          const win: WinSummary = { spinId: result.best.spinId, winRef: result.best.winRef, ruleId: result.best.ruleId, discount: result.best.discount, couponCode: result.couponCode, reels: result.reels };
          displayWin(win);
        } else popups.showBanked(result.best?.discount ?? result.discount, result.spinsLeft);
        return;
      }
      const finalBest = result.gameOver && result.best && result.couponCode;
      machine.send({ type: "RESOLVE", outcome: finalBest ? "win" : "retry", spinsLeft: result.spinsLeft, bonusAvailable: result.bonusAvailable, isBonus: result.isBonus, gameOver: result.gameOver });
      if (finalBest) {
        await deferredAssetsReady;
        displayWin({ spinId: result.best!.spinId, winRef: result.best!.winRef, ruleId: result.best!.ruleId, discount: result.best!.discount, couponCode: result.couponCode!, reels: result.reels });
        return;
      }
      marqueeScene.setPattern("idle");
        for (const name of resultSoundNames("retry", result.discount, result.nearMiss)) sound.play(name);
      const resolvedState = machine.state as GameState;
      if (resolvedState === "LAST_CHANCE") { await deferredAssetsReady; popups.showLastChance(playSpin); }
      else if (resolvedState === "GAME_OVER") popups.showGameOver();
      else popups.showRetry(result.nearMiss);
    } catch (caught) {
      spinMotion.cancel();
      sound.stop("reel.loop");
      marqueeScene.setPattern("idle");
      if ((machine.state as GameState) === "SPINNING") machine.send({ type: "NETWORK_ERROR" });
      if (caught instanceof GameApiError && caught.code === "no_spins_left" && caught.state) {
        machine.send({ type: "SERVER_STATE", state: caught.state });
        if (caught.state === "game_over") popups.showGameOver();
      } else popups.showError(caught instanceof GameApiError && caught.code === "rate_limited" ? "rate" : "server");
    }
  };

  controls.onAction(() => {
    sound.play("button");
    void playSpin();
  });

  try {
    const session = initialSession ?? await getSession();
    spinsLeft = session.spinsLeft;
    if (session.best) best = session.best;
    controls.setProgress(spinsLeft, session.state === "last_chance", best?.discount);
    if (session.state !== "idle") {
      if (introDialog.open) { introDialog.close(); document.documentElement.dataset.intro = "closed"; }
      chipsScene.settle();
      machine.send({ type: "SERVER_STATE", state: session.state });
      if ((session.state === "won" || session.state === "claimed") && session.win) pendingSessionWin = session.win;
      else if (session.state === "last_chance") pendingSessionLastChance = true;
      else if (session.state === "game_over") popups.showGameOver();
    }
    if (session.state === "idle" && session.spinsLeft === 3 && !session.best) {
      if (!introDialog.open && !introDismissed) intro.show(() => chipsScene.settle());
    } else chipsScene.settle();
  } catch {
    document.documentElement.dataset.sessionUnavailable = "true";
    if (!introDialog.open && !introDismissed) intro.show(() => chipsScene.settle());
  }

  const updatePointer = (x: number, y: number) => gsap.to(environment.pointer, { x, y, duration: 0.55, ease: "power2.out", overwrite: true });
  addEventListener("pointermove", (event) => updatePointer((event.clientX / innerWidth - 0.5) * 2, (event.clientY / innerHeight - 0.5) * 2), { passive: true });
  let pendingFrame = 0;
  const renderLayout = () => {
    pendingFrame = 0;
    const layout = computeLayout(innerWidth, innerHeight, readSafeAreaInsets(), titlePlacement);
    document.documentElement.dataset.orientation = layout.orientation;
    document.documentElement.style.setProperty("--ui-scale", String(Math.max(0.62, Math.min(1.25, layout.machine.scale))));
    placeElement(marquee, layout.marquee);
    placeElement(tracker, layout.paytable);
    placeElement(spinButton, layout.spinButton);
    drawBackground(environment, layout);
    layoutCabinet(cabinet, layout);
  };
  const scheduleLayout = () => { if (pendingFrame) cancelAnimationFrame(pendingFrame); pendingFrame = requestAnimationFrame(renderLayout); };
  addEventListener("resize", scheduleLayout, { passive: true });
  addEventListener("orientationchange", scheduleLayout, { passive: true });
  app.ticker.add((ticker) => { const time = performance.now() / 1000; chipsScene.tick(time, ticker.deltaMS); animateCabinet(cabinet, time, environment.reducedMotion); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { app.stop(); motion.pause(); marqueeScene.pause(); }
    else { app.start(); marqueeScene.resume(); if (!motionQuery.matches) motion.resume(); }
  });
  renderLayout();
  spinButton.disabled = false;
  spinButton.setAttribute("aria-busy", "false");
  spinButton.removeAttribute("aria-disabled");
  loadingTarget?.removeEventListener("click", rememberLoadingGesture);
  spinTarget?.removeEventListener("click", rememberLoadingGesture);
  loading.remove();
  performance.mark("trust-royale-ready");
  document.documentElement.dataset.ready = "true";
  deferredAssetsReady = new Promise<void>((resolve) => {
    window.setTimeout(() => { void warmDeferredAssets().then(resolve); }, 0);
  });
  void deferredAssetsReady.then(() => {
    const debug = (window as Window & { __trustRoyaleDebug?: { reelSymbols: typeof cabinet.reelSymbols; chipPositions: () => number[][]; missingReelTextures: string[] } }).__trustRoyaleDebug;
    if (debug) debug.missingReelTextures = Object.values(SYMBOLS).map(({ frames }) => frames.idle)
      .filter((key) => { const loaded = Assets.get<Texture>(key); return !loaded || loaded === Texture.EMPTY || loaded === Texture.WHITE; });
    if (pendingSessionWin) displayWin(pendingSessionWin);
    else if (pendingSessionLastChance) popups.showLastChance(playSpin);
  });
}

boot().catch((caught: unknown) => {
  document.documentElement.dataset.error = caught instanceof Error ? caught.message : String(caught);
  const loading = document.querySelector<HTMLElement>("#loading");
  if (loading) loading.textContent = "Unable to prepare game";
  console.error(caught);
});
