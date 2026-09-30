import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
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

  it("uses rising pitch contours for both win jingles", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "trust-royale-audio-"));
    const sprite = path.join(process.cwd(), "public/assets/audio/sfx-sprite.mp3");

    const median = (values: number[]): number => {
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };

    const estimate = (samples: Buffer): number[] => {
      const sampleRate = 16_000;
      const windowSize = 2_000;
      const pitches: number[] = [];
      for (let offset = 0; offset + windowSize <= samples.length / 2; offset += windowSize) {
        const values = new Float64Array(windowSize);
        let energy = 0;
        for (let i = 0; i < windowSize; i += 1) {
          values[i] = samples.readInt16LE((offset + i) * 2);
          energy += values[i] * values[i];
        }
        if (Math.sqrt(energy / windowSize) < 500) continue;
        let bestLag = 0;
        let bestCorrelation = -Infinity;
        for (let lag = 20; lag <= 180; lag += 1) {
          let correlation = 0;
          for (let i = 0; i < windowSize - lag; i += 1) correlation += values[i] * values[i + lag];
          if (correlation > bestCorrelation) {
            bestCorrelation = correlation;
            bestLag = lag;
          }
        }
        if (bestLag > 0) pitches.push(sampleRate / bestLag);
      }
      return pitches;
    };

    for (const name of ["win.small", "win.big"] as const) {
      const [start, duration] = SPRITES[name];
      const raw = path.join(tempDir, `${name.replace(".", "-")}.raw`);
      execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(start / 1_000), "-t", String(duration / 1_000), "-i", sprite, "-ac", "1", "-ar", "16000", "-f", "s16le", raw]);
      const pitches = estimate(fs.readFileSync(raw));
      expect(pitches.length, name).toBeGreaterThanOrEqual(3);
      const split = Math.max(1, Math.floor(pitches.length / 3));
      expect(median(pitches.slice(-split)), name).toBeGreaterThan(median(pitches.slice(0, split)));
    }
  });
});
