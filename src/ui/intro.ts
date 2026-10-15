import { showTerms } from "./terms";
import { PAYTABLE, PRIZE_SYMBOLS, type PaytableRule, type PrizeSymbol } from "../config/paytable";

export interface IntroUi { show(onDone: () => void, startPage?: number): void; showPrizes(winningRuleId?: string): void; }

function ruleChip(colour: "white" | "red" | "navy"): string { return `<span class="welcome__rule-chip" aria-hidden="true"><img src="/assets/fx/chip-${colour}-face.webp" alt=""><img class="tries-tracker__mark" src="/assets/emblem/neos.svg" alt=""></span>`; }

function icon(symbol: PrizeSymbol): string { const item = PRIZE_SYMBOLS[symbol]; return `<img src="${item.src}" alt="${item.label}" loading="eager" decoding="sync">`; }
function prize(rule: PaytableRule): string {
  const label = rule.id === "people-2-plus-1" ? "2 matching faces + 1 other face" : rule.fullLabel;
  return `<li class="welcome-prize" data-rule-id="${rule.id}" aria-label="${rule.ariaLabel}"><span class="welcome-prize__icons">${rule.symbols.map(icon).join("")}</span><span>${label.replaceAll("×", "x")}</span><strong>${rule.discount}% off</strong></li>`;
}

