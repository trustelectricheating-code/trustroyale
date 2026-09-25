# Feature Specification: Trust Royale — Branded Slot Machine Promo Game

**Feature Branch**: `001-trust-royale-slots`
**Created**: 2026-09-25
**Status**: Draft
**Input**: User description: "Casino-style slot machine game hosted on Vercel. Visitors land on a full-screen page (phone and desktop) and play a realistic, heavily animated, gold-and-red slot machine called Trust Royale. Reels contain animated faces of real people (Scott, Fiona, Gia), the cat mascot Keith, the Neos emblem and never-winning filler symbols (cherry, 7, sweets). Specific face combinations award order discounts (10–20%); everything else asks the player to spin again. Winners claim by phone or a form; leads are saved in Neon then sent to SharpSpring. 3 spins per customer. Spin is a button, not a lever. Paytable shown at the top. Floating casino chips levitate until the player presses Play, then fall. Casino lights, casino sounds. No Chinese styling. Odds are pure random. Delivery is phased: mood board first, then look-and-feel, then all assets in order, before the game is built."

## Clarifications

### Session 2026-09-25 (owner answers and reference review)

- Fiona = `reference/fiona and scott headhsots.zip` → `1.png` (woman in red suit). Scott = `2.png` (man in black gilet).
- Keith = the cat mascot in `reference/keith the mascot.png`. Always named **Keith**.
- Neos = the Trust **'T' emblem** (round head dot above a rounded T, "human figure") from `reference/Brand Guidelines.pdf` (Logo page and emblem construction page). It is not a person and has no supplied file, so it must be **rebuilt as a vector** from the construction grid in the brand document. Because it has no eyes, its win celebration is a heat-pulse glow using the brand's concentric-ring motif instead of a blink.
- **Claiming a win**: the player either **phones Trust** (number shown in the win popup with their win reference) or **fills in a form** on the site. Every form submission is saved to a **Neon Postgres** database first so no lead is ever lost, then forwarded to **SharpSpring CRM**. If SharpSpring is unavailable the lead stays in Neon and is retried.
- **Spins**: **3 spins per customer** from the moment they open the link. If all 3 lose, the player is offered **one bonus "Last Chance" spin** (once only). If that also loses, the game ends with a thank-you.
- **Terms**: vouchers are **one per order**. Privacy policy, full terms, claim phone number and SharpSpring details are added at the end of the project.
- **Hosting**: Vercel **Hobby (free)** plan. This is not a public launch; the owner upgrades manually if needed.
- **Paytable v2**: Gia joins Scott, Fiona and Keith as an eligible face in the two-plus-one rule. Scott × 3, Fiona × 3 and Gia × 3 pay 20%; Keith × 3 pays 15%; any two-plus-one mix of Scott, Fiona, Gia and Keith pays 15%; Keith × 2 + any other symbol pays 15%; Neos × 3 pays 10%. Everything else loses. Owner corrections: "please note there is no 25% off the highest is 20% off", "3 keith is also 15% otherwise pricing table is good", and Keith counts in the two-plus-one rule, so Scott × 2 + Keith pays 15%.
- Brand = Trust Electric Heating ("heating for humans"). Palette sampled from the brand PDF: primary red `#E81E2C`, deep red `#B91526`, dark red `#8C111E`, navy `#233073`, grey `#6D7176`, white. Casino gold is added on top of this palette.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Spin and win a discount (Priority: P1)

A visitor opens the link on a phone or desktop, sees the Trust Royale machine filling the screen, taps SPIN, watches three reels spin and stop one by one, and either (a) lands a winning face combination and gets a "You've won X% off" popup with a way to claim it, or (b) lands a non-winning combination and is told to spin again.

**Why this priority**: This is the whole product. Without it there is no promo.

**Independent Test**: Open the deployed URL, spin repeatedly, and confirm every result either matches a paytable rule and shows the correct discount, or shows "spin again".

**Acceptance Scenarios**:

