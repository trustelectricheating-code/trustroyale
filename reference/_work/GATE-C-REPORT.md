# Gate C Report — Asset Production and Asset Board

## Outcome

Gate C contains a complete 74-entry asset manifest across all nine contracted groups. Every entry points to an existing file under `public/assets/`, includes provenance and licensing metadata, and remains at `status: "draft"` for owner review. The local review board is available at `http://localhost:5173/assets.html`. T031 remains intentionally incomplete because deployment and owner approval are outside this gate.

## Approved Gate B art promoted

The approved slot-hall backgrounds were copied into the background group without changing the live mock. The approved cabinet, photorealistic bulbs, cherry, seven, sweets, four idle character medallions, Neos medallion, four chip colours, two chip angles, and coin were copied or used as source art for mechanical delivery derivatives. The original files remain under `public/assets/mock/`, so the Gate B mock still uses its approved paths.

Cabinet glass, reel-window mask, gold trim, and the marquee crop were derived from the approved generated cabinet. Symbol shine frames were derived from approved generated symbols. These operations only crop, resize, mask, mirror, composite, colour-adjust, or encode existing generated pixels; they do not introduce replacement raster illustration.

## New gpt-image-2 art

OpenAI's built-in image generation tool (`gpt-image-2`) produced:

- Four identity-preserving expression sheets, one each for Scott, Fiona, Gia, and Keith. Each sheet edits an approved idle medallion into half-closed, closed, and winning-smile frames while preserving the subject, costume, lighting, framing, velvet, and gold ring.
- A transparent warm-gold and deep-red bokeh overlay.
- A transparent deep-red velvet curtain with a gold tieback. The right curtain is a mirrored derivative. Both curtains complete the contract assets but are not used by the current slot-hall scene.
- A four-cell FX sheet for the sparkle, confetti, halo, and light-beam assets.

All prompts and untouched generation outputs are stored in `reference/_work/generated/gate-c/`. Earlier Gate B prompts remain recorded in `reference/_work/generated/` and `public/assets/mock/SOURCES.md`.

## QA round 1 corrections

The three SPIN state assets now contain the approved Gate B-style glossy red button face and `SPIN` label. The raised state is bright and elevated; the pressed state is smaller, lower, darker, and has less highlight; the disabled state is desaturated and dimmed. They are deterministic Chromium renders of the approved live CSS treatment, recorded in `scripts/render-gate-c-spin.mjs`.

`sym.frame` is now an empty polished-gold medallion rim with a transparent centre. The manifest points to the lossless WebP asset. The intermediate PNG was removed after confirming that no code or manifest entry referenced it.

Scott, Fiona, Gia, and Keith each received new half-blink and closed-eye edits from their idle medallion. Visual review of the individual frames and regenerated contact sheet confirms that both eyes change together: both eyelids are equally half-closed in `half`, and both eyes are fully closed in `closed`. No frame reads as a wink. The prompts and untouched two-panel source sheets are stored in `reference/_work/generated/gate-c/`.

## UI and vector assets

The Neos emblem and pulse are separate vector assets. UI panels, win and retry frames, mute states, play button, and white Trust logo are custom SVG assets, preserving sharp edges and brand accuracy. The white Trust asset wraps the existing traced Trust wordmark vector.

## Fonts

The display font is Cinzel Bold and the UI font is Nunito Sans Bold. Both were downloaded from Google Fonts, converted to self-hosted WOFF2 without modifying outlines, and declared with `@font-face`. Both use the SIL Open Font License 1.1.

- Cinzel: <https://fonts.google.com/specimen/Cinzel>
- Nunito Sans: <https://fonts.google.com/specimen/Nunito+Sans>

## Audio sources and licences

All audio source material is Creative Commons CC0 1.0 from Kenney. No Pixabay or attribution-only audio is used.

- Kenney Casino Audio: <https://kenney.nl/assets/casino-audio> — CC0 1.0. Supplies the button, reel loop, three distinct reel stops, near miss, chip whoosh, and separate ambient-loop source.
- Kenney Music Jingles: <https://kenney.nl/assets/music-jingles> — CC0 1.0. Supplies the small-win and big-win cues.

Short effects are packed into `sfx-sprite.webm` using Opus, with `sfx-sprite.mp3` as the fallback. `sprite.json` records every start time and duration. The ambient loop remains separate as `ambient-loop.webm`, with `ambient-loop.mp3` as the fallback.

## Asset weight

The Gate C delivery is 4,122,699 bytes (3.93 MiB) across 68 unique delivery files, including audio fallbacks and sprite metadata. The 74 manifest entries intentionally share short-SFX sprite files.

| Group | Bytes |
|---|---:|
| Background | 1,861,168 |
| Cabinet | 448,878 |
| Symbols | 132,164 |
| Faces | 461,650 |
| Emblem | 9,918 |
| FX | 249,212 |
| UI | 2,869 |
| Fonts | 55,096 |
| Audio, including fallbacks | 901,744 |

## Review captures

- `reference/_work/gate-c-board-1920.png`: full asset board at 1920×1080.
- `reference/_work/gate-c-board-390.png`: full asset board at 390×844.
- `reference/_work/gate-c-faces.png`: all 16 face frames at review size.

## Verification

`pnpm build`, `pnpm test`, the Playwright layout spec, the Playwright asset-board smoke test, and `git diff --check` pass. The smoke test confirms that all 74 manifest entries render, every image has `naturalWidth > 0`, all 16 face frames are present, all 11 audio controls are present, and the page emits no console errors. The regenerated desktop, mobile, and face captures were visually reviewed after the checks.

## Not completed by design

T031 was not attempted. Nothing was deployed, no manifest status was changed to `approved`, and no owner sign-off was recorded. Those actions wait for review at `http://localhost:5173/assets.html`.

## Ponytail-lite note

The lazier alternative is a plain filesystem index. The contracted live blink preview, emblem pulse, audio controls, provenance metadata, and responsive review captures require the implemented asset board.