export function createIntro(dialog: HTMLDialogElement, onMenuClick: () => Promise<void>): IntroUi {
  let done = () => {};
  let prizesOnly = false;
  let fromGame = false;
  let winningRuleId: string | undefined;
  let cancelHandover: (() => void) | undefined;
  const click = (): void => { void onMenuClick(); };

  const handover = async (): Promise<void> => {
    cancelHandover?.();
    if (prizesOnly || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const host = dialog.querySelector<HTMLElement>(".welcome__keith")?.getBoundingClientRect();
    const colours = ["white", "red", "navy"] as const;
    const targets = colours.map((colour) => document.querySelector<HTMLElement>(`#tries-tracker [data-chip="${colour}"]`));
    if (!host || !host.width || !host.height || targets.some((target) => !target)) return;
    const flying: HTMLElement[] = [];
    const animations: Animation[] = [];
    const spin = document.querySelector<HTMLButtonElement>("#spin");
    let cleaned = false;
    const cleanup = (): void => {
      if (cleaned) return;
      cleaned = true;
      animations.forEach((animation) => animation.cancel());
      flying.forEach((chip) => chip.remove());
      targets.forEach((target) => target?.style.removeProperty("visibility"));
      spin?.removeEventListener("click", cleanup);
      removeEventListener("resize", cleanup);
      removeEventListener("orientationchange", cleanup);
      if (cancelHandover === cleanup) cancelHandover = undefined;
    };
    cancelHandover = cleanup;
    spin?.addEventListener("click", cleanup);
    addEventListener("resize", cleanup);
    addEventListener("orientationchange", cleanup);
    targets.forEach((target) => { target!.style.visibility = "hidden"; });
    try {
      await Promise.all(colours.map((colour, index) => {
        const target = targets[index]!;
        const destination = target.getBoundingClientRect();
        const chip = document.createElement("span"); chip.className = "welcome__handover-chip"; chip.setAttribute("aria-hidden", "true");
        chip.innerHTML = `<img src="/assets/fx/chip-${colour}-face.webp" alt=""><img class="tries-tracker__mark" src="/assets/emblem/neos.svg" alt="">`;
        chip.style.width = `${destination.width}px`; chip.style.height = `${destination.height}px`;
        const sx = host.left + host.width * (0.38 + index * 0.12), sy = host.top + host.height * .48;
        chip.style.left = `${sx}px`; chip.style.top = `${sy}px`; document.body.appendChild(chip); flying.push(chip);
        const dx = destination.left + destination.width / 2 - sx, dy = destination.top + destination.height / 2 - sy;
        const animation = chip.animate([{ transform: "translate(-50%,-50%) scale(.6)", opacity: 0 }, { transform: "translate(-50%,-65%) scale(1.05)", opacity: 1, offset: .28 }, { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1)`, opacity: 1 }], { duration: 720, delay: index * 90, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" });
        animations.push(animation);
        return animation.finished.catch(() => {}).finally(() => { if (!cleaned) target.style.removeProperty("visibility"); chip.remove(); });
      }));
    } finally { cleanup(); }
  };
  const close = (): void => { void handover(); if (dialog.open) dialog.close(); document.documentElement.dataset.intro = "closed"; done(); };
  const render = (): void => {
    if (prizesOnly) {
      dialog.innerHTML = `<section class="welcome welcome--prizes" aria-labelledby="welcome-title"><div class="welcome__card"><div class="welcome__content"><p class="welcome__eyebrow">Prize table</p><h1 id="welcome-title" tabindex="-1">Every winning line</h1><p>Match any rule below on the centre payline.</p><ol class="welcome-prizes">${PAYTABLE.map(prize).join("")}</ol><div class="welcome__actions"><button type="button" data-back-to-menu>${fromGame ? "Back to game" : "Back to menu"}</button></div></div></div></section>`;
    } else {
      dialog.innerHTML = `<section class="welcome" aria-labelledby="welcome-title"><div class="welcome__card"><img class="welcome__keith" src="/assets/keith/wave.webp" alt="Keith waving"><div class="welcome__content"><h1 id="welcome-title" tabindex="-1">Welcome to Trust Royale</h1><ol class="welcome__rules"><li>${ruleChip("white")}<span>You have 3 lucky chips. Each press of SPIN uses one.</span></li><li>${ruleChip("red")}<span>Line up the middle row to win money off your order.</span></li><li>${ruleChip("navy")}<span>Your best prize counts. Our chief chatters will contact you.</span></li></ol><div class="welcome__prizes"><div><strong>20%</strong><em>OFF</em><span>3 matching faces</span></div><div><strong>15%</strong><em>OFF</em><span>Keith or 2 faces</span></div><div><strong>10%</strong><em>OFF</em><span>3 Neos chips</span></div></div><p class="welcome__agreement">By pressing Let's play! you agree to our <a class="terms-link" href="#terms-dialog" data-show-terms>terms and conditions</a>.</p><div class="welcome__actions"><button type="button" data-play>Let's play!</button><button type="button" class="welcome__more" data-show-prizes>See every winning line</button></div></div></div></section>`;
    }
    if (winningRuleId) dialog.querySelector(`[data-rule-id="${CSS.escape(winningRuleId)}"]`)?.classList.add("is-winning");
    dialog.querySelector<HTMLElement>("[data-show-terms]")?.addEventListener("click", (event) => { event.preventDefault(); showTerms(event.currentTarget as HTMLElement); });
    dialog.querySelector("[data-play]")?.addEventListener("click", () => { click(); close(); });
    dialog.querySelector("[data-show-prizes]")?.addEventListener("click", () => { click(); prizesOnly = true; render(); });
    dialog.querySelector("[data-back-to-menu]")?.addEventListener("click", () => { click(); back(); });
    dialog.querySelector<HTMLElement>("#welcome-title")?.focus();
  };
  const open = (): void => { cancelHandover?.(); document.documentElement.dataset.intro = "open"; dialog.setAttribute("aria-live", "assertive"); dialog.setAttribute("aria-modal", "true"); render(); if (!dialog.open) dialog.showModal(); };
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); if (prizesOnly) back(); });
  // Prizes opened from the machine return straight to it; the welcome menu was already dismissed.
  const back = (): void => { prizesOnly = false; winningRuleId = undefined; if (!fromGame) return render(); fromGame = false; if (dialog.open) dialog.close(); document.documentElement.dataset.intro = "closed"; };
  return { show(onDone) { done = onDone; prizesOnly = false; fromGame = false; winningRuleId = undefined; open(); }, showPrizes(ruleId) { done = () => {}; prizesOnly = true; fromGame = true; winningRuleId = ruleId; open(); } };
}
