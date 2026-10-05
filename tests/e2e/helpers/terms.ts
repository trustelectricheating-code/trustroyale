import { type Page } from "@playwright/test";

export async function mockTermsGame(page: Page): Promise<{ spinRequests: number }> {
  const requests = { spinRequests: 0 };
  const best = { spinId: "00000000-0000-4000-8000-000000000020", ruleId: "scott-3", discount: 20, winRef: "TR-TERMS20" };
  await page.route("**/api/session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ spinsLeft: 3, bonusAvailable: false, state: "idle", best: null, win: null }) }));
  await page.route("**/api/spin", (route) => {
    requests.spinRequests += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      spinId: best.spinId, spinNo: 3, reels: ["scott", "scott", "scott"],
      strip: [["seven", "cherry", "sweets"], ["scott", "scott", "scott"], ["neos", "keith", "gia"]],
      outcome: "win", ruleId: best.ruleId, discount: best.discount, winRef: best.winRef, best,
      nearMiss: false, spinsLeft: 0, bonusAvailable: false, isBonus: false, gameOver: true,
    }) });
  });
  return requests;
}
