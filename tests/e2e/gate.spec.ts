import { expect, test, type Page, type Route } from "@playwright/test";
import { flowWin, freshFlowSession, mockFlow } from "./helpers/flow";

const claimedBody = { ok: true, winRef: "TR-FLOW20" };
const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

interface Calls { entry: Array<Record<string, unknown>>; lead: Array<Record<string, unknown>> }

async function setup(page: Page, lead: (route: Route) => Promise<void> | void = (route) => json(route, 201, claimedBody)): Promise<Calls> {
  const calls: Calls = { entry: [], lead: [] };
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockFlow(page, [flowWin(20, 1, 0, true)], freshFlowSession);
  await page.route("**/api/entry", (route) => { calls.entry.push(route.request().postDataJSON()); return json(route, 202, { ok: true }); });
  await page.route("**/api/lead", (route) => { calls.lead.push(route.request().postDataJSON()); return lead(route); });
  return calls;
}

async function open(page: Page, url = "/?ss_tk=123456%7Cabcdef0123456789abcdef01&gclid=g1"): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
}

test("a new player gives details before the first spin, then claims a won prize in one tap", async ({ page }) => {
  const calls = await setup(page);
  await open(page);
  await page.getByRole("button", { name: "Let's play!" }).click();
  await expect(page.getByRole("heading", { name: "Before you play" })).toBeVisible();
  await expect(page.getByText("Tell us where to send your prize.")).toBeVisible();
  await expect(page.getByText("By playing, you agree that Trust Electric Heating can contact you about your offer.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "https://www.trustelectricheating.co.uk/privacy-policy");

  // Empty fields cannot start the game.
  await page.getByRole("button", { name: "Start playing" }).click();
  await expect(page.getByText("Please enter your full name.")).toBeVisible();
  await expect(page.getByText("Please enter a UK phone number, for example 07911 123456.")).toBeVisible();
  await expect(page.getByText("Please choose your region.")).toBeVisible();
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeFocused();
  expect(calls.entry).toHaveLength(0);
  await expect(page.locator("#intro")).toBeVisible();

  await page.getByLabel("Full name").fill("Jane Smith");
  await page.getByLabel("Phone number").fill("+44 (0)7911 123456");
  await page.getByLabel("Region").selectOption("Yorkshire and the Humber");
  await page.getByLabel("Email").fill("jane@example.com");
  await page.getByRole("button", { name: "Start playing" }).click();
  await expect(page.locator("#intro")).not.toBeVisible();
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("royale-entry")!))).toEqual({ fullName: "Jane Smith", phone: "07911123456", email: "jane@example.com", region: "Yorkshire and the Humber" });

  await page.locator("#spin").click();
  const claim = page.getByRole("button", { name: "Claim my 20% offer, Jane" });
  await expect(claim).toBeVisible();
  await expect(page.locator("[data-claim-form]")).toHaveCount(0);
  await expect(page.getByLabel("Full name")).toHaveCount(0);
  await claim.click();
  await expect(page.getByRole("heading", { name: "Your 20% offer is claimed" })).toBeVisible();
  await expect(page.getByText("Thank you, Jane. Our chief chatters will call you on 07911123456 with the next steps. Your offer is 20% off your heating. Keep your win reference: TR-FLOW20.")).toBeVisible();

  expect(calls.entry).toHaveLength(1);
  expect(calls.entry[0]).toMatchObject({ fullName: "Jane Smith", phone: "07911123456", email: "jane@example.com", region: "Yorkshire and the Humber", website: "", ssTrackingId: "123456|abcdef0123456789abcdef01" });
  expect(String(calls.entry[0].marketingUrl)).toContain("gclid=g1");
  expect(calls.lead).toHaveLength(1);
  expect(calls.lead[0]).toMatchObject({ spinId: "00000000-0000-4000-8000-000000000020", fullName: "Jane Smith", phone: "07911123456", email: "jane@example.com", region: "Yorkshire and the Humber", website: "", ssTrackingId: "123456|abcdef0123456789abcdef01" });
  expect(await page.evaluate(() => sessionStorage.getItem("royale-entry"))).toBeNull();
});

