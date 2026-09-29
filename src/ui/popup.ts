import type { WinSummary } from "../game/api";

export interface Popups {
  showWin(win: WinSummary): void;
  showRetry(nearMiss: boolean): void;
  showBanked(discount: number, spinsLeft: number): void;
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
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])'))
      .filter((node) => !node.hasAttribute("disabled"));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.body.appendChild(dialog);
  return dialog;
}

export function createPopups(onViewPrizes: (ruleId?: string) => void, onButtonClick: () => void): Popups {
  const dialog = dialogShell();
  dialog.addEventListener("click", (event) => {
    if ((event.target as Element).closest("button")) onButtonClick();
  });
  const show = (content: string, kind: string, modal = true) => {
    if (dialog.open) dialog.close();
    dialog.className = `result-popup result-popup--${kind}`;
    dialog.setAttribute("aria-modal", String(modal));
    dialog.innerHTML = content;
    if (modal) dialog.showModal();
    else dialog.show();
    const title = dialog.querySelector<HTMLElement>("#result-title");
    title?.setAttribute("tabindex", "-1");
    title?.focus();
  };
  return {
    showWin(win) {
      const neosSymbols = win.ruleId === "neos-3"
        ? '<div class="result-popup__symbols" aria-label="Three Neos chips"><img src="/assets/symbols/neos-chip-red.webp" alt=""><img src="/assets/symbols/neos-chip-red.webp" alt=""><img src="/assets/symbols/neos-chip-red.webp" alt=""></div>'
        : "";
      show(`<section aria-labelledby="result-title">
        <img class="result-popup__keith" src="/assets/keith/celebrate.webp" alt="Keith celebrating">
        <p class="result-popup__eyebrow">Trust Royale winner</p>
        <h2 id="result-title">You've won ${win.discount}% off your order</h2>
        ${neosSymbols}
        <p>One voucher per order</p>
        <div class="coupon-ticket">
          <span>Your code:</span>
          <code class="coupon-ticket__code" tabindex="0"></code>
          <button type="button" data-copy-code>Copy code</button>
          <output class="coupon-ticket__status" aria-live="polite"></output>
        </div>
        <p class="result-popup__instruction">Use this code on our offer page to claim your discount.</p>
        <p class="result-popup__reference">Win reference <strong>${win.winRef}</strong></p>
        <button type="button" data-view-prizes>View prize table</button>
      </section>`, "win");
      const code = dialog.querySelector<HTMLElement>(".coupon-ticket__code")!;
      code.textContent = win.couponCode;
      const status = dialog.querySelector<HTMLOutputElement>(".coupon-ticket__status")!;
      dialog.querySelector<HTMLButtonElement>("[data-copy-code]")?.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(win.couponCode);
          status.textContent = "Copied!";
        } catch {
          const range = document.createRange();
          range.selectNodeContents(code);
          const selection = getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          code.focus();
          status.textContent = "Code selected — copy it.";
        }
      });
      dialog.querySelector<HTMLButtonElement>("[data-view-prizes]")?.addEventListener("click", () => {
        dialog.close();
        onViewPrizes(win.ruleId);
      });
    },
    showRetry(nearMiss) {
      show(`<section aria-labelledby="result-title"><h2 id="result-title">So close — spin again!</h2>${nearMiss ? "<p>One symbol away — your next spin could be the one.</p>" : ""}<button type="button" data-close-popup>Continue</button></section>`, "retry", false);
      dialog.querySelector("[data-close-popup]")?.addEventListener("click", () => dialog.close(), { once: true });
    },
    showBanked(discount, spinsLeft) {
      show(`<section aria-labelledby="result-title"><h2 id="result-title">${discount}% banked!</h2><p>${spinsLeft} ${spinsLeft === 1 ? "try" : "tries"} left to reach 20%.</p><button type="button" data-close-popup>Continue</button></section>`, "retry", false);
      dialog.querySelector("[data-close-popup]")?.addEventListener("click", () => dialog.close(), { once: true });
    },
    showLastChance(onSpin) {
      show(`<section aria-labelledby="result-title"><p class="result-popup__eyebrow">Bonus unlocked</p><h2 id="result-title">Last Chance!</h2><p>Take one bonus spin.</p><button type="button" data-last-chance>Spin now</button></section>`, "last-chance", false);
      dialog.querySelector("section")?.insertAdjacentHTML("afterbegin", '<img class="result-popup__keith result-popup__keith--small" src="/assets/keith/last-chance.webp" alt="Keith presents a gold Last Chance chip"><img class="result-popup__gold-chip" src="/assets/fx/chip-gold-face.webp" alt="Gold Last Chance chip">');
      dialog.querySelector("[data-last-chance]")?.addEventListener("click", () => { dialog.close(); onSpin(); }, { once: true });
    },
    showGameOver() {
      show(`<section aria-labelledby="result-title"><h2 id="result-title">Thanks for playing</h2><p>Your Trust Royale game is over for today.</p></section>`, "game-over", false);
    },
    showError(kind) {
      const text = kind === "rate" ? "Come back tomorrow" : "Machine hiccup, try again";
      show(`<section aria-labelledby="result-title"><h2 id="result-title">${text}</h2><button type="button" data-close-popup>Close</button></section>`, "error", false);
      dialog.querySelector("[data-close-popup]")?.addEventListener("click", () => dialog.close(), { once: true });
    },
    close() { if (dialog.open) dialog.close(); },
  };
}
