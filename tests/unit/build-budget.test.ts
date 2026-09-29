import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("production build budget", () => {
  it("checks JS gzip and pre-PLAY transfer limits after every build", async () => {
    const [script, packageJson] = await Promise.all([
      readFile("scripts/check-budget.mjs", "utf8"),
      readFile("package.json", "utf8"),
    ]);
    expect(script).toContain("250 * 1024");
    expect(script).toContain("4 * 1024 * 1024");
    expect(JSON.parse(packageJson).scripts.build).toContain("check-budget.mjs");
  });
});
