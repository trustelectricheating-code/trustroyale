# Gate B generated mock sources

| File | Generator | Owner-supplied reference | Full-size generated source |
|---|---|---|---|
| `scott-medallion.webp` | OpenAI built-in image generation (`gpt-image-2`) | `reference/_work/headshots/2.png` | `reference/_work/generated/scott-medallion.png` |
| `fiona-medallion.webp` | OpenAI built-in image generation (`gpt-image-2`) | `reference/_work/headshots/1.png` | `reference/_work/generated/fiona-medallion.png` |
| `keith-medallion.webp` | OpenAI built-in image generation (`gpt-image-2`) | `reference/keith the mascot.png` | `reference/_work/generated/keith-medallion.png` |

All three images were generated as Monte Carlo Velvet reel medallions. Owner-supplied files were used only as identity references. No text, logos, or Chinese iconography was requested or added.

## Round 3 — realism

Every raster below was generated with OpenAI's built-in image tool (`gpt-image-2`). Prompt specifications are recorded in `reference/_work/generated/round3/prompts.txt`. WebP files are resized and compressed delivery derivatives; `cabinet.webp` also has its measured reel window cut to transparent alpha.

| Delivery file | Full-size generated source |
|---|---|
| `casino-hall-landscape.webp` | `reference/_work/generated/round3/casino-hall-landscape.png` |
| `casino-hall-portrait.webp` | `reference/_work/generated/round3/casino-hall-portrait.png` |
| `cabinet.webp` | `reference/_work/generated/round3/cabinet.png` |
| `roulette-wheel.webp` | `reference/_work/generated/round3/roulette-wheel.png` |
| `chip-red-blank.webp` | `reference/_work/generated/round3/chip-red-blank.png` |
| `chip-gold-blank.webp` | `reference/_work/generated/round3/chip-gold-blank.png` |
| `chip-navy-blank.webp` | `reference/_work/generated/round3/chip-navy-blank.png` |
| `chip-white-blank.webp` | `reference/_work/generated/round3/chip-white-blank.png` |
| `coin.webp` | `reference/_work/generated/round3/coin.png` |
| `cherry.webp` | `reference/_work/generated/round3/cherry.png` |
| `seven.webp` | `reference/_work/generated/round3/seven.png` |
| `sweets.webp` | `reference/_work/generated/round3/sweets.png` |

Depth-of-field delivery derivatives are also generated from those recorded sources: `roulette-wheel-soft.webp` from `roulette-wheel.png`; `chip-{red,gold,navy,white}-{far,near}.webp` from the corresponding blank chip plus the vector Neos emblem; and `coin-{far,near}.webp` from `coin.png`. ImageMagick applies only resizing, emblem compositing, WebP compression, alpha cutting, and depth blur; it does not introduce ungenerated raster artwork.

Round 5 adds alpha-trimmed reel derivatives `cherry-reel.webp`, `seven-reel.webp`, and `sweets-reel.webp` from their recorded generated sources. ImageMagick trims transparent padding, scales the visible bounds, centres each result on a transparent 256×256 canvas, and writes WebP; no new artwork is introduced.

## Round 7 — Gia medallion

`gia-medallion.webp` was generated with OpenAI's built-in image tool (`gpt-image-2`) from owner-supplied identity reference `reference/gia.png`, with `scott-medallion.webp` and `fiona-medallion.webp` supplied as style/layout references. The untouched full-size generation is `reference/_work/generated/gia-medallion.png`; the exact prompt is `reference/_work/generated/gia-medallion-prompt.txt`. Delivery processing only resizes to 512×512, strips metadata, and encodes WebP.

## Round 8 — transparent chip emblems

The eight `chip-{red,gold,navy,white}-{far,near}.webp` depth derivatives were rebuilt mechanically from their recorded blank generated chip sources. The exact `public/assets/emblem/neos.svg` geometry was rendered in cream-gold on a transparent 46×46 canvas, composited directly onto each chip face, and then given the existing far/near depth blur. No generative model or new artwork was used. The three `coin*.webp` files were inspected and contain no emblem or white backing box, so they were left unchanged.

## Round 9 correction — photoreal marquee bulbs

`marquee-bulb-lit.webp` and `marquee-bulb-unlit.webp` were generated separately with OpenAI's built-in image tool (`gpt-image-2`) as front-on transparent cutouts. Untouched sources are `reference/_work/generated/marquee-bulb-lit.png` and `reference/_work/generated/marquee-bulb-unlit.png`; exact prompts are in `reference/_work/generated/marquee-bulb-prompts.txt`. Delivery processing only resizes each to 128×128, strips metadata, and encodes WebP.

## Ghost-halo correction

The four `chip-*-near.webp` derivatives and `coin-near.webp` were rebuilt from their clean transparent source faces with a reduced ImageMagick Gaussian blur (`0x2.6`). This removes the previous wide near-field alpha fringe while retaining baked depth softness. No generative model or new artwork was used.
