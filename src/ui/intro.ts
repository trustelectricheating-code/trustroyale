import { PAYTABLE, PRIZE_SYMBOLS, type PaytableRule, type PrizeSymbol } from "../config/paytable";

export interface IntroUi {
  show(onDone: () => void, startPage?: number): void;
  showPrizes(winningRuleId?: string): void;
}

function icon(symbol: PrizeSymbol): string {
  const item = PRIZE_SYMBOLS[symbol];
  return `<img src="${item.src}" alt="${item.label}">`;
}

function prize(rule: PaytableRule): string {
  return `<li class="intro-prize" data-rule-id="${rule.id}" aria-label="${rule.ariaLabel}">
    <span class="intro-prize__icons">${rule.symbols.map(icon).join("")}</span>
    <span>${rule.fullLabel}</span>
    <strong>${rule.discount}% off</strong>
  </li>`;
}

const PAGES = [
  {
    eyebrow: "Keith welcomes you",
    title: "Welcome to Trust Royale",
    body: "Step up to the machine and play for money off your Trust Electric Heating order.",
  },
  {
    eyebrow: "How to play",
    title: "Three tries. Keep your best prize.",
    body: "Press SPIN for each try. Win on any try and keep spinning. Your best prize counts, up to 20%. If all three miss, Keith unlocks one bonus Last Chance spin. One prize per player.",
  },
  {
    eyebrow: "Prize table",
    title: "Line up the middle row",
    body: "Match any rule below on the centre payline.",
  },
  {
    eyebrow: "How to claim",
    title: "Your code appears at the end",
    body: "When your game ends, copy your coupon code and use it on the offer page to claim your best discount.",
  },
] as const;

export function createIntro(dialog: HTMLDialogElement, onFirstGesture: () => void): IntroUi {
  let page = 0;
  let done = () => {};
  let prizesOnly = false;
  let winningRuleId: string | undefined;
  let gestureHandled = false;

  const firstGesture = (): void => {
    if (gestureHandled) return;
    gestureHandled = true;
    onFirstGesture();
  };

  const close = (): void => {
    if (dialog.open) dialog.close();
    document.documentElement.dataset.intro = "closed";
    done();
  };

  const render = (): void => {
    const item = PAGES[page];
    const prizes = page === 2
      ? `<ol class="intro-prizes">${PAYTABLE.map(prize).join("")}</ol>`
      : "";
    dialog.innerHTML = `<section class="intro__panel" aria-labelledby="intro-title">
      <button class="intro__mute" type="button" data-intro-mute>Sound</button>
      <div class="intro__host" aria-hidden="true"><img src="/assets/mock/keith-medallion.webp" alt=""><span>Keith</span></div>
      <div class="intro__speech">
        <p class="intro__eyebrow">${item.eyebrow}</p>
        <h1 id="intro-title" tabindex="-1">${item.title}</h1>
        <p>${item.body}</p>
        ${prizes}
        <div class="intro__actions">
          ${prizesOnly ? '<button type="button" data-close>Close</button>' : page < PAGES.length - 1 ? '<button type="button" data-next>Next</button><button type="button" class="intro__skip" data-skip>Skip</button>' : '<button type="button" data-play>Let\'s play!</button><button type="button" class="intro__skip" data-skip>Skip</button>'}
        </div>
        ${prizesOnly ? "" : `<p class="intro__progress" aria-label="Page ${page + 1} of ${PAGES.length}">${page + 1} / ${PAGES.length}</p>`}
      </div>
    </section>`;
    if (winningRuleId) dialog.querySelector(`[data-rule-id="${CSS.escape(winningRuleId)}"]`)?.classList.add("is-winning");
    dialog.querySelector("[data-next]")?.addEventListener("click", () => { firstGesture(); page += 1; render(); });
    dialog.querySelector("[data-play]")?.addEventListener("click", () => { firstGesture(); close(); });
    dialog.querySelector("[data-skip]")?.addEventListener("click", () => { firstGesture(); close(); });
    dialog.querySelector("[data-close]")?.addEventListener("click", close);
    const mute = dialog.querySelector<HTMLButtonElement>("[data-intro-mute]");
    const mainMute = document.querySelector<HTMLButtonElement>("#mute");
    if (mute && mainMute) {
      mute.setAttribute("aria-label", mainMute.getAttribute("aria-label") ?? "Mute sound");
      mute.addEventListener("click", () => {
        firstGesture();
        mainMute.click();
        mute.setAttribute("aria-label", mainMute.getAttribute("aria-label") ?? "Mute sound");
      });
    }
    dialog.querySelector<HTMLElement>("#intro-title")?.focus();
  };

  const open = (): void => {
    document.documentElement.dataset.intro = "open";
    render();
    if (!dialog.open) dialog.showModal();
  };

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    if (prizesOnly) close();
  });

  return {
    show(onDone, startPage = 0) {
      done = onDone;
      page = Math.max(0, Math.min(PAGES.length - 1, startPage));
      prizesOnly = false;
      winningRuleId = undefined;
      open();
    },
    showPrizes(ruleId) {
      done = () => {};
      page = 2;
      prizesOnly = true;
      winningRuleId = ruleId;
      open();
    },
  };
}
