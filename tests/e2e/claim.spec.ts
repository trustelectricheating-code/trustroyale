import { expect, test, type Page } from "@playwright/test";

const win = {
  spinId: "00000000-0000-4000-8000-000000000020",
  ruleId: "scott-3", discount: 20, winRef: "TR-FINAL20",
};
const wonSession = { spinsLeft: 0, bonusAvailable: false, state: "won", best: win, win: { ...win, reels: ["scott", "scott", "scott"] } };
const viewports = [[667, 375], [844, 390], [932, 430], [390, 844], [1440, 900]] as const;

async function openWin(page: Page, lead: (route: import("@playwright/test").Route) => Promise<void> | void, search = ""): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wonSession) }));
  await page.route("**/api/lead", lead);
  await page.goto(`/${search}`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  await expect(page.getByRole("button", { name: "Claim my 20% offer" })).toBeVisible();
}

async function fill(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Claim my 20% offer" }).click();
  await page.getByLabel("Full name").fill("Jane Smith");
  await page.getByLabel("Phone number").fill("+44 (0)7911 123456");
  await page.getByLabel("Region").selectOption("Yorkshire and the Humber");
  await page.getByLabel("Email").fill("jane@example.com");
}

const created = (route: import("@playwright/test").Route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, winRef: "TR-FINAL20" }) });

test("a winner claims the offer and sees the success step", async ({ page }) => {
  let posted: Record<string, unknown> = {};
  await openWin(page, (route) => { posted = route.request().postDataJSON(); return created(route); }, "?ss_tk=123456%7Cabcdef0123456789abcdef01&gclid=g1");
  await fill(page);
  await expect(page.getByRole("heading", { name: "Claim your 20% offer" })).toBeVisible();
  await page.getByRole("button", { name: "Claim my 20% offer" }).click();
  await expect(page.getByRole("heading", { name: "Your 20% offer is claimed" })).toBeVisible();
  await expect(page.getByText("Thank you, Jane. Our chief chatters will call you on +44 (0)7911 123456 with the next steps.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Your offers" }).getByRole("listitem")).toHaveText(["You won20% offyour NEOS heating", "Plus£250 offan Ocean Hot Water Solution"]);
  await expect(page.getByText("Keep your win reference TR-FINAL20")).toBeVisible();
  const more = page.getByRole("link", { name: "Find out more about NEOS radiators" });
  const href = await more.getAttribute("href");
  expect(href).toContain("gclid=g1");
  expect(href).not.toContain("prize=");
  expect(posted).toMatchObject({ spinId: win.spinId, fullName: "Jane Smith", email: "jane@example.com", website: "", ssTrackingId: "123456|abcdef0123456789abcdef01" });
  expect(String(posted.marketingUrl)).toContain("gclid=g1");
});

test("the claim step offers labels, autocomplete, large inputs and a privacy link", async ({ page }) => {
  await openWin(page, created);
  await page.getByRole("button", { name: "Claim my 20% offer" }).click();
  for (const [label, autocomplete] of [["Full name", "name"], ["Phone number", "tel"], ["Region", "address-level1"], ["Email", "email"]]) {
    const input = page.getByLabel(label);
    await expect(input).toHaveAttribute("autocomplete", autocomplete);
    const box = await input.evaluate((node) => ({ height: node.getBoundingClientRect().height, font: parseFloat(getComputedStyle(node).fontSize) }));
    expect(box.height).toBeGreaterThanOrEqual(48);
    expect(box.font).toBeGreaterThanOrEqual(18);
  }
  const privacy = page.getByRole("link", { name: "Privacy policy" });
  await expect(privacy).toHaveAttribute("href", "https://www.trustelectricheating.co.uk/privacy-policy");
  await expect(privacy).toHaveAttribute("target", "_blank");
  await expect(privacy).toHaveAttribute("rel", /noopener/);
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByText("You have won 20% off your heating.")).toBeVisible();
});

test("empty and invalid fields show inline errors and focus the first one", async ({ page }) => {
  let posts = 0;
  await openWin(page, (route) => { posts += 1; return created(route); });
  await page.getByRole("button", { name: "Claim my 20% offer" }).click();
  await page.getByRole("button", { name: "Claim my 20% offer" }).click();
  await expect(page.getByText("Please enter your full name.")).toBeVisible();
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeFocused();
  expect(posts).toBe(0);
});

test("the region is a required select with the 11 regions and an inline error when missing", async ({ page }) => {
  let posts = 0;
  await openWin(page, (route) => { posts += 1; return created(route); });
  await fill(page);
  const region = page.getByLabel("Region");
  expect(await region.evaluate((node) => (node as HTMLSelectElement).options.length)).toBe(12);
  await expect(region.locator("option").first()).toHaveText("Choose your region");
  await expect(region.locator("option").first()).toHaveAttribute("value", "");
  await region.selectOption("");
  await page.getByRole("button", { name: "Claim my 20% offer" }).click();
  await expect(page.getByText("Please choose your region.")).toBeVisible();
  await expect(region).toBeFocused();
  expect(posts).toBe(0);
});

