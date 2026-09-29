import { Howl, Howler } from "howler";

export type SoundName = "button" | "reel.loop" | "reel.stop.1" | "reel.stop.2" | "reel.stop.3" | "nearmiss" | "win.small" | "win.big" | "chips" | "whoosh";

const SPRITES: Record<SoundName, [number, number]> = {
  button: [0, 300],
  "reel.loop": [400, 1500],
  "reel.stop.1": [2000, 600],
  "reel.stop.2": [2700, 600],
  "reel.stop.3": [3400, 600],
  nearmiss: [4100, 800],
  "win.small": [5000, 1100],
  "win.big": [6200, 1800],
  chips: [8100, 400],
  whoosh: [8600, 800],
};

export interface SoundSystem {
  ambient: { start(): void };
  unlock(): Promise<void>;
  play(name: SoundName): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
}

export function createSound(): SoundSystem {
  let effects: Howl | undefined;
  let ambient: Howl | undefined;
  let muted = localStorage.getItem("trustRoyaleMuted") === "true";
  document.documentElement.dataset.audioStatus = "locked";
  Howler.mute(muted);

  const load = (): void => {
    effects ??= new Howl({ src: ["/assets/audio/sfx-sprite.webm", "/assets/audio/sfx-sprite.mp3"], sprite: SPRITES, preload: true });
    ambient ??= new Howl({ src: ["/assets/audio/ambient-loop.webm", "/assets/audio/ambient-loop.mp3"], loop: true, volume: 0.38, preload: true });
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
    play(name) { try { effects?.play(name); } catch { /* Game remains playable when audio is blocked. */ } },
    setMuted(value) { muted = value; localStorage.setItem("trustRoyaleMuted", String(value)); Howler.mute(value); },
    isMuted: () => muted,
  };
}
