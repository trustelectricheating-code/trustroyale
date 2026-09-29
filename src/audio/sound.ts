import { Howl, Howler } from "howler";

export type SoundName = "button" | "reel.loop" | "reel.stop.1" | "reel.stop.2" | "reel.stop.3" | "nearmiss" | "win.small" | "win.big" | "payout" | "chips" | "whoosh";

const SPRITES: Record<SoundName, [number, number] | [number, number, boolean]> = {
  button: [0, 300],
  "reel.loop": [400, 2400, true],
  "reel.stop.1": [2900, 550],
  "reel.stop.2": [3550, 550],
  "reel.stop.3": [4200, 550],
  nearmiss: [4850, 700],
  "win.small": [5650, 1900],
  "win.big": [7650, 2500],
  payout: [10250, 1600],
  chips: [11950, 650],
  whoosh: [12700, 550],
};

export interface SoundSystem {
  ambient: { start(): void };
  unlock(): Promise<void>;
  play(name: SoundName): void;
  stop(name: SoundName): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
}

export function createSound(): SoundSystem {
  let effects: Howl | undefined;
  let ambient: Howl | undefined;
  let reelLoopId: number | undefined;
  let muted = localStorage.getItem("trustRoyaleMuted") === "true";
  document.documentElement.dataset.audioStatus = "locked";
  Howler.mute(muted);

  const load = (): void => {
    effects ??= new Howl({ src: ["/assets/audio/sfx-sprite.webm", "/assets/audio/sfx-sprite.mp3"], sprite: SPRITES, preload: true });
    ambient ??= new Howl({ src: ["/assets/audio/ambient-loop.webm", "/assets/audio/ambient-loop.mp3"], loop: true, volume: 0.24, preload: true });
  };

  const unlock = async (): Promise<void> => {
    load();
    try {
      if (Howler.ctx?.state === "suspended") await Howler.ctx.resume();
      document.documentElement.dataset.audioStatus = Howler.ctx?.state === "running" ? "running" : "blocked";
    } catch {
      document.documentElement.dataset.audioStatus = "blocked";
    }
  };

  return {
    ambient: { start() { try { ambient?.play(); } catch { document.documentElement.dataset.audioStatus = "blocked"; } } },
    unlock,
    play(name) {
      try {
        const id = effects?.play(name);
        if (name === "reel.loop") reelLoopId = id;
        if (name === "win.small" || name === "win.big") {
          ambient?.fade(0.24, 0.08, 160);
          window.setTimeout(() => ambient?.fade(0.08, 0.24, 700), name === "win.big" ? 3_000 : 2_200);
        }
      } catch { /* Game remains playable when audio is blocked. */ }
    },
    stop(name) { try { if (name === "reel.loop" && reelLoopId !== undefined) effects?.stop(reelLoopId); } catch { /* Game remains playable when audio is blocked. */ } },
    setMuted(value) { muted = value; localStorage.setItem("trustRoyaleMuted", String(value)); Howler.mute(value); },
    isMuted: () => muted,
  };
}
