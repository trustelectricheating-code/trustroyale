import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resultSoundNames, SPRITES } from "../../src/audio/sound";

describe("result audio", () => {
  it("never plays the near-miss cue for a win", () => {
    expect(resultSoundNames("win", 15, true)).toEqual(["win.small", "payout"]);
    expect(resultSoundNames("win", 20, true)).toEqual(["win.big", "payout"]);
  });

  it("keeps every sprite range inside both shipped files", () => {
    const lastSpriteEnd = Math.max(...Object.values(SPRITES).map(([start, duration]) => start + duration));
    for (const file of ["sfx-sprite.mp3", "sfx-sprite.webm"]) {
      const durationMs = Number(execFileSync("ffprobe", [
        "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1",
        path.join(process.cwd(), "public/assets/audio", file),
      ], { encoding: "utf8" }).trim()) * 1_000;
      expect(durationMs, file).toBeGreaterThanOrEqual(lastSpriteEnd);
    }
  });
});
