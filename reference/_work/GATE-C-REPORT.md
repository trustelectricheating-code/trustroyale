# Gate C Report — Asset Production and Asset Board

## Outcome

Gate C now contains a complete 74-entry asset manifest across all nine contracted groups. Every entry is present, points to an existing file under `public/assets/`, includes provenance and licensing metadata, and remains at `status: "draft"` for owner review. The local review board is available at `http://localhost:5173/assets.html`. T031 remains intentionally incomplete because deployment and owner approval are outside this gate.

## Approved Gate B art promoted

The approved slot-hall backgrounds were copied into the background group without changing the live mock. The approved cabinet, photorealistic lit and unlit bulbs, cherry, seven, sweets, four idle character medallions, Neos medallion, four chip colours, two chip angles, and coin were also copied or used as generated source art for mechanical delivery derivatives. The original files remain under `public/assets/mock/`, so the Gate B mock still uses the exact approved paths.

Cabinet glass, reel-window mask, gold trim, marquee crop and SPIN states were extracted or colour-adjusted from the approved gpt-image-2 cabinet source. Symbol shine frames and the gold medallion rim were similarly derived from approved generated art. These operations only crop, resize, mask, mirror, composite, colour-adjust or encode existing generated pixels; they do not introduce replacement raster illustration.

## New gpt-image-2 art

OpenAI's built-in image generation tool (`gpt-image-2`) produced:

- Four identity-preserving expression sheets, one each for Scott, Fiona, Gia and Keith. Each sheet edits the approved idle medallion into half-closed, closed and winning-smile frames while preserving the face, costume, lighting, framing, velvet and gold ring.
- A transparent warm-gold and deep-red bokeh overlay.
- A transparent deep-red velvet curtain with gold tieback. The right curtain is a mirrored derivative. Both curtains are complete contract assets but are not used by the current slot-hall scene.
- A transparent four-cell FX atlas containing sparkle, confetti, glow and light-beam art.

The untouched generated source sheets and exact prompts are in `reference/_work/generated/gate-c/`. Earlier promoted assets retain their original sources and prompt records under `reference/_work/generated/` and `public/assets/mock/SOURCES.md`.

## Vector and custom UI art

The Neos master stays as the exact custom SVG rebuilt from the supplied brand guide. The pulse is a separate vector ring overlay. UI panels, win and retry frames, mute states, play button and white Trust logo are custom SVG assets, avoiding unnecessary rasterisation and preserving sharp edges. The white Trust asset wraps the existing exact traced Trust wordmark vector.

## Fonts

The display font is Cinzel Bold and the UI font is Nunito Sans Bold. Both were downloaded from Google Fonts, converted from the served TrueType binaries to self-hosted WOFF2 without modifying outlines, and declared with `@font-face`. Both use the SIL Open Font License 1.1.

- Cinzel: <https://fonts.google.com/specimen/Cinzel>
- Nunito Sans: <https://fonts.google.com/specimen/Nunito+Sans>

## Audio sources and licences

All audio source material is Creative Commons CC0 1.0 from Kenney. No Pixabay or attribution-only audio was used.

- Kenney Casino Audio: <https://kenney.nl/assets/casino-audio> — CC0 1.0. Supplies button, reel loop, three distinct reel stops, near-miss, chip and whoosh material, plus the separate ambient loop source.
- Kenney Music Jingles: <https://kenney.nl/assets/music-jingles> — CC0 1.0. Supplies the small-win and big-win cues.

Short effects are packed into `sfx-sprite.webm` using Opus, with `sfx-sprite.mp3` as fallback. `sprite.json` records every start time and duration. The ambient loop remains separate as `ambient-loop.webm`, with `ambient-loop.mp3` as fallback.

## Asset weight

The Gate C delivery is 4,038,187 bytes (3.85 MiB) across 68 unique files, including audio fallbacks and sprite metadata. The 74 manifest entries intentionally share the short-SFX sprite files.

| Group | Bytes |
|---|---:|
| Background | 1,861,168 |
| Cabinet | 386,012 |
| Symbols | 105,910 |
| Faces | 466,258 |
| Emblem | 9,918 |
| FX | 249,212 |
| UI | 2,869 |
| Fonts | 55,096 |
| Audio, including fallbacks | 901,744 |

## Review captures

- `reference/_work/gate-c-board-1920.png` — full desktop board at 1920×1080.
- `reference/_work/gate-c-board-390.png` — full phone board at 390×844.
- `reference/_work/gate-c-faces.png` — large contact sheet showing all 16 face frames.

## Verification

`pnpm build` passes with manifest validation included. `pnpm test` passes all 14 unit tests. The existing Gate B Playwright layout spec passes at all seven required viewports. The new asset-board smoke test confirms all 74 manifest entries render, all images have `naturalWidth > 0`, all 16 face frames and 11 audio controls are present, and the page emits no console errors. `git diff --check` passes.

## Not completed by design

T031 was not attempted. Nothing was deployed, no manifest status was changed to `approved`, and no owner sign-off was recorded. Those actions wait for review at `http://localhost:5173/assets.html`.

## Ponytail-lite note

The lazier alternative would be a plain filesystem index. The contracted live blink, pulse, audio controls, provenance and responsive review captures require the implemented board.
