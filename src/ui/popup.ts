import { showTerms } from "./terms";
import { ClaimError, claimLead, sendEntry, type WinSummary } from "../game/api";
import { quoteUrl } from "../game/handoff";
import { clearEntry, completeEntry, firstWord, readEntry, saveEntry } from "../game/entry";
import { CONSENT_TEXT, GATE_CONSENT_TEXT, REGIONS, hasVisibleFieldErrors, validateLead, type LeadField, type LeadFieldErrors } from "../game/leadValidation";

const PRIVACY_URL = "https://www.trustelectricheating.co.uk/privacy-policy";
const FREEPHONE = "0800 5999 109";
const CLAIM_FIELDS: Array<{ name: LeadField; label: string; autocomplete: string; type: string; inputmode?: string }> = [
  { name: "fullName", label: "Full name", autocomplete: "name", type: "text" },
  { name: "phone", label: "Phone number", autocomplete: "tel", type: "tel", inputmode: "tel" },
  { name: "region", label: "Region", autocomplete: "address-level1", type: "select" },
  { name: "email", label: "Email", autocomplete: "email", type: "email", inputmode: "email" },
];
type Draft = Record<LeadField, string>;
const emptyDraft = (): Draft => ({ fullName: "", phone: "", region: "", email: "" });

export interface Popups {
  message: HTMLElement;
  showGate(proceed: () => void): void;
  showWin(win: WinSummary): void;
  showClaimed(win: WinSummary): void;
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
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, a[href], input:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'))
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
  // Non-blocking spin results (Ananthu, 918f6df "Keep spins flowing"): a short status line above the reels.
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

  // Changes the step inside the open dialog, so the focus trap and Escape keep working.
  const swap = (content: string, kind: string) => {
    if (!dialog.open) return show(content, kind);
    dialog.className = `result-popup result-popup--${kind}`;
    dialog.innerHTML = content;
    dialog.scrollTop = 0;
    const title = dialog.querySelector<HTMLElement>("#result-title");
    title?.setAttribute("tabindex", "-1");
    title?.focus();
  };
  const draft = emptyDraft();

  const fieldsMarkup = (optionalContact = false): string => CLAIM_FIELDS.map(({ name, label, autocomplete, type, inputmode }) => {
    const control = type === "select"
      ? `<select id="claim-${name}" name="${name}" autocomplete="${autocomplete}" aria-describedby="claim-${name}-error"><option value="">Choose your region</option>${REGIONS.map((region) => `<option value="${region}">${region}</option>`).join("")}</select>`
      : `<input id="claim-${name}" name="${name}" type="${type}" autocomplete="${autocomplete}"${inputmode ? ` inputmode="${inputmode}"` : ""} maxlength="${name === "email" ? 254 : 80}" aria-describedby="claim-${name}-error">`;
    const text = optionalContact && (name === "phone" || name === "region") ? `${label} (optional)` : label;
    return `<div class="claim-field"><label for="claim-${name}">${text}</label>${control}<p class="claim-field__error" id="claim-${name}-error" data-error-for="${name}"></p></div>`;
  }).join("");

  // Binds the draft to the inputs and returns the inline-error painter (used by the play gate and the claim form).
  const bindFields = (form: HTMLFormElement) => {
    const input = (name: LeadField) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
    for (const { name } of CLAIM_FIELDS) {
      input(name).value = draft[name];
      input(name).addEventListener("input", () => { draft[name] = input(name).value; });
    }
    return (found: LeadFieldErrors) => {
      let firstInvalid: HTMLInputElement | HTMLSelectElement | undefined;
      for (const { name } of CLAIM_FIELDS) {
        const message = found[name] ?? "";
        form.querySelector<HTMLElement>(`[data-error-for="${name}"]`)!.textContent = message;
        input(name).toggleAttribute("aria-invalid", message !== "");
        if (message && !firstInvalid) firstInvalid = input(name);
      }
      firstInvalid?.focus();
    };
  };

