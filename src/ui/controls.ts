import type { GameState } from "../game/state";

export interface Controls {
  button: HTMLButtonElement;
  tracker: HTMLElement;
  setState(state: GameState): void;
  setProgress(spinsLeft: number, lastChance: boolean, bestDiscount?: number): void;
  consumeChip(): Promise<void>;
  onAction(listener: () => void): void;
  onMute(listener: (muted: boolean) => void): void;
  setMuted(muted: boolean): void;
}

export function createControls(button: HTMLButtonElement, initialMuted = false): Controls {
  const label = document.createElement("span");
  label.className = "spin__label";
  button.replaceChildren(label);
  const tracker = document.querySelector<HTMLElement>("#tries-tracker");
  if (!tracker) throw new Error("Tries tracker is missing");
  for (let index = 0; index < 3; index += 1) {
    const marker = document.createElement("span");
    marker.hidden = true;
    marker.dataset.reel = String(index);
    marker.dataset.stopped = "true";
    button.insertAdjacentElement("beforebegin", marker);
  }
  let action = () => {};
  let muteAction = (_muted: boolean) => {};
  let muted = initialMuted;
  const muteButton = document.createElement("button");
  muteButton.id = "mute";
  muteButton.className = "mute";
  muteButton.type = "button";
  button.parentElement?.appendChild(muteButton);
  const renderMute = (): void => {
    muteButton.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
    muteButton.style.backgroundImage = `url("/assets/ui/mute-${muted ? "off" : "on"}.svg")`;
  };
  muteButton.addEventListener("click", () => { muted = !muted; renderMute(); muteAction(muted); });
  renderMute();
  button.addEventListener("click", () => action());
  button.addEventListener("pointerdown", () => { if (!button.disabled) button.dataset.visualState = "down"; });
  button.addEventListener("pointerup", () => { if (!button.disabled) button.dataset.visualState = "up"; });
  button.addEventListener("pointercancel", () => { if (!button.disabled) button.dataset.visualState = "up"; });
  return {
    button,
    tracker,
    setState(state) {
      document.documentElement.dataset.gameState = state.toLowerCase();
      button.disabled = ["SPINNING", "RESOLVING", "WON", "CLAIMED", "GAME_OVER"].includes(state);
      label.textContent = state === "LAST_CHANCE" ? "LAST CHANCE" : "SPIN";
      button.dataset.visualState = button.disabled ? "disabled" : "up";
    },
    setProgress(spinsLeft, lastChance, bestDiscount) {
      const chips = lastChance
        ? [{ name: "gold", src: "/assets/fx/chip-gold-face.webp" }]
        : [
            { name: "white", src: "/assets/fx/chip-white-face.webp" },
            { name: "red", src: "/assets/fx/chip-red-face.webp" },
            { name: "navy", src: "/assets/fx/chip-navy-face.webp" },
          ].slice(3 - spinsLeft);
      tracker.setAttribute("aria-label", lastChance ? "1 Last Chance chip left" : `${spinsLeft} ${spinsLeft === 1 ? "chip" : "chips"} left`);
      tracker.innerHTML = `<p class="tries-tracker__title">Lucky chips</p>
        <div class="tries-tracker__chips" aria-hidden="true">${chips.map(({ name, src }, index) => `<span class="tries-tracker__chip ${index === 0 && document.documentElement.dataset.gameState === "spinning" ? "is-playing" : ""}" data-chip="${name}"><img src="${src}" alt=""><img class="tries-tracker__mark" src="/assets/emblem/neos.svg" alt=""></span>`).join("") || '<span class="tries-tracker__empty">No chips left</span>'}</div>
        <output aria-live="polite">Best: ${bestDiscount ? `${bestDiscount}%` : "None"}</output>`;
    },
    async consumeChip() {
      const chip = tracker.querySelector<HTMLElement>(".tries-tracker__chip.is-playing, .tries-tracker__chip");
      if (!chip) return;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      await chip.animate([
        { transform: "translateY(-10%) scale(1)", opacity: 1, filter: "drop-shadow(0 0 12px #ffd75e)" },
        { transform: "translateY(-18%) rotate(160deg) scale(.72)", opacity: .75, filter: "drop-shadow(0 0 22px #fff1a2)" },
        { transform: "translateY(-22%) rotate(360deg) scale(.08)", opacity: 0, filter: "drop-shadow(0 0 30px #ffca37)" },
      ], { duration: reduced ? 120 : 520, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }).finished;
    },
    onAction(listener) { action = listener; },
    onMute(listener) { muteAction = listener; },
    setMuted(value) { muted = value; renderMute(); },
  };
}
