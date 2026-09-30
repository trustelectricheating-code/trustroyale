# Owner Feedback Round 1 Delivery Report

Branch: `phase-d-game`

Scope: owner feedback items 1–17, including 12a and the 15A/15C/15D corrections
Date: 2026-09-30

## Delivery status

All requested Round 1 implementation, automated checks, responsive evidence, and final evidence captures are complete. Later owner directions were treated as superseding requirements:

- Item 9 superseded item 3's cabinet panel layout.
- Item 11 superseded item 10's featured-prize card and adjusted items 3 and 8.
- Item 15B replaced item 11's lamp-style try tracker with three physical chips and a gold Last Chance chip.
- The 15A update replaced the rejected MFCC music track with the owner-selected Casino VIP Music Game track.
- The 15C correction replaced the first Keith pose set with seven corrected, full-body croupier poses.
- The 15D clarification established that the white-disc fault affected the four face symbols and required transparent, single-rim face medallions.

No deployment or push was performed. No `vercel`, `neonctl`, or Neon migration command was run, and `.env.local` was not accessed. Port 5173 was not changed or stopped.

## Items 1–7

### 1. Soundscape

The soundscape now uses a streamed music bed plus a compact effects sprite. Music starts on the first intro gesture, continues into the game without restarting, respects the persisted mute setting, sits softly under effects, and ducks during win music. Effects remain gesture-gated and do not contribute to the pre-PLAY transfer.

Final sound set:

- Background music: owner-supplied “Casino VIP Music Game Casino Music 3” from Pixabay, processed into a 118-second crossfaded loop.
- Reel loop: the owner-supplied Freesound Community slot-machine recording from Pixabay, trimmed, normalized, and crossfaded into a 3.05-second loop.
- Chip use: the owner-supplied Freesound Community coin sound from Pixabay.
- Button, stop, near-miss, win, payout, chip-clack, and popup sounds: CC0 Kenney UI Audio, Impact Sounds, Interface Sounds, Music Jingles, and Casino Audio assets.

Full source URLs, authors, licences, processing notes, and sprite mappings are recorded in `public/assets/audio/LICENSES.md`. The music is streamed through Howler with `html5: true`, so the 6.7 MB source file never blocks intro or game startup.

Final audio sizes:

- `ambient-loop.webm`: 1,034,655 bytes, Opus at approximately 64 kbps.
- `ambient-loop.mp3`: 1,416,716 bytes, MP3 at approximately 96 kbps.
- `sfx-sprite.webm`: 180,932 bytes.
- `sfx-sprite.mp3`: 209,372 bytes.
- Total shipped audio: 2,841,675 bytes, approximately 2.8 MB.

### 2. Original physical spin motion

The spin concept is a three-stage premium mechanical action: a short anticipation wind-up, open-ended high-speed free rotation while the server chooses the result, then independent left-to-right drum braking with staggered clunks, overshoot, and spring-settle. A near miss adds a controlled tease before the final stop. The reels always settle on the exact server-provided middle-row strip. Reduced-motion users receive a short free-spin and simplified settle rather than the full motion sequence.

### 3. Raised SPIN control and machine readouts

The stuck-looking control was replaced by a large raised, illuminated SPIN control with idle glow, press travel, spring-back, and a distinct disabled state. The stale `SPINS LEFT` and `TOP PRIZE` lozenges were removed. Item 9 then superseded the surrounding panel layout, and items 11 and 15 replaced every duplicate count with the single server-driven chip tray.

### 4. Transparent medallion backgrounds

The original blanket circular mask was narrowed to face symbols only, then removed entirely after the 15D diagnosis. The final face files carry their own true alpha and single gold rim. Nothing outside a medallion rim is visible, and non-circular fruit, seven, sweets, and T-chip symbols are never clipped by a face mask.

### 5. T chip and favicon

