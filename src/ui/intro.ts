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
  const label = rule.id === "people-2-plus-1" ? "2 matching faces + 1 other face" : rule.fullLabel;
  return `<li class="intro-prize" data-rule-id="${rule.id}" aria-label="${rule.ariaLabel}">
    <span class="intro-prize__icons">${rule.symbols.map(icon).join("")}</span>
    <span>${label}</span>
    <strong>${rule.discount}% off</strong>
  </li>`;
}

const PAGES = [
  {
    eyebrow: "Keith welcomes you",
    title: "Welcome to Trust Royale",
    body: "Step up to the machine and play for money off your Trust Electric Heating order.",
    pose: "/assets/keith/wave.webp",
  },
  {
    eyebrow: "How to play",
    title: "Three tries. Keep your best prize.",
    body: "Press SPIN for each try. Win on any try and keep spinning. Your best prize counts, up to 20%. If all three miss, Keith unlocks one bonus Last Chance spin. One prize per player.",
    pose: "/assets/keith/point.webp",
  },
  {
    eyebrow: "Prize table",
    title: "Line up the middle row",
    body: "Match any rule below on the centre payline.",
    pose: "/assets/keith/prizes.webp",
  },
  {
    eyebrow: "How to claim",
    title: "Your code appears at the end",
    body: "When your game ends, copy your coupon code and use it on the offer page to claim your best discount.",
    pose: "/assets/keith/good-luck.webp",
  },
  {
    eyebrow: "Your lucky chips",
    title: "Here are your 3 lucky chips, one per spin!",
    body: "White, red, then blue. Each press of SPIN uses one chip. Make them count. Good luck!",
    pose: "/assets/keith/chips.webp",
  },
] as const;

export function createIntro(dialog: HTMLDialogElement, onMenuClick: () => Promise<void>): IntroUi {
  let page = 0;
  let done = () => {};
  let prizesOnly = false;
  let winningRuleId: string | undefined;
  const playClick = (): void => { void onMenuClick(); };

  const handover = async (): Promise<void> => {
    if (prizesOnly || page !== PAGES.length - 1) return;
    const host = dialog.querySelector<HTMLElement>(".intro__host img")?.getBoundingClientRect();
    const tray = document.querySelector<HTMLElement>("#tries-tracker")?.getBoundingClientRect();
    if (!host || !tray) return;
    const sources = ["/assets/fx/chip-white-face.webp", "/assets/fx/chip-red-face.webp", "/assets/fx/chip-navy-face.webp"];
    const animations = sources.map((source, index) => {
      const chip = document.createElement("img");
      chip.className = "intro__handover-chip";
      chip.src = source;
      chip.alt = "";
      chip.style.left = `${host.left + host.width * (0.38 + index * 0.12)}px`;
      chip.style.top = `${host.top + host.height * 0.48}px`;
      dialog.appendChild(chip);
      const destinationX = tray.left + tray.width * (0.3 + index * 0.2) - (host.left + host.width * (0.38 + index * 0.12));
      const destinationY = tray.top + tray.height * 0.5 - (host.top + host.height * 0.48);
      const animation = chip.animate([
        { transform: "translate(-50%, -50%) scale(.6)", opacity: 0 },
        { transform: "translate(-50%, -65%) scale(1.05)", opacity: 1, offset: .28 },
        { transform: `translate(calc(-50% + ${destinationX}px), calc(-50% + ${destinationY}px)) scale(.72)`, opacity: 1 },
      ], { duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 140 : 720, delay: index * 90, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
      return animation.finished.finally(() => chip.remove());
    });
    await Promise.all(animations);
  };

  const close = async (): Promise<void> => {
    await handover();
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
      <div class="intro__host" aria-hidden="true"><img src="${item.pose}" alt=""><span>Keith</span></div>
      <div class="intro__speech">
        <p class="intro__eyebrow">${item.eyebrow}</p>
        <h1 id="intro-title" tabindex="-1">${item.title}</h1>
        <p>${item.body}</p>
        ${prizes}
        <div class="intro__actions">
          ${prizesOnly
            ? '<button type="button" data-close>Close</button>'
            : page < PAGES.length - 1
              ? `${page > 0 ? '<button type="button" class="intro__back" data-back>Back</button>' : ""}<button type="button" data-next>Next</button><button type="button" class="intro__skip" data-skip>Skip</button>`
              : '<button type="button" class="intro__back" data-back>Back</button><button type="button" data-play>Let\'s play!</button><button type="button" class="intro__skip" data-skip>Skip</button>'}
        </div>
        ${prizesOnly ? "" : `<p class="intro__progress" aria-label="Page ${page + 1} of ${PAGES.length}">${page + 1} / ${PAGES.length}</p>`}
      </div>
    </section>`;
    if (winningRuleId) dialog.querySelector(`[data-rule-id="${CSS.escape(winningRuleId)}"]`)?.classList.add("is-winning");
    dialog.querySelector("[data-back]")?.addEventListener("click", () => { playClick(); page -= 1; render(); });
    dialog.querySelector("[data-next]")?.addEventListener("click", () => { playClick(); page += 1; render(); });
    dialog.querySelector("[data-play]")?.addEventListener("click", () => { playClick(); void close(); });
    dialog.querySelector("[data-skip]")?.addEventListener("click", () => { playClick(); void close(); });
    dialog.querySelector("[data-close]")?.addEventListener("click", () => { playClick(); void close(); });
    const mute = dialog.querySelector<HTMLButtonElement>("[data-intro-mute]");
    const mainMute = document.querySelector<HTMLButtonElement>("#mute");
    if (mute && mainMute) {
      mute.setAttribute("aria-label", mainMute.getAttribute("aria-label") ?? "Mute sound");
      mute.addEventListener("click", async () => {
        await onMenuClick();
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
    if (prizesOnly) void close();
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
