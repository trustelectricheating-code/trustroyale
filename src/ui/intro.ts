import { showTerms } from "./terms";
import { PAYTABLE, PRIZE_SYMBOLS, type PaytableRule, type PrizeSymbol } from "../config/paytable";

export interface IntroUi { show(onDone: () => void, startPage?: number): void; showPrizes(winningRuleId?: string): void; }

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
  const click = (): void => { void onMenuClick(); };

  const handover = async (): Promise<void> => {
    if (prizesOnly || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const host = dialog.querySelector<HTMLElement>(".welcome__keith")?.getBoundingClientRect();
    const tray = document.querySelector<HTMLElement>("#tries-tracker")?.getBoundingClientRect();
    if (!host || !tray) return;
    const sources = ["/assets/fx/chip-white-face.webp", "/assets/fx/chip-red-face.webp", "/assets/fx/chip-navy-face.webp"];
    await Promise.all(sources.map((source, index) => {
      const chip = document.createElement("img"); chip.className = "welcome__handover-chip"; chip.src = source; chip.alt = "";
      const sx = host.left + host.width * (0.38 + index * 0.12), sy = host.top + host.height * .48;
      chip.style.left = `${sx}px`; chip.style.top = `${sy}px`; document.body.appendChild(chip);
      const dx = tray.left + tray.width * (.3 + index * .2) - sx, dy = tray.top + tray.height * .5 - sy;
      const animation = chip.animate([{ transform: "translate(-50%,-50%) scale(.6)", opacity: 0 }, { transform: "translate(-50%,-65%) scale(1.05)", opacity: 1, offset: .28 }, { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.72)`, opacity: 1 }], { duration: 720, delay: index * 90, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
      return animation.finished.finally(() => chip.remove());
    }));
  };
  const close = (): void => { void handover(); if (dialog.open) dialog.close(); document.documentElement.dataset.intro = "closed"; done(); };
  const render = (): void => {
    if (prizesOnly) {
      dialog.innerHTML = `<section class="welcome welcome--prizes" aria-labelledby="welcome-title"><div class="welcome__card"><div class="welcome__content"><p class="welcome__eyebrow">Prize table</p><h1 id="welcome-title" tabindex="-1">Every winning line</h1><p>Match any rule below on the centre payline.</p><ol class="welcome-prizes">${PAYTABLE.map(prize).join("")}</ol><div class="welcome__actions"><button type="button" data-back-to-menu>${fromGame ? "Back to game" : "Back to menu"}</button></div></div></div></section>`;
    } else {
      dialog.innerHTML = `<section class="welcome" aria-labelledby="welcome-title"><div class="welcome__card"><img class="welcome__keith" src="/assets/keith/wave.webp" alt="Keith waving"><div class="welcome__content"><button class="welcome__sound" type="button" data-intro-mute>Sound</button><h1 id="welcome-title" tabindex="-1">Welcome to Trust Royale</h1><ol class="welcome__rules"><li><img src="/assets/fx/chip-white-face.webp" alt=""><span>You have 3 lucky chips. Each press of SPIN uses one.</span></li><li><img src="/assets/symbols/neos-chip-red.webp" alt=""><span>Line up the middle row to win money off your order.</span></li><li><img src="/assets/fx/chip-gold-face.webp" alt=""><span>Your best prize counts. Our chief chatters will contact you.</span></li></ol><div class="welcome__prizes"><div><strong>20%</strong><em>OFF</em><span>3 matching faces</span></div><div><strong>15%</strong><em>OFF</em><span>Keith or 2 faces</span></div><div><strong>10%</strong><em>OFF</em><span>3 Neos chips</span></div></div><p class="welcome__agreement">By pressing Let's play! you agree to our <a class="terms-link" href="#terms-dialog" data-show-terms>terms and conditions</a>.</p><div class="welcome__actions"><button type="button" data-play>Let's play!</button><button type="button" class="welcome__more" data-show-prizes>See every winning line</button></div></div></div></section>`;
    }
    if (winningRuleId) dialog.querySelector(`[data-rule-id="${CSS.escape(winningRuleId)}"]`)?.classList.add("is-winning");
    dialog.querySelector<HTMLElement>("[data-show-terms]")?.addEventListener("click", (event) => { event.preventDefault(); showTerms(event.currentTarget as HTMLElement); });
    dialog.querySelector("[data-play]")?.addEventListener("click", () => { click(); close(); });
    dialog.querySelector("[data-show-prizes]")?.addEventListener("click", () => { click(); prizesOnly = true; render(); });
    dialog.querySelector("[data-back-to-menu]")?.addEventListener("click", () => { click(); back(); });
    const mute = dialog.querySelector<HTMLButtonElement>("[data-intro-mute]"), mainMute = document.querySelector<HTMLButtonElement>("#mute");
    if (mute && mainMute) { mute.setAttribute("aria-label", mainMute.getAttribute("aria-label") ?? "Mute sound"); mute.addEventListener("click", async () => { await onMenuClick(); mainMute.click(); mute.setAttribute("aria-label", mainMute.getAttribute("aria-label") ?? "Mute sound"); }); }
    dialog.querySelector<HTMLElement>("#welcome-title")?.focus();
  };
  const open = (): void => { document.documentElement.dataset.intro = "open"; dialog.setAttribute("aria-live", "assertive"); dialog.setAttribute("aria-modal", "true"); render(); if (!dialog.open) dialog.showModal(); };
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); if (prizesOnly) back(); });
  // Prizes opened from the machine return straight to it; the welcome menu was already dismissed.
  const back = (): void => { prizesOnly = false; winningRuleId = undefined; if (!fromGame) return render(); fromGame = false; if (dialog.open) dialog.close(); document.documentElement.dataset.intro = "closed"; };
  return { show(onDone) { done = onDone; prizesOnly = false; fromGame = false; winningRuleId = undefined; open(); }, showPrizes(ruleId) { done = () => {}; prizesOnly = true; fromGame = true; winningRuleId = ruleId; open(); } };
}
