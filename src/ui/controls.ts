import type { GameState } from "../game/state";

export interface Controls {
  button: HTMLButtonElement;
  counter: HTMLElement;
  setState(state: GameState): void;
  setSpinsLeft(spins: number): void;
  onAction(listener: () => void): void;
}

export function createControls(button: HTMLButtonElement): Controls {
  const counter = document.createElement("output");
  counter.id = "spins-left";
  counter.className = "spins-left";
  counter.setAttribute("aria-live", "polite");
  button.insertAdjacentElement("beforebegin", counter);
  for (let index = 0; index < 3; index += 1) {
    const marker = document.createElement("span");
    marker.hidden = true;
    marker.dataset.reel = String(index);
    marker.dataset.stopped = "true";
    button.insertAdjacentElement("beforebegin", marker);
  }
  let action = () => {};
  button.addEventListener("click", () => action());
  button.addEventListener("pointerdown", () => { if (!button.disabled) button.dataset.visualState = "down"; });
  button.addEventListener("pointerup", () => { if (!button.disabled) button.dataset.visualState = "up"; });
  button.addEventListener("pointercancel", () => { if (!button.disabled) button.dataset.visualState = "up"; });
  window.addEventListener("keydown", (event) => {
    if ((event.key !== " " && event.key !== "Enter") || button.disabled || event.repeat) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLButtonElement) return;
    event.preventDefault();
    action();
  });

  return {
    button,
    counter,
    setState(state) {
      document.documentElement.dataset.gameState = state.toLowerCase();
      button.disabled = ["SPINNING", "RESOLVING", "WON", "CLAIMED", "GAME_OVER"].includes(state);
      button.textContent = state === "LANDING" ? "PLAY" : state === "LAST_CHANCE" ? "LAST CHANCE" : "SPIN";
      button.dataset.visualState = button.disabled ? "disabled" : "up";
    },
    setSpinsLeft(spins) { counter.textContent = `Spins left: ${spins}`; },
    onAction(listener) { action = listener; },
  };
}