1. **Given** the machine is idle, **When** the player taps SPIN, **Then** the reels spin, stop left to right, and the SPIN button is disabled until the result is shown.
2. **Given** the reels land Scott–Scott–Scott, **When** they stop, **Then** all three faces blink and a popup states "You've won 20% off your order".
3. **Given** the reels land Keith–Keith–Keith or Keith–Keith–Cherry (any order), **When** they stop, **Then** a 15% win popup is shown; the three-Keith result also plays the blink animation.
4. **Given** the reels land any combination not in the paytable (e.g. 7–Cherry–Sweets, Scott–Fiona–Gia, or Scott–Keith–Neos), **When** they stop, **Then** a "So close — spin again!" message appears and SPIN re-enables.

---

### User Story 5 — Claim the discount (Priority: P1)

After winning, the player sees their discount and a unique win reference. They either tap to call Trust (quoting the reference) or fill in a short form. The form lead is stored safely and reaches the sales team in SharpSpring.

**Why this priority**: A win that doesn't become a lead is worth nothing to the business.

**Independent Test**: Win (forced reels on a preview deploy), submit the form, and confirm the row exists in Neon with the correct discount and that a matching lead appears in SharpSpring. Repeat with SharpSpring credentials broken: the row is in Neon marked unsynced, then syncs once credentials are fixed.

**Acceptance Scenarios**:

1. **Given** a win popup, **When** the player taps "Call to claim", **Then** the phone dialler opens with the Trust number and the popup keeps showing the win reference.
2. **Given** a win popup, **When** the player submits valid name, phone, email, postcode and consent, **Then** a thank-you message shows and the lead is saved with the server-verified discount.
3. **Given** SharpSpring returns an error, **When** the lead is submitted, **Then** the player still sees success, and the lead is retried later from Neon.
4. **Given** someone posts a form with a made-up spin ID or discount, **When** the server checks it, **Then** the lead is rejected (or saved with no discount) because it does not match a real winning spin.

---

### User Story 2 — Arrival spectacle (Priority: P2)

On arrival the player sees a casino atmosphere: chasing marquee lights spelling TRUST ROYALE, casino chips levitating in the air, and a PLAY button. Pressing PLAY starts ambient casino sound, the chips drop and scatter, and the machine becomes active.

**Why this priority**: It is the "wow" that makes people play and share, but the game functions without it.

**Independent Test**: Load the page; chips hover and bob with no interaction; press PLAY; chips fall with gravity and sound begins.

**Acceptance Scenarios**:

1. **Given** the page has loaded, **When** the player does nothing, **Then** chips float indefinitely and lights animate.
2. **Given** the chips are floating, **When** the player presses PLAY, **Then** chips fall off-screen or pile at the bottom, and ambient audio starts.
3. **Given** audio is playing, **When** the player taps the mute control, **Then** all sound stops and the choice persists on reload.

---

### User Story 3 — Understand the prizes (Priority: P2)

At the top of the screen the player can read what wins what, shown with face icons and percentages, without leaving the game.

**Why this priority**: Players must know the odds of reward exist before spinning.

**Independent Test**: Visually verify the paytable at top on portrait phone and landscape desktop, every paytable row readable.

**Acceptance Scenarios**:

1. **Given** portrait phone, **When** the page loads, **Then** a compact paytable is visible above the reels (expandable for detail).
2. **Given** a win, **When** the result shows, **Then** the matching paytable row highlights.

---

### User Story 4 — Phased design sign-off (Priority: P1, process)

The owner reviews, in order: (1) a mood board, (2) a full-screen visual mock of the game, (3) a board of every asset, before the playable build. Each is a Vercel preview URL.

**Why this priority**: The owner explicitly requires seeing mood, look and assets before development.

**Independent Test**: Each phase produces a URL the owner can open on a phone and a desktop.

---

### Edge Cases