The former Neos medallion presentation was replaced everywhere with the approved red-and-white casino chip carrying the white Trust/Neos T. The favicon family uses the requested navy-and-white T chip at 16, 32, 48, and 180 px sizes, with explicit links in both entry HTML files and no favicon 404.

### 6. More ambient chips

The slot hall now carries a denser mix of red, navy, gold, and white T chips at varied sizes and depths. Desktop uses roughly twice the original population and mobile roughly 1.5 times the original population. Far chips receive subtle blur, remain clear of reels, controls, and overlays, and only drift or bob in place. Slow-frame fallback still reduces scene cost.

### 7. Landed reels remain visible

Loss, mid-game bank, Last Chance, and game-over messaging now uses compact placement that leaves the reel result and SPIN control visible. Final win presentation is delayed until the winning payline has remained visible for at least 1.5 seconds.

## Items 8–10

### 8. First interaction and one-press play

Input is registered before asynchronous boot work. During boot, the control exposes a clear disabled loading state and `aria-busy`; an early intro action is retained instead of disappearing. Item 11 changed the final flow: the intro is the entry gesture, and the machine opens ready for SPIN with no intermediate PLAY state. Item 13 further constrained queued input so loading replay can only advance the intro and can never generate a spin. A focused SPIN press, touch tap, or the explicit Last Chance “Spin now” action causes exactly one API request.

Automated coverage includes delayed startup, one-press first spin, retry while the result banner is open, Last Chance, keyboard focus, and a real touch context at 390×844.

### 9. Hall-matched hero cabinet

A new hero cabinet was generated from the supplied landscape and portrait slot-hall references. It uses the same deep-red lacquer, polished gold trim, arched illuminated topper, bright reel aperture, lit deck, and jewel detailing as the background machines. Production assets retain the layered Pixi structure: transparent live-reel cut-out, cabinet body, trim, glass, topper, animated bulbs, and dedicated up/down/disabled SPIN states. Trust Royale remains on the belly panel. Exact cabinet and reel-window geometry comes from the approved art rather than hand-guessed placement.

Untouched generations, alpha-edit output, and prompts are retained in `reference/_work/generated/round1-cabinet/`. The final comparison captures are `reference/_work/round1/cabinet-match-*.png`.

### 10. Featured-prize card direction

Item 11 superseded the standalone featured-prize card before final delivery. Its information and accessibility requirements moved into Keith's prize-page overlay: one coherent frame, all seven rules, real symbols, exact paytable meaning, responsive text, a highlighted winning row, and a small in-game Prizes entry point. The broken nested card is not present in the final game.

## Items 11–14

### 11. Keith-hosted intro and the only in-game tracker

Keith now hosts a five-page full-screen introduction over the blurred slot hall:

1. Welcome.
2. Best-of-three rules and Last Chance.
3. All seven prize rules from `src/config/paytable.ts`.
4. Coupon claiming.
5. Three-chip hand-over and “Let's play!” action.

Each page uses a different full-body Keith pose, speech layout, Back/Next/Skip controls, visible sound control, keyboard focus, and screen-reader labels. The first intro interaction unlocks and starts music. The Prizes button and final popup can reopen the prize page, including the highlighted winning rule.

During play, the chip tray is the only try monitor. No stale pill, top-prize readout, or duplicate counter remains.

### 12 and 12a. Best-of-three server and client rules

The server, API contracts, state machine, client, documentation, and tests now implement these rules:

- A 10% or 15% win is banked, but play continues through all three regular tries. Later lower prizes never replace the current best; higher prizes do.
- A 20% outcome ends the game immediately because it is the maximum.
- Last Chance appears only after three regular losses with no prize banked. Any banked win removes the bonus.
- Coupon code and winning reference are hidden during play and revealed only on the final result.
- Reload restores spins remaining, best banked prize, bonus eligibility, and final locked state.
- Try 1 can never land Scott × 3, Fiona × 3, or Gia × 3. The server performs a bounded redraw with a deterministic non-winning fallback. Tries 2, 3, and Last Chance keep the original uniform distribution. This restriction is intentionally absent from player-facing copy.

