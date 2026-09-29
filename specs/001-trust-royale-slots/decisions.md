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

## Gate B — approved (2026-09-29)

The owner approved the Gate B mock and asked to move to the next stage once the prize table was fixed. Owner's words: "other than that you can move to the next stage".

Final Gate B changes made before sign-off:

- The spinning roulette wheel is gone. The background is now a blurred slot-machine hall: rows of slot machines on a casino floor behind the main cabinet, with nothing moving in it. Owner's choice: "a row of blurred slot machines on the casino floor behind the main machine, like a real slot hall".
- Nothing flies in or out of the screen. Chips, coins and cards only drift gently in place: 16 items on desktop and 9 on phones, roughly 40% coins.
- The prize table is a featured-prize carousel that shows one rule at a time, with a "See all prizes" overlay. Every rule shows real symbols: no "?" or "ANY" discs. The Keith × 2 rule uses a cherry as the example third symbol.
- The prize board uses the same Neos medallion as the reels (`public/assets/mock/neos-medallion.webp`: red enamel, gold rim, cream T). Owner's words: "the t shown in the machine is not the one that is being used so please use that for the prize board as well".
- No text overlaps. Full rule wording is shown on every viewport, and Playwright checks every slide at every viewport for overlap and clipping.

Tasks T014–T018 are complete. Gate C (T019–T031, including T024A for Gia's face frames) starts next.

## Gate C — approved (2026-09-29)

The owner reviewed the asset board locally at `http://localhost:5173/assets.html` and approved every asset. Owner's words: "approve all".

All 74 entries in `public/assets/manifest.json` are now `status: "approved"`, and none is `needed`. The library covers the background, cabinet, symbols, faces (idle, half, closed and win frames for Scott, Fiona, Gia and Keith), emblem, FX, UI, fonts and audio groups. Before sign-off, QA round 1 restored the red SPIN button states, replaced `sym.frame` with an empty gold rim, and corrected every blink so both eyes close together.

Nothing was deployed: T031 was completed as a local review, as agreed. The curtain assets are approved but not used by the current slot-hall scene. Task T031 is complete, and the Foundational phase (T032 onward) starts next.

## Claiming a win: predefined coupon, no form (2026-09-29)

The owner removed the in-game claim form. Owner's words: "leave the form it will be taken care of in another landing page just give them a predefined coupon to claim the discount".

- A win shows a predefined coupon code for its discount tier (10%, 15% or 20%), with a copy button, alongside the win reference. The player redeems it on the separate landing page, which is outside this project.
- The coupon codes are server-side configuration (`COUPON_CODE_10`, `COUPON_CODE_15`, `COUPON_CODE_20`) and are returned only in a winning spin or session response, so they never ship in the client bundle. Until the owner supplies the real codes, the placeholders `ROYALE10`, `ROYALE15` and `ROYALE20` are used and flagged in reports.
- Out of scope from User Story 5: the claim form, lead validation, `POST /api/lead`, SharpSpring sync and its retry cron, the staff phone-claim and CSV export, and `admin.html`. The `leads` table already created by `001_init.sql` stays unused rather than being dropped.
- A returning winner still sees their win, win reference and coupon after a reload, and SPIN stays locked.
