import { Application } from "pixi.js";
import "pixi.js/unsafe-eval";
import { gsap } from "gsap";
import "./styles/main.css";
import { loadInitialAssets } from "./assets";
import { GameApiError, getSession, spin, type SpinResponse, type WinSummary } from "./game/api";
import { GameStateMachine, type GameState } from "./game/state";
import { PAYTABLE } from "./config/paytable";
import { createBackground, drawBackground } from "./scene/background";
import { animateCabinet, createCabinet, layoutCabinet } from "./scene/cabinet";
import { DEFAULT_TITLE_PLACEMENT, type TitlePlacement } from "./scene/cabinetArt";
import { celebrate } from "./scene/faces";
import { burstWin, createChips } from "./scene/chips";
import { createMarquee } from "./scene/marquee";
import { computeLayout, type LayoutRect, type SafeAreaInsets } from "./scene/layout";
import { animateSpin, createReels } from "./scene/reels";
import { createSound } from "./audio/sound";
import { createControls } from "./ui/controls";
import { createPopups } from "./ui/popup";
import { createPaytable } from "./ui/paytable";

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

async function boot(): Promise<void> {
  const host = document.querySelector<HTMLDivElement>("#canvas-host");
  const marquee = document.querySelector<HTMLElement>("#marquee");
  const paytable = document.querySelector<HTMLElement>("#paytable");
  const prizeOverlay = document.querySelector<HTMLDialogElement>("#prize-overlay");
  const spinButton = document.querySelector<HTMLButtonElement>("#spin");
  const loading = document.querySelector<HTMLElement>("#loading");
  if (!host || !marquee || !paytable || !prizeOverlay || !spinButton || !loading) throw new Error("Game shell is incomplete");

  await loadInitialAssets();
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
  const sound = createSound();
  (window as Window & { __trustRoyaleDebug?: { reelSymbols: typeof cabinet.reelSymbols; chipPositions: () => number[][] } }).__trustRoyaleDebug = {
    reelSymbols: cabinet.reelSymbols,
    chipPositions: chipsScene.positions,
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
  const paytableUi = createPaytable(paytable, prizeOverlay, motionQuery);

  const controls = createControls(spinButton, sound.isMuted());
  controls.onMute((muted) => sound.setMuted(muted));
  const popups = createPopups();
  const machine = new GameStateMachine();
  let spinsLeft = 3;
  controls.setState(machine.state);
  controls.setSpinsLeft(spinsLeft);
  machine.subscribe(({ current }) => {
    controls.setState(current);
    if (current !== "WON") paytableUi.setState(current);
  });

  const displayWin = (win: WinSummary) => {
    localStorage.setItem("trustRoyaleWin", JSON.stringify(win));
    paytableUi.setState("WON", win.ruleId);
    popups.showWin(win);
  };

  const playSpin = async () => {
    if (machine.state !== "IDLE" && machine.state !== "LAST_CHANCE") return;
    popups.close();
    sound.play("button");
    sound.play("reel.loop");
    marqueeScene.setPattern("spin");
    machine.send({ type: "SPIN" });
    try {
      const result: SpinResponse = await spin();
      await animateSpin(reels, result.strip, motionQuery.matches, (reel) => sound.play(`reel.stop.${reel}`), result.nearMiss);
      sound.stop("reel.loop");
      machine.send({ type: "RESULT" });
      spinsLeft = result.spinsLeft;
      controls.setSpinsLeft(spinsLeft);
      if (result.outcome === "win" && result.ruleId && result.discount && result.winRef) {
        const rule = PAYTABLE.find(({ id }) => id === result.ruleId);
        if (!rule) throw new Error(`Unknown paytable rule: ${result.ruleId}`);
        await celebrate(reels, rule, motionQuery.matches);
        await new Promise((resolve) => window.setTimeout(resolve, motionQuery.matches ? 540 : 560));
        sound.play(result.discount === 20 ? "win.big" : "win.small");
        sound.play("payout");
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
        displayWin({ spinId: result.best!.spinId, winRef: result.best!.winRef, ruleId: result.best!.ruleId, discount: result.best!.discount, couponCode: result.couponCode!, reels: result.reels });
        return;
      }
      marqueeScene.setPattern("idle");
      if (result.nearMiss) sound.play("nearmiss");
      const resolvedState = machine.state as GameState;
      if (resolvedState === "LAST_CHANCE") popups.showLastChance(playSpin);
      else if (resolvedState === "GAME_OVER") popups.showGameOver();
      else popups.showRetry(result.nearMiss);
    } catch (caught) {
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
    if (machine.state === "LANDING") {
      void sound.unlock();
      sound.ambient.start();
      sound.play("button");
      sound.play("chips");
      sound.play("whoosh");
      chipsScene.settle();
      machine.send({ type: "PLAY" });
      spinButton.setAttribute("aria-label", "Spin the reels");
      return;
    }
    void playSpin();
  });

  try {
    const session = await getSession();
    spinsLeft = session.spinsLeft;
    controls.setSpinsLeft(spinsLeft);
    if (session.state !== "idle") {
      chipsScene.settle();
      machine.send({ type: "SERVER_STATE", state: session.state });
      if ((session.state === "won" || session.state === "claimed") && session.win) displayWin(session.win);
      else if (session.state === "last_chance") popups.showLastChance(playSpin);
      else if (session.state === "game_over") popups.showGameOver();
    }
  } catch {
    document.documentElement.dataset.sessionUnavailable = "true";
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
    placeElement(paytable, layout.paytable);
    paytable.style.setProperty("--prize-icon-size", `${layout.paytable.iconSize}px`);
    paytable.style.setProperty("--prize-value-size", `${layout.paytable.prizeSize}px`);
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
  loading.remove();
  document.documentElement.dataset.ready = "true";
}

boot().catch((caught: unknown) => {
  document.documentElement.dataset.error = caught instanceof Error ? caught.message : String(caught);
  const loading = document.querySelector<HTMLElement>("#loading");
  if (loading) loading.textContent = "Unable to prepare game";
  console.error(caught);
});
