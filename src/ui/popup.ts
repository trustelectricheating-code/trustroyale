import type { WinSummary } from "../game/api";

export interface Popups {
  showWin(win: WinSummary): void;
  showRetry(nearMiss: boolean): void;
  showLastChance(onSpin: () => void): void;
  showGameOver(): void;
  showError(kind: "server" | "rate"): void;
  close(): void;
}

function dialogShell(): HTMLDialogElement {
  const dialog = document.createElement("dialog");
  dialog.id = "result-popup";
  dialog.className = "result-popup";
  dialog.setAttribute("aria-live", "assertive");
  document.body.appendChild(dialog);
  return dialog;
}

export function createPopups(): Popups {
  const dialog = dialogShell();
  const show = (content: string, kind: string, modal = true) => {
    if (dialog.open) dialog.close();
    dialog.className = `result-popup result-popup--${kind}`;
    dialog.innerHTML = content;
    if (modal) dialog.showModal();
    else dialog.show();
  };
  return {
    showWin(win) {
      show(`<section aria-labelledby="result-title">
        <p class="result-popup__eyebrow">Trust Royale winner</p>
        <h2 id="result-title">You've won ${win.discount}% off your order</h2>
        <p>One voucher per order</p>
        <p class="result-popup__reference">Win reference <strong>${win.winRef}</strong></p>
        <div id="claim-options" data-placeholder="claim-options" aria-label="Claim options coming next"></div>
      </section>`, "win");
    },
    showRetry(nearMiss) {
      show(`<section aria-labelledby="result-title"><h2 id="result-title">So close — spin again!</h2>${nearMiss ? "<p>One symbol away — your next spin could be the one.</p>" : ""}<button type="button" data-close-popup>Continue</button></section>`, "retry", false);
      dialog.querySelector("[data-close-popup]")?.addEventListener("click", () => dialog.close(), { once: true });
    },
    showLastChance(onSpin) {
      show(`<section aria-labelledby="result-title"><p class="result-popup__eyebrow">Bonus unlocked</p><h2 id="result-title">Last Chance!</h2><p>Take one bonus spin.</p><button type="button" data-last-chance>Spin now</button></section>`, "last-chance");
      dialog.querySelector("[data-last-chance]")?.addEventListener("click", () => { dialog.close(); onSpin(); }, { once: true });
    },
    showGameOver() {
      show(`<section aria-labelledby="result-title"><h2 id="result-title">Thanks for playing</h2><p>Your Trust Royale game is over for today.</p></section>`, "game-over");
    },
    showError(kind) {
      const text = kind === "rate" ? "Come back tomorrow" : "Machine hiccup, try again";
      show(`<section aria-labelledby="result-title"><h2 id="result-title">${text}</h2><button type="button" data-close-popup>Close</button></section>`, "error", false);
      dialog.querySelector("[data-close-popup]")?.addEventListener("click", () => dialog.close(), { once: true });
    },
    close() { if (dialog.open) dialog.close(); },
  };
}
