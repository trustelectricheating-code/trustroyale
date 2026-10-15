import type { Page } from "@playwright/test";

export const freshFlowSession = { spinsLeft: 3, bonusAvailable: false, state: "idle", best: null, win: null };

export function flowRetry(spinNo: number, spinsLeft: number, nearMiss = false) {
  return {
    spinId: `00000000-0000-4000-8000-00000000000${spinNo}`, spinNo,
    reels: ["seven", "cherry", "sweets"],
    strip: [["scott", "fiona", "gia"], ["seven", "cherry", "sweets"], ["neos", "keith", "seven"]],
    outcome: "retry", ruleId: null, discount: null, winRef: null, best: null,
    nearMiss, spinsLeft, bonusAvailable: false, isBonus: false, gameOver: false,
  };
}

export function flowWin(discount: 10 | 15 | 20, spinNo: number, spinsLeft: number, gameOver = false) {
  const symbol = discount === 10 ? "neos" : discount === 15 ? "keith" : "scott";
  const best = { spinId: `00000000-0000-4000-8000-0000000000${discount}`, ruleId: `${symbol}-3`, discount, winRef: `TR-FLOW${discount}` };
  return {
    spinId: best.spinId, spinNo, reels: [symbol, symbol, symbol],
    strip: [["seven", "cherry", "sweets"], [symbol, symbol, symbol], ["neos", "keith", "gia"]],
    outcome: "win", ruleId: best.ruleId, discount, winRef: best.winRef, best,
    nearMiss: false, spinsLeft, bonusAvailable: false, isBonus: false, gameOver,
  };
}

export async function mockFlow(page: Page, results: object[], session: object = freshFlowSession): Promise<{ spinRequests: number }> {
  const requests = { spinRequests: 0 };
  await page.route("**/api/session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  await page.route("**/api/spin", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(results[requests.spinRequests++]) }));
  return requests;
}

export const gateDetails = { fullName: "Jane Smith", phone: "07911 123456", region: "Yorkshire and the Humber", email: "jane@example.com" };

/** Fills the "Before you play" step and starts the game. A new player meets it right after "Let's play!". */
export async function completeGate(page: Page, details = gateDetails): Promise<void> {
  await page.route("**/api/entry", (route) => route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
  await page.getByRole("heading", { name: "Before you play" }).waitFor();
  await page.getByLabel("Full name").fill(details.fullName);
  await page.getByLabel("Phone number").fill(details.phone);
  await page.getByLabel("Region").selectOption(details.region);
  await page.getByLabel("Email").fill(details.email);
  await page.getByRole("button", { name: "Start playing" }).click();
}

/** "Let's play!" then the gate, for tests that only need to reach the reels. */
export async function pressPlay(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Let's play!" }).click();
  await completeGate(page);
}

/** A known player (members' page hand-off or a finished gate): their details are already stored for this tab, so there is no gate. */
export async function seedEntry(page: Page, entry: Record<string, string> = { fullName: "Jane Smith", email: "jane@example.com" }): Promise<void> {
  await page.addInitScript((value) => { try { sessionStorage.setItem("royale-entry", JSON.stringify(value)); } catch { /* blocked */ } }, entry);
}
