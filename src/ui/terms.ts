let dialog: HTMLDialogElement | undefined;
let opener: HTMLElement | undefined;

export function showTerms(link: HTMLElement): void {
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "terms-dialog";
    dialog.className = "terms-dialog";
    dialog.setAttribute("aria-labelledby", "terms-title");
    dialog.setAttribute("aria-modal", "true");
    dialog.innerHTML = `<header class="terms-dialog__header"><h2 id="terms-title" tabindex="-1">Terms and conditions</h2><button type="button" data-close-terms>Close</button></header>
      <ol class="terms-dialog__list">
        <li>Trust Royale is a promotional game run by Trust Electric Heating.</li>
        <li>Each game gives you 3 spins. Every completed game wins a discount, and only your best prize counts.</li>
        <li>Win probability. Each game's prize is picked at random by our system, and how or when you press SPIN does not change it:
          <ul><li>20% off: 1 in 10 games (10%)</li><li>15% off: 5 in 10 games (50%)</li><li>10% off: 4 in 10 games (40%)</li></ul>
        </li>
        <li>The discount applies to NEOS radiators only. It does not apply to delivery or installation.</li>
        <li>The Ocean range, and any other range of products, are not included in this offer.</li>
        <li>After you win, our chief chatters will contact you with the next steps to use your discount.</li>
      </ol>`;
    dialog.querySelector("[data-close-terms]")?.addEventListener("click", () => dialog?.close());
    dialog.addEventListener("close", () => opener?.focus());
    document.body.appendChild(dialog);
  }
  opener = link;
  dialog.showModal();
  dialog.scrollTop = 0;
  dialog.querySelector<HTMLElement>("#terms-title")?.focus({ preventScroll: true });
}
