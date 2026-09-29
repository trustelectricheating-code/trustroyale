import { PRIZE_CAROUSEL_RULES, PRIZE_SYMBOLS, type PrizeRule, type PrizeSymbol } from "../config/paytable";

const PAYTABLE = PRIZE_CAROUSEL_RULES;

const AUTO_ADVANCE_MS = 3000;
const INTERACTION_PAUSE_MS = 8000;
const MIXED_EXAMPLE_MS = 1000;

function symbolsFor(rule: PrizeRule, exampleIndex: number): readonly PrizeSymbol[] {
  return rule.examples?.[exampleIndex % rule.examples.length] ?? rule.symbols;
}

function iconMarkup(symbol: PrizeSymbol): string {
  const icon = PRIZE_SYMBOLS[symbol];
  const className = symbol === "cherry" || symbol === "seven" ? " prize-symbol--reel" : "";
  return `<img class="prize-symbol${className}" src="${icon.src}" alt="${icon.label}">`;
}

function overlayRow(rule: PrizeRule): string {
  return `<li class="prize-overlay__rule" data-rule-id="${rule.id}" aria-label="${rule.ariaLabel}">
    <span class="prize-overlay__icons">${rule.symbols.map(iconMarkup).join("")}</span>
    <span class="prize-overlay__label">${rule.fullLabel}</span>
    <strong>${rule.prize}% OFF</strong>
  </li>`;
}

export function initPrizeCarousel(root: HTMLElement, dialog: HTMLDialogElement, reducedMotion: MediaQueryList): void {
  const canHover = matchMedia("(hover: hover)");
  let activeIndex = 0;
  let mixedExampleIndex = 0;
  let pauseUntil = 0;
  let hovered = false;

  dialog.innerHTML = `<section class="prize-overlay__panel">
    <button class="prize-overlay__close" type="button" aria-label="Close all prizes">×</button>
    <h2>All prizes</h2>
    <ol class="prize-overlay__list">${PAYTABLE.map(overlayRow).join("")}</ol>
  </section>`;

  const render = (): void => {
    const rule = PAYTABLE[activeIndex];
    const icons = symbolsFor(rule, mixedExampleIndex).map(iconMarkup).join("");
    root.dataset.activeIndex = String(activeIndex);
    root.innerHTML = `<h2 class="prize-carousel__heading">Featured prize</h2>
      <article class="prize-carousel__slide" data-prize-slide aria-label="${rule.ariaLabel}">
        <div class="prize-carousel__icons">${icons}</div>
        <strong class="prize-carousel__value">
          <span class="prize-carousel__value-main">${rule.prize}%</span>
          <span class="prize-carousel__value-off">OFF</span>
        </strong>
        <p class="prize-carousel__label">${rule.fullLabel}</p>
      </article>
      <nav class="prize-carousel__controls" aria-label="Choose featured prize">
        <button type="button" data-direction="-1" aria-label="Previous prize">‹</button>
        <span class="prize-carousel__dots">${PAYTABLE.map((item, index) => `<button type="button" data-index="${index}" aria-label="Show ${item.shortLabel}" aria-current="${index === activeIndex ? "true" : "false"}"></button>`).join("")}</span>
        <button type="button" data-direction="1" aria-label="Next prize">›</button>
      </nav>
      <button class="prize-carousel__all" type="button" aria-controls="prize-overlay" aria-expanded="${dialog.open}">See all prizes</button>`;
  };

  const show = (index: number, userInitiated = false): void => {
    activeIndex = (index + PAYTABLE.length) % PAYTABLE.length;
    mixedExampleIndex = 0;
    if (userInitiated) pauseUntil = performance.now() + INTERACTION_PAUSE_MS;
    render();
  };

  root.addEventListener("click", (event) => {
    const target = (event.target as Element).closest<HTMLButtonElement>("button");
    if (!target) return;
    if (target.classList.contains("prize-carousel__all")) {
      pauseUntil = performance.now() + INTERACTION_PAUSE_MS;
      dialog.showModal();
      target.setAttribute("aria-expanded", "true");
      return;
    }
    const requestedIndex = target.dataset.index;
    if (requestedIndex !== undefined) show(Number(requestedIndex), true);
    const direction = target.dataset.direction;
    if (direction !== undefined) show(activeIndex + Number(direction), true);
  });
  root.addEventListener("pointerenter", () => { hovered = canHover.matches; });
  root.addEventListener("pointerleave", () => { hovered = false; });

  dialog.querySelector(".prize-overlay__close")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => root.querySelector(".prize-carousel__all")?.setAttribute("aria-expanded", "false"));

  window.setInterval(() => {
    if (!reducedMotion.matches && !hovered && !dialog.open && performance.now() >= pauseUntil) show(activeIndex + 1);
  }, AUTO_ADVANCE_MS);
  window.setInterval(() => {
    const examples = PAYTABLE[activeIndex].examples;
    if (!reducedMotion.matches && examples && !hovered && !dialog.open) {
      mixedExampleIndex = (mixedExampleIndex + 1) % examples.length;
      render();
    }
  }, MIXED_EXAMPLE_MS);

  render();
}