The existing `sessions.won_spin_id` field now means the best winning spin so far, so no schema change was required. No migration was created or run against Neon.

Exact full-game probabilities with the try-1 restriction are:

- Any prize: `35.02847255886421%`.
- 20% prize: `1.593092278612152%`.

These values follow the eight-symbol uniform model: try 1 samples the 509 non-20% outcomes; later spins sample all 512 outcomes; Last Chance occurs only after three losses.

### 13. Cherry clipping and unsolicited spins

The cherry was clipped because commit `f992e4c` applied a circular medallion mask to every reel sprite. Masks also survived texture swaps, so a fruit could inherit face-only clipping while scrolling. The reel renderer now distinguishes face medallions from every other symbol, and the final transparent face assets need no runtime circle mask. Unit and browser checks cover every symbol and reject blank or clipped payline rendering.

The likely cause of the reported unsolicited spins was the global `window` Space/Enter shortcut. It could treat a stray key after dialog interaction as a spin. That shortcut was removed. Page load, restore, visibility, animation completion, audio callbacks, intro buttons, Continue, Close, and ordinary Enter/Space presses cannot call the spin API. The one-request-per-direct-press browser test includes 10-second idle intervals and dialog-closing paths.

### 14. Three separate curved drums

The reel window now reads as three recessed physical drums, not one flat panel. Each drum has its own cavity, gold separator, top/bottom cylinder shade, edge darkening, central specular band, and inner depth shadow. Off-payline rows continuously squash, shift, and darken as they wrap away from the viewer, including during motion. A glass streak spans the full window while the gold payline and side markers remain clear. Each drum spins and settles independently without changing the server-authoritative middle row.

The evidence capture measured `6.5 FPS` in Playwright's headless software-rendered browser while recording full-resolution PNG frames. This is capture throughput, not production-device animation FPS; synchronous screenshot encoding substantially lowers the sample.

## Item 15

### 15A. Owner audio and final music update

The owner reel and coin files are used in the final sprite. The later owner-selected `reference/casino-vip-music-game-casino-music-3-469380.mp3` replaced the MFCC track completely. The shipped music is the 118-second streamed WebM/MP3 pair listed under item 1. Repeated effects were mixed for warm, soft playback, while mid-game wins use the small jingle and final/20% wins use the larger jingle with payout layer. Music ducks under both.

### 15B. Three chips from Keith

Keith hands over white, red, and navy T chips from an on-screen pose into the tray. Each direct SPIN press activates one chip; after the result it spins, shrinks, dissolves into gold sparkles, and plays the owner's coin sound. Server `spinsLeft`, `isBonus`, and session state drive the tray, including reload. Three regular losses summon Keith with one gold Last Chance chip. A small `Best: 15%`-style label appears beside the tray when a prize is banked.

The former mobile count became stale because separate machine and readout-based displays represented the same state at different points in the transition and could overlap in compact layouts. Both were removed. One server-driven tray now controls visuals and the accessible “N chips left” label at every viewport.

### 15C. Corrected full-body Keith poses

Seven final poses were generated: wave, point, prizes, chips, good luck, celebrate, and Last Chance. Every pose uses the same red dealer visor with black brim, black bow tie, deep-red and black waistcoat, white shirt front, gold buttons, Union Jack medallion, green eyes, and plush likeness as `faces/keith-idle.webp`.

Every final pose was inspected for exactly two arms, two legs, and one tail; correct visor, bow tie, and waistcoat; correct chip colours; complete uncropped body; and transparent corners. The chips pose carries exactly three T chips—white, red, and navy—and the Last Chance pose carries one gold T chip. Rejected generations remain in `reference/_work/generated/round1-keith/rejected/`, untouched final generations and prompts remain beside them, and the labelled review sheet is `reference/_work/round1/keith-poses-sheet.png`.