test("a 400 from the server puts its errors under the fields", async ({ page }) => {
  await openWin(page, (route) => route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "invalid", fields: { phone: "That phone number is not valid." } }) }));
  await fill(page);
  await page.getByRole("button", { name: "Claim my 20% offer" }).click();
  await expect(page.getByText("That phone number is not valid.")).toBeVisible();
  await expect(page.getByLabel("Phone number")).toBeFocused();
  await expect(page.getByRole("button", { name: "Claim my 20% offer" })).toBeEnabled();
});

test("a 500 shows the error step and Try again returns to the filled form", async ({ page }) => {
  await openWin(page, (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "server_error" }) }));
  await fill(page);
  await page.getByRole("button", { name: "Claim my 20% offer" }).click();
  await expect(page.getByText("We could not save your claim. Please try again, or call us free on 0800 5999 109.")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByLabel("Full name")).toHaveValue("Jane Smith");
  await expect(page.getByLabel("Email")).toHaveValue("jane@example.com");
});

test("the submit button is disabled while the claim is sending", async ({ page }) => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await openWin(page, async (route) => { await gate; await created(route); });
  await fill(page);
  const submit = page.locator("[data-claim-submit]");
  await submit.click();
  await expect(submit).toBeDisabled();
  release();
  await expect(page.getByRole("heading", { name: "Your 20% offer is claimed" })).toBeVisible();
});

test("a duplicate 200 also shows the success step", async ({ page }) => {
  await openWin(page, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, winRef: "TR-FINAL20", duplicate: true }) }));
  await fill(page);
  await page.getByRole("button", { name: "Claim my 20% offer" }).click();
  await expect(page.getByRole("heading", { name: "Your 20% offer is claimed" })).toBeVisible();
});

test("focus stays inside the claim dialog and Escape closes it", async ({ page }) => {
  await openWin(page, created);
  await page.getByRole("button", { name: "Claim my 20% offer" }).click();
  for (let press = 0; press < 12; press += 1) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest("dialog.result-popup")))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

for (const [width, height] of viewports) {
  test(`the claim submit button is reachable at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openWin(page, created);
    await page.getByRole("button", { name: "Claim my 20% offer" }).click();
    const submit = page.locator("[data-claim-submit]");
    await submit.scrollIntoViewIfNeeded();
    const box = (await submit.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(height);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    const dialog = (await page.locator("dialog.result-popup").boundingBox())!;
    expect(dialog.y + dialog.height).toBeLessThanOrEqual(height + 1);
    await submit.click({ trial: true });
  });
}


// A hand-off with no email is not a known player yet, so the win screen keeps the claim form and prefills it.
const VECTOR = Buffer.from(JSON.stringify({ firstName: "Siân", lastName: "O'Neill", phone: "07911 123456", region: "Yorkshire and the Humber" })).toString("base64url");

test("details from the entry fragment prefill the claim form and are cleared after the claim", async ({ page }) => {
  let posted: Record<string, unknown> = {};
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wonSession) }));
  await page.route("**/api/lead", (route) => { posted = route.request().postDataJSON(); return created(route); });
  await page.goto(`/#entry=${VECTOR}`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  expect(await page.evaluate(() => location.hash)).toBe("");
  expect(await page.evaluate(() => location.href.includes("entry="))).toBe(false);
  await page.getByRole("button", { name: "Claim my 20% offer" }).click();
  await expect(page.getByRole("heading", { name: "Confirm your 20% offer" })).toBeVisible();
  await expect(page.getByText("We have filled in the details you gave us. Check them, then claim.")).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveValue("Siân O'Neill");
  await expect(page.getByLabel("Phone number")).toHaveValue("07911 123456");
  await expect(page.getByLabel("Region")).toHaveValue("Yorkshire and the Humber");
  await expect(page.getByLabel("Region").locator("option:checked")).toHaveText("Yorkshire and the Humber");
  await page.getByLabel("Email").fill("sian@example.com");
  await page.getByRole("button", { name: "Claim my 20% offer" }).click();
  await expect(page.getByRole("heading", { name: "Your 20% offer is claimed" })).toBeVisible();
  expect(posted).toMatchObject({ fullName: "Siân O'Neill", phone: "07911 123456", email: "sian@example.com", region: "Yorkshire and the Humber" });
  expect(posted).not.toHaveProperty("postcode");
  expect(await page.evaluate(() => sessionStorage.getItem("royale-entry"))).toBeNull();
});

test("a 400 that names no visible field (only spinId) shows the failure step, not a dead button", async ({ page }) => {
  await openWin(page, (route) => route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "invalid", fields: { spinId: "Missing or invalid spin." } }) }));
  await fill(page);
  await page.getByRole("button", { name: "Claim my 20% offer" }).click();
  await expect(page.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
  await expect(page.getByText("call us free on 0800 5999 109")).toBeVisible();
});
