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