  const renderGate = (proceed: () => void) => {
    Object.assign(draft, emptyDraft(), readEntry() ?? {});
    // A member (valid email already stored) only has to confirm name and email.
    const optionalContact = validateLead({ fullName: "x", email: draft.email }, { optionalContact: true }).ok;
    show(`<section aria-labelledby="result-title"><h2 id="result-title">Before you play</h2><p>Tell us where to send your prize.</p><form class="claim-form" novalidate data-gate-form>${fieldsMarkup(optionalContact)}<div class="claim-trap" aria-hidden="true"><label>Website<input name="website" type="text" tabindex="-1" autocomplete="off"></label></div><p class="claim-consent">${GATE_CONSENT_TEXT} <a href="${PRIVACY_URL}" target="_blank" rel="noopener">Privacy policy</a></p><button type="submit" class="claim-submit" data-gate-submit>Start playing</button></form></section>`, "claim");
    const form = dialog.querySelector<HTMLFormElement>("[data-gate-form]")!;
    const showErrors = bindFields(form);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const checked = validateLead(draft, { optionalContact });
      if (!checked.ok) return showErrors(checked.fields);
      const honeypot = (form.elements.namedItem("website") as HTMLInputElement).value;
      saveEntry(checked.value);
      const sent: Partial<typeof checked.value> = {};
      for (const key of ["fullName", "phone", "email", "region"] as const) if (checked.value[key] !== "") sent[key] = checked.value[key];
      sendEntry(sent as typeof checked.value, honeypot);
      dialog.close();
      proceed();
    });
  };

  const renderWin = (win: WinSummary, first: boolean) => {
    {
      const fireworks = Array.from({ length: 7 }, (_, burst) =>
        `<div class="result-popup__firework" style="left:${[18, 82, 50, 12, 88, 30, 70][burst]}%;top:${[16, 12, 8, 48, 44, 26, 30][burst]}%">${Array.from({ length: 18 }, (_, particle) =>
          `<i style="--a:${particle * 20}deg;--r:${60 + (particle % 3) * 25}px;--d:${[0, 1, 1.3, .7][burst % 4]}s;--c:${["#ffd54a", "#ff445c", "#fff4ba", "#59d7ff", "#ff9f2f"][particle % 5]}"></i>`).join("")}</div>`).join("");
      (first ? show : swap)(`<div class="result-popup__fx" aria-hidden="true"><div class="result-popup__beam"></div><div class="result-popup__confetti"></div><img class="result-popup__coin result-popup__coin--left" src="/assets/fx/coin.webp" alt=""><img class="result-popup__coin result-popup__coin--right" src="/assets/fx/coin.webp" alt="">${fireworks}</div><section aria-labelledby="result-title"><p class="result-popup__eyebrow">Congratulations, you won</p><div class="result-popup__board"><img src="/assets/keith/prizes.webp" alt=""><h2 id="result-title" class="result-popup__discount" aria-label="${win.discount}% off your order">${win.discount}%<span>OFF</span></h2></div><p class="result-popup__instruction">You have won ${win.discount}% off your order. Claim it now, and our chief chatters will contact you with the next steps.</p><button type="button" class="result-popup__claim" data-claim>Claim my ${win.discount}% offer</button><p class="result-popup__reference">Win reference <strong data-win-ref></strong></p><button type="button" class="result-popup__view-prizes" data-view-prizes>View prize table</button><a class="terms-link result-popup__terms" href="#terms-dialog" data-show-terms>Terms and conditions</a></section>`, "win");
      dialog.querySelector<HTMLElement>("[data-win-ref]")!.textContent = win.winRef;
      const known = completeEntry();
      const claim = dialog.querySelector<HTMLButtonElement>("[data-claim]")!;
      if (known) {
        claim.textContent = `Claim my ${win.discount}% offer, ${firstWord(known.fullName)}`;
        claim.addEventListener("click", async () => {
          claim.disabled = true;
          claim.setAttribute("aria-busy", "true");
          try {
            await claimLead({ ...known, spinId: win.spinId, website: "" });
            clearEntry();
            renderClaimed(win, firstWord(known.fullName), known.phone);
          } catch {
            renderClaimFailed(win);
          }
        });
      } else claim.addEventListener("click", () => renderClaim(win));
      dialog.querySelector<HTMLElement>("[data-show-terms]")?.addEventListener("click", (event) => { event.preventDefault(); showTerms(event.currentTarget as HTMLElement); });
      dialog.querySelector<HTMLButtonElement>("[data-view-prizes]")?.addEventListener("click", () => {
        dialog.close();
        onViewPrizes(win.ruleId);
      });
    }
  };

  const renderClaim = (win: WinSummary, errors: LeadFieldErrors = {}) => {
    const fields = fieldsMarkup();
    const prefilled = readEntry() !== null;
    swap(`<section aria-labelledby="result-title"><h2 id="result-title">${prefilled ? "Confirm" : "Claim"} your ${win.discount}% offer</h2>${prefilled ? "<p class=\"claim-prefill-note\">We have filled in the details you gave us. Check them, then claim.</p>" : ""}<form class="claim-form" novalidate data-claim-form>${fields}<div class="claim-trap" aria-hidden="true"><label>Website<input name="website" type="text" tabindex="-1" autocomplete="off"></label></div><p class="claim-consent">${CONSENT_TEXT} <a href="${PRIVACY_URL}" target="_blank" rel="noopener">Privacy policy</a></p><button type="submit" class="claim-submit" data-claim-submit>Claim my ${win.discount}% offer</button><button type="button" class="claim-back" data-claim-back>Back</button></form></section>`, "claim");
    const form = dialog.querySelector<HTMLFormElement>("[data-claim-form]")!;
    const showErrors = bindFields(form);
    showErrors(errors);
    form.querySelector("[data-claim-back]")?.addEventListener("click", () => renderWin(win, false));
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const checked = validateLead(draft);
      if (!checked.ok) return showErrors(checked.fields);
      showErrors({});
      const submit = form.querySelector<HTMLButtonElement>("[data-claim-submit]")!;
      submit.disabled = true;
      submit.setAttribute("aria-busy", "true");
      try {
        const honeypot = (form.elements.namedItem("website") as HTMLInputElement).value;
        await claimLead({ ...draft, spinId: win.spinId, website: honeypot });
        clearEntry();
        renderClaimed(win, draft.fullName.trim().split(/\s+/)[0], draft.phone.trim());
      } catch (caught) {
        if (caught instanceof ClaimError && caught.kind === "invalid" && hasVisibleFieldErrors(caught.fields)) {
          submit.disabled = false;
          submit.removeAttribute("aria-busy");
          showErrors(caught.fields);
        } else renderClaimFailed(win);
      }
    });
  };

  const renderClaimFailed = (win: WinSummary) => {
    swap(`<section aria-labelledby="result-title"><h2 id="result-title">Something went wrong</h2><p>We could not save your claim. Please try again, or call us free on ${FREEPHONE}.</p><button type="button" data-claim-retry>Try again</button></section>`, "claim");
    dialog.querySelector("[data-claim-retry]")?.addEventListener("click", () => completeEntry() ? renderWin(win, false) : renderClaim(win));
  };

  const renderClaimed = (win: WinSummary, firstName?: string, phone?: string) => {
    swap(`<section aria-labelledby="result-title"><h2 id="result-title">Your ${win.discount}% offer is claimed</h2><p data-claimed-message></p><a class="result-popup__claim" href="#" data-more-link>Find out more about NEOS radiators</a></section>`, "claimed");
    const reference = `Keep your win reference: ${win.winRef}.`;
    dialog.querySelector<HTMLElement>("[data-claimed-message]")!.textContent = firstName && phone
      ? `Thank you, ${firstName}. Our chief chatters will call you on ${phone} with the next steps. ${reference}`
      : `Thank you. Our chief chatters will contact you with the next steps. ${reference}`;
    dialog.querySelector<HTMLAnchorElement>("[data-more-link]")!.href = quoteUrl(location.search);
  };

  return {
    message,
    showGate(proceed) {
      renderGate(proceed);
    },
    showWin(win) {
      Object.assign(draft, emptyDraft(), readEntry() ?? {});
      renderWin(win, true);
    },
    showClaimed(win) {
      renderClaimed(win);
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
      show('<section aria-labelledby="result-title"><h2 id="result-title">Thanks for playing</h2><p>Your game is complete for today. You can still get a free, no-obligation heating quote.</p><a class="result-popup__claim" href="#" data-claim>Get my free quote</a></section>', "game-over");
      dialog.querySelector<HTMLAnchorElement>("[data-claim]")!.href = quoteUrl(location.search);
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
