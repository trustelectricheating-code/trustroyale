import type { GameState } from "../game/state";

export interface Controls {
  button: HTMLButtonElement;
  tracker: HTMLElement;
  setState(state: GameState): void;
  setProgress(spinsLeft: number, lastChance: boolean, bestDiscount?: number): void;
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
      const used = Math.max(0, 3 - spinsLeft);
      const current = lastChance ? 3 : Math.min(2, used);
      tracker.innerHTML = `<p class="tries-tracker__title">Your tries</p>
        <ol>${["Try 1", "Try 2", "Try 3", "Last Chance"].map((name, index) => `<li class="${index < used || (index === 3 && lastChance) ? "is-used" : ""} ${index === current ? "is-current" : ""}"><span aria-hidden="true"></span>${name}</li>`).join("")}</ol>
        <output aria-live="polite">Best: ${bestDiscount ? `${bestDiscount}%` : "—"}</output>`;
    },
    onAction(listener) { action = listener; },
    onMute(listener) { muteAction = listener; },
    setMuted(value) { muted = value; renderMute(); },
  };
}