- Player spins with sound blocked by the browser (no gesture yet) — PLAY gesture unlocks audio; game must work silently.
- Very tall phones (20:9), short landscape phones, ultrawide desktops, iPad — machine must fill the screen without letterbox bars, cropping only decorative background.
- Reduced-motion preference — lights and chips calm down; spins still resolve.
- Network failure during a spin — reels stop on a "spin again" state and show a retry message; never show a false win.
- Player refreshes after a win — the win and claim options are still shown (server session + local copy).
- Player reloads or opens the link again — spins left stays the same (counted server-side against their session), not reset to 3.
- Player clears cookies / uses another browser — they get a new 3 spins. Accepted risk for v1; a soft per-IP daily cap limits abuse. The cap is set by `DAILY_SESSIONS_PER_IP` (default 20; `0` turns it off) so it can be raised if players on shared IPs (offices, mobile networks) are blocked. Players who hit it see "Come back tomorrow".
- Player wins on spin 1 or 2 — see FR-014: play stops at the first win.
- Player uses all 3 spins without winning — a "Last Chance!" screen offers one bonus spin. If the bonus spin loses too, a final thank-you screen shows (no discount).
- Small phones (320×568): the page never scrolls, but the win popup and claim form scroll inside the popup so every field, the consent checkbox and the submit button stay reachable.
- Same person submits the form twice for one win — stored once (one lead per winning spin).
- SharpSpring API down or slow — lead kept in Neon, retried by a scheduled job; the player is never shown an error because of the CRM.
- Player tries to tamper with the result in the browser — the prize must be decided server-side.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST run as a single full-screen page with no scrollbars on phone (portrait and landscape) and desktop, filling the viewport edge to edge.
- **FR-002**: The machine MUST have three reels showing a 3-row window with one horizontal payline (middle row).
- **FR-003**: Reel symbols MUST be: Scott, Fiona and Gia (person/face symbols); Keith (cat mascot face symbol); Neos (the Trust 'T' emblem, rebuilt as vector art); and Cherry, Seven and Sweets (filler symbols that never win). Gia's `reference/gia.png` is reference/seed only; shipped Gia art MUST be a gpt-image-2 casino medallion generated under the same rules as Scott and Fiona.
- **FR-004**: Wins MUST be evaluated on the payline, order-independent, using this paytable (highest match wins, one prize per spin):

  | Combination | Discount |
  |---|---|
  | Scott × 3 | 20% |
  | Fiona × 3 | 20% |
  | Gia × 3 | 20% |
  | Keith × 3 | 15% |
  | Two of one face + one different face, among Scott, Fiona, Gia and Keith | 15% |
  | Keith × 2 + any other symbol | 15% |
  | Neos × 3 | 10% |
  | Anything else | Spin again |

  Precedence for the overlapping 15% rows is: exact triples first, then Keith × 2 + any other symbol, then the general two-plus-one face rule. For example, Keith–Keith–Scott is recorded as the Keith × 2 rule; Scott–Scott–Keith is recorded as the two-plus-one rule. Both pay 15%, and each outcome is counted once.

