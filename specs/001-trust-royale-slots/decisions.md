# Owner decisions — Trust Royale

## Gate A — visual direction (2026-09-25)

**Chosen direction: A — Monte Carlo Velvet** (deep red velvet, polished gold, black lacquer, restrained glow).

Owner's words: "i like monte carlo velvet and the chips should have the Neos logo rather than the TR lettering"

Follow-up applied: casino chips carry the Neos 'T' emblem at their centre instead of "TR" lettering. This applies to all chips in Gates B and C and in the final game.

## Image generation (2026-09-25)

The owner-supplied photos of Scott, Fiona, Gia and Keith are **reference images only** and are never shipped as-is. Every raster image in the game (character portraits, medallions, backgrounds and any other artwork) is generated with gpt-image-2 through Codex, using the photos as reference input so each person stays recognisable. Everyone gets a casino look in the Monte Carlo Velvet style (for example evening wear or croupier styling for Scott, Fiona and Gia, and a dapper casino look for Keith). Gia uses `reference/gia.png` as her reference/seed. The Neos emblem and the chips stay as vector SVGs for brand accuracy.

Owner's words: "i wanted the images of scott fiona and the mascot to be taken as refrence and create images using the gpt iage via codex not use the image as is if you need any images use the gpt image 2 to generate it and everyone should have a casiono vibe so use the images as seed and generate assets"

## Mascot name (2026-09-25)

The supplied mascot sheet (`reference/keith the mascot.png`) labels the cat "Tiggles". The owner confirmed the cat is called **Keith** in Trust Royale. Use "Keith" in all copy, paytable rows, file names and prompts.

## Gate B round 3 — realism (2026-09-25)

After seeing the first Gate B mock, the owner asked for a much more realistic look: the slot machine must look like a real, physical replica cabinet, the scene needs floating elements that create a 3D environment, animated SVG effects must be present already in the mock, and a spinning casino (roulette) wheel should appear at the side or in the background.

Owner's words: "slot machine needs look like real replica original this looks really basic and does not contribute to realism I am looking for i also wanted elements floating creating a 3d environment no there as well i wanted animated svg's no there Make it as realistic as possible have the casino spinning wheel on side or the background"

Approach: a 2.5D layered PixiJS scene built from photoreal gpt-image-2 renders (casino hall, roulette wheel, cabinet with a transparent reel window, chips, coins, glossy symbols), with depth-of-field blur, pointer/tilt parallax, floating chips and coins at three depths, a continuously rotating roulette wheel, and animated SVG light effects (chaser bulbs, title shimmer, sparkles, spotlight sweeps, SPIN glow). The right-hand "Neos Club" panel with invented labels is superseded by this redesign.

## Paytable v2 (Gia joins, top prize 20%) (2026-09-25)

Gia joins the reels as a fourth face symbol. `reference/gia.png` is reference/seed only; shipped Gia art is a gpt-image-2 casino medallion generated under the same rules as Scott and Fiona.

Owner's words: "please note there is no 25% off the highest is 20% off" and "3 keith is also 15% otherwise pricing table is good".

| Combination | Prize |
|---|---|
| Scott × 3 | 20% |
| Fiona × 3 | 20% |
| Gia × 3 | 20% |
| Keith × 3 | 15% |
| Two of one face + one different face, among Scott, Fiona, Gia and Keith | 15% |
| Keith × 2 + any other symbol | 15% |
| Neos × 3 | 10% |

Everything else loses with "So close — spin again!" Keith is the cat mascot but counts as an eligible face in the two-plus-one rule; Scott × 2 + Keith therefore pays 15%. Filler symbols never win except as the third symbol in the Keith × 2 rule.

Owner correction: "Keith DOES count in the two-plus-one rule (Scott, Scott, Keith pays 15%)."

## Title placement (2026-09-29)

The owner compared the two round 11 options and chose the belly panel. Owner's words: "the belly one looks cleaner".

The "trust" wordmark (brand red, never overdrawn by bulbs) and gold "ROYALE" sit on a black glass panel set into the lower cabinet, framed by real bulb sprites that run chase patterns. `DEFAULT_TITLE_PLACEMENT` in `src/scene/cabinetArt.ts` is `"belly"`; the topper arch keeps only its own animated bulbs.