### 15D. Face white-disc bug and single-rim rework

The four face sprites were being obscured by visible white `Graphics` mask objects added to the reel and cabinet trees. Those graphics rendered as discs instead of acting only as invisible alpha masks. Removing the runtime mask objects fixed the white-circle fault.

All 16 Scott, Fiona, Gia, and Keith animation frames were then rebuilt from the approved likenesses as pixel-aligned, transparent WebP medallions. Each has one gold rim and no red square or oversized second frame. The same assets are used by reels, intro prizes, the prize overlay, and popup. Asset tests reject `Texture.EMPTY` and `Texture.WHITE`; Playwright pixel tests verify faces render and do not become blank white discs. Scott, Keith, and the red T chip are captured together in `face-payline-scott-keith-t-*.png`.

## Items 16–17

### 16. Responsive release gate

The full intro-to-final flow passed at all 11 required display sizes:

- Phones: 320×568, 375×667, 390×844, 430×932, and 844×390 landscape.
- Tablet: 768×1024 and 1024×768.
- Desktop: 1366×768, 1440×900, 1920×1080, and 2560×1440.

For every size, Playwright checked viewport overflow and scroll, text containment, complete Keith and speech-bubble visibility, reel/SPIN/tray separation, exact chip counts, mid-game bank state, final state, and reload. The 110 release-gate images are in `reference/_work/round1/responsive/`.

### 17. Menu audio and synchronized reel startup

Every intro, prize, and result control now plays the soft button sound. On the first intro click, audio is unlocked first, ambient starts, and that same gesture's click is audible. All controls retain the mute setting and have at least a 48×48 px touch target, with larger mobile text for the intended older phone audience.

SPIN now starts free reel motion and the reel loop in the same press tick, while `/api/spin` runs in parallel. A delayed-response Playwright test holds the API for two seconds and records both first motion and first sound invocation under 100 ms from the press. Normal motion guarantees at least 700 ms of free spin; reduced motion uses 100 ms. If the request fails, the previous symbols return, free motion stops, the loop sound stops, the error appears, and SPIN re-enables.

## Evidence

`reference/_work/round1/` contains final evidence at 1920×1080, 390×844, and 320×568 for all five intro pages, Keith chip hand-over, cabinet match, idle machine, SPIN control, curved drums at rest and mid-spin, near miss, landed loss, Scott/Keith/T face payline, win line and final popup, highlighted prize overlay, trays with 3/2/1/0 chips, gold Last Chance chip, chip-vanish frames, and the complete best-of-three sequence. `spin-frames/` contains the required 10-frame sequence.

The dedicated evidence suite passed all four cases:

- 1920×1080 evidence flow.
- 390×844 evidence flow.
- 320×568 evidence flow.
- Ten-frame sequence and frame-rate sample.

Capture-only interactions use direct DOM button presses. This avoids Playwright's stability wait on intentionally animated controls without weakening the normal pointer, touch, keyboard, timing, or accessibility interaction tests in the main suite.

## Build, budget, and launch notes

The latest production build remains within both gates:

- JavaScript gzip: 225.3 KB of the 250 KB limit.
- Pre-PLAY transfer: 2.65 MB of the 4 MB limit.

`pixi.js/unsafe-eval` remains imported, while the production CSP still contains no `unsafe-eval`. Production-CSP browser coverage exercises the real preview server.

Launch blocker: `ROYALE10`, `ROYALE15`, and `ROYALE20` remain placeholder coupon codes. Set all three `COUPON_CODE_*` environment variables to real campaign values before launch.

No Neon schema migration is needed for this round. No deployment, push, remote database write, or production configuration change was performed.

Ponytail-lite note: manual screenshots would have been the lazier capture route, but the automated evidence spec was retained because repeatable viewport and state evidence is part of the release gate.