test("the one-tap button is disabled and busy while posting, and a failure shows the call-us step", async ({ page }) => {
  let release: () => void = () => undefined;
  const hold = new Promise<void>((resolve) => { release = resolve; });
  const calls = await setup(page, async (route) => { await hold; await json(route, 500, { error: "server_error" }); });
  await open(page, "/");
  await page.getByRole("button", { name: "Let's play!" }).click();
  await page.getByLabel("Full name").fill("Jane Smith");
  await page.getByLabel("Phone number").fill("07911 123456");
  await page.getByLabel("Region").selectOption("London");
  await page.getByLabel("Email").fill("jane@example.com");
  await page.getByRole("button", { name: "Start playing" }).click();
  await page.locator("#spin").click();
  const claim = page.getByRole("button", { name: "Claim my 20% offer, Jane" });
  await claim.click();
  await expect(claim).toBeDisabled();
  await expect(claim).toHaveAttribute("aria-busy", "true");
  release();
  await expect(page.getByText("We could not save your claim. Please try again, or call us free on 0800 5999 109.")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("button", { name: "Claim my 20% offer, Jane" })).toBeEnabled();
  expect(calls.lead).toHaveLength(1);
});

test("a member arriving with #entry skips the gate and claims in one tap", async ({ page }) => {
  const calls = await setup(page);
  const fragment = Buffer.from(JSON.stringify({ firstName: "Siân", lastName: "O'Neill", email: "sian@example.com" })).toString("base64url");
  await open(page, `/#entry=${fragment}`);
  await page.getByRole("button", { name: "Let's play!" }).click();
  await expect(page.locator("#intro")).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Before you play" })).toHaveCount(0);
  await page.locator("#spin").click();
  await page.getByRole("button", { name: "Claim my 20% offer, Siân" }).click();
  await expect(page.getByRole("heading", { name: "Your 20% offer is claimed" })).toBeVisible();
  expect(calls.entry).toHaveLength(0);
  expect(calls.lead).toHaveLength(1);
  expect(calls.lead[0]).toMatchObject({ fullName: "Siân O'Neill", email: "sian@example.com", phone: "", region: "" });
});

test("a stored email without a name still meets the gate, with phone and region optional", async ({ page }) => {
  const calls = await setup(page);
  await open(page, `/#entry=${Buffer.from(JSON.stringify({ email: "sian@example.com" })).toString("base64url")}`);
  await page.getByRole("button", { name: "Let's play!" }).click();
  await expect(page.getByRole("heading", { name: "Before you play" })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue("sian@example.com");
  await expect(page.getByLabel("Phone number (optional)")).toBeVisible();
  await page.getByLabel("Full name").fill("Sian Jones");
  await page.getByRole("button", { name: "Start playing" }).click();
  await expect(page.locator("#intro")).not.toBeVisible();
  expect(calls.entry).toHaveLength(1);
  expect(calls.entry[0]).toMatchObject({ fullName: "Sian Jones", email: "sian@example.com" });
  expect(calls.entry[0]).not.toHaveProperty("phone");
});

test("a returning winner with no stored entry gets the claim form, and no gate", async ({ page }) => {
  const calls = await setup(page);
  const win = { spinId: "00000000-0000-4000-8000-000000000020", ruleId: "scott-3", discount: 20, winRef: "TR-FLOW20" };
  await page.unroute("**/api/session**");
  await page.route("**/api/session**", (route) => json(route, 200, { spinsLeft: 0, bonusAvailable: false, state: "won", best: win, win: { ...win, reels: ["scott", "scott", "scott"] } }));
  await open(page, "/");
  await expect(page.getByRole("heading", { name: "Before you play" })).toHaveCount(0);
  await page.getByRole("button", { name: "Claim my 20% offer" }).click();
  await expect(page.getByRole("heading", { name: "Claim your 20% offer" })).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeVisible();
  expect(calls.lead).toHaveLength(0);
});
