import { showTerms } from "./terms";
import type { WinSummary } from "../game/api";

export interface Popups {
  message: HTMLElement;
  showWin(win: WinSummary): void;
  showRetry(nearMiss: boolean): void;
  showBanked(discount: number, spinsLeft: number): void;
  showLastChance(): void;
  showGameOver(): void;
  showError(kind: "server" | "rate"): void;
  close(): void;
}

function dialogShell(): HTMLDialogElement {
  const dialog = document.createElement("dialog");
  dialog.id = "result-popup";
  dialog.className = "result-popup";
  dialog.setAttribute("aria-live", "assertive");
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])'))
      .filter((node) => !node.hasAttribute("disabled"));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  document.body.appendChild(dialog);
  return dialog;
}

export function createPopups(onViewPrizes: (ruleId?: string) => void, onButtonClick: () => void): Popups {
  const dialog = dialogShell();
  const message = document.createElement("div");
  message.id = "spin-message";
  message.className = "spin-message";
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");
  message.setAttribute("aria-atomic", "true");
  document.body.appendChild(message);
  let fadeTimer = 0;
  let clearTimer = 0;
  const hideMessage = (): void => {
    window.clearTimeout(fadeTimer);
    window.clearTimeout(clearTimer);
    message.classList.remove("is-visible", "is-fading");
    message.replaceChildren();
  };
  const showMessage = (text: string, detail?: string): void => {
    hideMessage();
    message.innerHTML = `<p>${text}</p>${detail ? `<p>${detail}</p>` : ""}`;
    message.classList.add("is-visible");
    fadeTimer = window.setTimeout(() => {
      message.classList.remove("is-visible");
      message.classList.add("is-fading");
      clearTimer = window.setTimeout(hideMessage, 250);
    }, 3_000);
  };
  dialog.addEventListener("click", (event) => {
    if ((event.target as Element).closest("button")) onButtonClick();
  });
  const show = (content: string, kind: string, modal = true) => {
    hideMessage();
    if (dialog.open) dialog.close();
    dialog.className = `result-popup result-popup--${kind}`;
    dialog.setAttribute("aria-modal", String(modal));
    dialog.innerHTML = content;
    if (modal) dialog.showModal(); else dialog.show();
    const title = dialog.querySelector<HTMLElement>("#result-title");
    title?.setAttribute("tabindex", "-1");
    title?.focus();
  };

  return {
    message,
    showWin(win) {
      const fireworks = Array.from({ length: 7 }, (_, burst) =>
        `<div class="result-popup__firework" style="left:${[18, 82, 50, 12, 88, 30, 70][burst]}%;top:${[16, 12, 8, 48, 44, 26, 30][burst]}%">${Array.from({ length: 18 }, (_, particle) =>
          `<i style="--a:${particle * 20}deg;--r:${60 + (particle % 3) * 25}px;--d:${[0, 1, 1.3, .7][burst % 4]}s;--c:${["#ffd54a", "#ff445c", "#fff4ba", "#59d7ff", "#ff9f2f"][particle % 5]}"></i>`).join("")}</div>`).join("");
      show(`<div class="result-popup__fx" aria-hidden="true"><div class="result-popup__beam"></div><div class="result-popup__confetti"></div><img class="result-popup__coin result-popup__coin--left" src="/assets/fx/coin.webp" alt=""><img class="result-popup__coin result-popup__coin--right" src="/assets/fx/coin.webp" alt="">${fireworks}</div><section aria-labelledby="result-title"><p class="result-popup__eyebrow">Congratulations, you won</p><div class="result-popup__board"><img src="/assets/keith/prizes.webp" alt=""><h2 id="result-title" class="result-popup__discount" aria-label="${win.discount}% off your order">${win.discount}%<span>OFF</span></h2></div><p class="result-popup__instruction">You have won ${win.discount}% off your order, our chief chatters will be contacting you shortly with the next steps</p><button type="button" class="result-popup__view-prizes" data-view-prizes>View prize table</button><a class="terms-link result-popup__terms" href="#terms-dialog" data-show-terms>Terms and conditions</a></section>`, "win");
      dialog.querySelector<HTMLElement>("[data-show-terms]")?.addEventListener("click", (event) => { event.preventDefault(); showTerms(event.currentTarget as HTMLElement); });
      dialog.querySelector<HTMLButtonElement>("[data-view-prizes]")?.addEventListener("click", () => {
        dialog.close();
        onViewPrizes(win.ruleId);
      });
    },
    showRetry(nearMiss) {
      showMessage("So close! Spin again.", nearMiss ? "One symbol away." : undefined);
    },
    showBanked(discount, spinsLeft) {
      showMessage(`You've banked ${discount}% off! ${spinsLeft} ${spinsLeft === 1 ? "spin" : "spins"} left.`);
    },
    showLastChance() {
      showMessage("Last Chance!", "Take one final spin.");
    },
    showGameOver() {
      show('<section aria-labelledby="result-title"><h2 id="result-title">Thanks for playing</h2><p>Your game is complete for today.</p></section>', "game-over");
    },
    showError(kind) {
      const text = kind === "rate" ? "Daily play limit reached" : "Machine hiccup, try again";
      show(`<section aria-labelledby="result-title"><h2 id="result-title">${text}</h2><button type="button" data-close-popup>Close</button></section>`, "error", false);
      dialog.querySelector("[data-close-popup]")?.addEventListener("click", () => dialog.close(), { once: true });
    },
    close() {
      hideMessage();
      if (dialog.open) dialog.close();
    },
  };
}