- **FR-005**: Three-of-a-kind face wins (Scott, Fiona, Gia and Keith) MUST trigger an eye-blink animation on all three faces plus a win popup. Scott × 3, Fiona × 3 and Gia × 3 pay 20%; Keith × 3 pays 15% while keeping the same blink treatment. Three Neos MUST trigger a heat-pulse animation (concentric rings radiating from the emblem, as in the brand guidelines) plus the popup. Two-plus-one person wins and Keith × 2 wins MUST trigger a glow/celebration on the contributing symbols plus the popup.
- **FR-006**: Spinning MUST be triggered by a SPIN button (no lever). Keyboard (Space/Enter) MUST also spin on desktop.
- **FR-007**: Outcomes MUST be decided by the server with pure random reels: each reel lands on each of the 8 symbols with equal chance, using a cryptographic RNG. (≈ 10.35% win chance per spin, ≈ 35.41% across 3 spins + the bonus spin.)
- **FR-008**: The paytable MUST be displayed at the top of the screen.
- **FR-009**: The title "TRUST ROYALE" MUST appear in an animated light-bulb marquee.
- **FR-010**: Casino chips MUST levitate on arrival and fall when PLAY is pressed.
- **FR-011**: Casino audio MUST include ambient room noise, reel spin, reel stops, button press, win fanfare and chip clatter, with a mute toggle.
- **FR-012**: Visual language MUST be gold and red casino (Las Vegas / Monte Carlo), built on the Trust brand reds, with a realistic cabinet (metal, glass, bulbs, reflections). No Chinese iconography or lettering.
- **FR-013**: The win popup MUST show the discount, the line "One voucher per order", a unique win reference (e.g. `TR-7K3F`), a "Call to claim" button (`tel:` link to the Trust number) and a "Claim online" form.
- **FR-014**: Each customer MUST get **3 spins** plus, only if all 3 lose, **one bonus Last Chance spin**, counted server-side from their first visit (session cookie). Play MUST stop at the first win (one prize per customer). A spins-left counter MUST be visible.
- **FR-017**: The claim form MUST collect name, phone, email, postcode and marketing consent (UK GDPR: consent checkbox unticked by default, privacy notice link). Fields are validated on client and server.
- **FR-018**: Every submitted lead MUST be written to Neon Postgres before any CRM call. The discount stored MUST come from the server's record of the winning spin, never from the form.
- **FR-019**: Leads MUST be sent to SharpSpring CRM (create lead, with discount, win reference and source "Trust Royale"). Failed sends MUST be retried automatically until they succeed or are flagged for manual follow-up after repeated failure.
- **FR-020**: Phone claims MUST be verifiable: staff can look up a win reference to see discount and whether it was already claimed.
- **FR-015**: The game MUST respect `prefers-reduced-motion`.
- **FR-016**: The site MUST deploy to Vercel from the `trustelectricheating-code/trustroyale` GitHub repo.

### Key Entities

- **Symbol**: a reel icon (id, display name, kind face/filler, art frames).
- **Paytable rule**: a combination pattern and its discount.
- **Spin result**: the three landed symbols, matched rule (or none), discount, win reference.
- **Player session**: one visitor, identified by a signed cookie; spins used (max 4: 3 regular + 1 Last Chance bonus), win if any.
- **Spin**: one server-decided spin tied to a session; result and discount.
- **Win reference**: short human-readable code tied to a winning spin, used on phone and form.
- **Lead**: claim form submission tied to a winning spin; CRM sync status.
- **Asset**: any image, animation or sound file, tracked with source and licence.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: First interactive screen appears within 3 seconds on a mid-range phone over 4G.
- **SC-002**: Animation holds a steady 60 fps on a 2021-era mid-range phone (e.g. iPhone 12, Pixel 6) during spin and win.
- **SC-003**: 100% of spin results shown match the paytable (verified by automated test over all 512 symbol combinations).
- **SC-004**: No blank bars or scrollbars at any viewport from 320×568 to 3440×1440.
- **SC-005**: Owner approves mood board, visual mock and asset board before game logic work starts.
- **SC-006**: 100% of submitted claim forms are stored in Neon; ≥ 99% appear in SharpSpring within 15 minutes while SharpSpring is reachable. During a SharpSpring outage, pending leads reach SharpSpring within 24 hours of it recovering (within 15 minutes if the optional external pinger is enabled). This fits the Vercel Hobby limit of one cron run per day.
- **SC-007**: No session can play more than 4 spins (3 + 1 bonus) or win more than once.

## Assumptions

- Players do not pay to play; this is a free promotional game (keeps it outside UK gambling licensing).
- Odds are pure random (see FR-007); no rigging or weighting.
- Filler symbols (cherry, seven, sweets) and all casino décor are sourced (CC0/royalty-free or generated), not supplied.
- English only, UK audience, £ where currency appears.
- No user accounts. Personal data is stored only when a winner submits the claim form, in Neon (UK/EU region) and SharpSpring, with consent. Retention periods are set in [data-model.md → Data retention](./data-model.md#data-retention-uk-gdpr); the lead retention period is confirmed by the owner at launch.
- Trust already has a SharpSpring account with API access (account ID + secret key) and a phone line for claims.
