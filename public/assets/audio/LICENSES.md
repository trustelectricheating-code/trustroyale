# Trust Royale audio licences

All shipped audio permits commercial use without in-game attribution. These records are retained for auditability.

## Music

- `ambient-loop.webm` / `ambient-loop.mp3` — “Casino VIP Music Game Casino Music 3”, supplied by the owner from Pixabay. Source: https://pixabay.com/. Licence: Pixabay Content License. A 120-second section was loudness-normalised and its two-second ends crossfaded into a seamless 118-second loop. The game streams the 64 kbps Opus file and keeps a 96 kbps MP3 fallback.

## Sound-effect sprite

- `sfx.button` — `switch24.ogg`, Kenney UI Audio. Source: https://kenney.nl/assets/ui-audio. Author: Kenney. Licence: CC0 1.0.
- `sfx.reel.loop` — `freesound_community-slot-machine-reels-sound-30276.mp3`, supplied by the owner from Pixabay. Source: https://pixabay.com/. Author: Freesound Community. Licence: Pixabay Content License. The continuous reel section was trimmed, loudness-normalised, and crossfaded into a 3.05-second loop.
- `sfx.reel.stop.1`, `sfx.reel.stop.2`, and `sfx.reel.stop.3` — `impactMetal_heavy_000.ogg`, `_001.ogg`, and `_003.ogg`, Kenney Impact Sounds. Source: https://kenney.nl/assets/impact-sounds. Author: Kenney. Licence: CC0 1.0.
- `sfx.nearmiss` — `question_004.ogg`, Kenney Interface Sounds. Source: https://kenney.nl/assets/interface-sounds. Author: Kenney. Licence: CC0 1.0.
- `sfx.win.small` — `jingles_SAX07.ogg`, Kenney Music Jingles. Source: https://kenney.nl/assets/music-jingles. Author: Kenney. Licence: CC0 1.0.
- `sfx.win.big` — `jingles_STEEL07.ogg` mixed with `impactBell_heavy_000.ogg` and `_001.ogg`, Kenney Music Jingles and Impact Sounds. Sources: https://kenney.nl/assets/music-jingles and https://kenney.nl/assets/impact-sounds. Author: Kenney. Licence: CC0 1.0.
- `sfx.payout` — `chips-collide-2.ogg` and `chip-lay-2.ogg`, Kenney Casino Audio. Source: https://kenney.nl/assets/casino-audio. Author: Kenney. Licence: CC0 1.0.
- `sfx.chips` — `chips-handle-2.ogg`, Kenney Casino Audio. Source: https://kenney.nl/assets/casino-audio. Author: Kenney. Licence: CC0 1.0.
- `sfx.whoosh` — `open_004.ogg`, Kenney Interface Sounds. Source: https://kenney.nl/assets/interface-sounds. Author: Kenney. Licence: CC0 1.0.
- `sfx.coin.use` — `freesound_community-coin-upaif-14631.mp3`, supplied by the owner from Pixabay. Source: https://pixabay.com/. Author: Freesound Community. Licence: Pixabay Content License.

## Processing

FFmpeg 9.0.2 rebuilt the WebM/Opus and MP3 files. The music is 118 seconds at 64 kbps Opus with a 96 kbps MP3 fallback. The effect sprite is 80 kbps Opus with a 112 kbps MP3 fallback.
