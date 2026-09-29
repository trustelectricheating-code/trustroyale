import type { GameState } from "../game/state";
import { initPrizeCarousel } from "./prizeCarousel";

export interface PaytableUi {
  setState(state: GameState, winningRuleId?: string): void;
}

export function createPaytable(root: HTMLElement, dialog: HTMLDialogElement, reducedMotion: MediaQueryList): PaytableUi {
  initPrizeCarousel(root, dialog, reducedMotion);

  const clear = (): void => {
    root.removeAttribute("data-winning-rule-id");
    dialog.querySelectorAll(".prize-overlay__rule.is-winning").forEach((row) => row.classList.remove("is-winning"));
  };

  return {
    setState(state, winningRuleId) {
      clear();
      if (state !== "WON" || !winningRuleId) return;
      root.dataset.winningRuleId = winningRuleId;
      dialog.querySelector(`[data-rule-id="${CSS.escape(winningRuleId)}"]`)?.classList.add("is-winning");
    },
  };
}
