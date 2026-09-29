# Gate C gpt-image-2 prompts

All new raster source art in this folder was created with OpenAI's built-in image generation tool (`gpt-image-2`). Existing Gate B sources retain their prompts in `public/assets/mock/SOURCES.md` and the adjacent files under `reference/_work/generated/`.

## Scott expression sheet

Use case: identity-preserve. Asset type: slot-machine character animation sheet. Input image: approved Scott medallion as the edit target and identity anchor. Create one clean horizontal three-panel sprite sheet of the exact same Scott portrait and exact same gold-rimmed red-velvet medallion. Panel 1 has eyelids half closed with the same friendly expression. Panel 2 has eyes fully closed in a natural blink with the same expression. Panel 3 has eyes open with a bigger excited winning smile. Preserve identity, facial proportions, hair, beard, tuxedo, bow tie, lighting, red velvet, gold ring, pose, scale, camera and composition. No text, logos, watermark, extra objects or panel borders.

## Fiona expression sheet

Use case: identity-preserve. Asset type: slot-machine character animation sheet. Input image: approved Fiona medallion as the edit target and identity anchor. Create one clean horizontal three-panel sprite sheet of the exact same Fiona portrait and exact same gold-rimmed red-velvet medallion. Panel 1 has eyelids half closed with the same poised smile. Panel 2 has eyes fully closed in a natural blink with the same expression. Panel 3 has eyes open with a bigger excited winning smile. Preserve identity, facial proportions, black hair, red velvet gown, earrings, makeup, lighting, red velvet, gold ring, pose, scale, camera and composition. No text, logos, watermark, extra objects or panel borders.

## Gia expression sheet

Use case: identity-preserve. Asset type: slot-machine character animation sheet. Input image: approved Gia medallion as the edit target and identity anchor. Create one clean horizontal three-panel sprite sheet of the exact same Gia portrait and exact same gold-rimmed red-velvet medallion. Panel 1 has eyelids half closed with the same poised expression. Panel 2 has eyes fully closed in a natural blink with the same expression. Panel 3 has eyes open with a bigger excited winning smile. Preserve identity, facial proportions, long black hair, red velvet gown, earrings, makeup, lighting, red velvet, gold ring, pose, scale, camera and composition. No text, logos, watermark, extra objects or panel borders.

## Keith expression sheet

Use case: identity-preserve. Asset type: slot-machine mascot animation sheet. Input image: approved Keith cat medallion as the edit target and identity anchor. Create one clean horizontal three-panel sprite sheet of the exact same Keith mascot and exact same gold-rimmed red-velvet medallion. Panel 1 has eyelids half closed with the same cheerful expression. Panel 2 has eyes fully closed in a natural blink with the same expression. Panel 3 has eyes open with a bigger delighted winning smile. Preserve mascot identity, grey-and-white fur markings, facial proportions, ears, red casino visor, black bow tie, lighting, red velvet, gold ring, pose, scale, camera and composition. No text, logos, watermark, extra objects or panel borders.

## Bokeh overlay

Use case: stylized-concept. Asset type: transparent slot-game bokeh overlay. Create restrained, sparse warm casino light specks and soft lens bokeh for Trust Royale. Use photorealistic optical bokeh with a premium finish, sparse small and medium light points around the edges, and a mostly clear centre. Use warm champagne gold with faint deep-red reflections. Require genuine transparency and soft alpha edges. No text, logos, objects, roulette, cards or watermark.

## Curtain

Use case: stylized-concept. Asset type: transparent slot-game side curtain layer. Create one luxurious deep burgundy-red velvet theatre curtain pulled open toward the left edge, with a polished antique-gold rope tieback and rich realistic folds. Use a tall portrait cutout with the curtain anchored along the full left edge, top swag and lower folds visible, and the right side transparent. Use restrained warm Monte Carlo lighting. Require genuine transparency and clean alpha edges. No stage, people, text, logos, roulette, flying objects or watermark.

## FX atlas

Use case: stylized-concept. Asset type: slot-game FX atlas. Create a clean two-by-two atlas with four separate premium casino effects: top-left, a small eight-point champagne-gold sparkle; top-right, celebratory red, gold, navy and cream confetti; bottom-left, a soft circular warm-gold halo glow; bottom-right, a narrow diagonal warm spotlight beam with faint dust motes. Use photorealistic optical effects and polished game VFX in the Monte Carlo Velvet direction. Require genuine transparency, restrained bloom, generous padding and no overlap. No text, logos, chips, coins, roulette or watermark.

## QA round 1 — bilateral blink corrections

Each approved idle medallion was used as the sole edit target in a separate `gpt-image-2` call. The following shared prompt was used, with the subject-specific invariants listed below:

> Use case: identity-preserve. Asset type: slot-machine character blink correction sheet. Input image: the approved idle medallion as the sole edit target and identity anchor. Create one clean horizontal two-panel sheet of the exact same portrait in the exact same gold-rimmed red-velvet medallion. In the left panel, make both eyes equally half-closed with perfectly matched eyelid closure. In the right panel, make both eyes fully closed with matching eyelid seams. Both eyes must change together; no wink or asymmetric closure. Change only the eyelids. Preserve identity, facial proportions, expression, costume, pose, lighting, red velvet, gold ring, scale, camera, and composition. No text, logos, watermark, extra objects, or panel borders.

- Scott: preserve his hair, beard, tuxedo, and bow tie.
- Fiona: preserve her black hair, gown, earrings, and makeup.
- Gia: preserve her lips, long black hair, gown, earrings, and makeup.
- Keith: preserve his grey-and-white fur markings, mouth, visor, and bow tie; show no visible iris in either fully closed eye.

The untouched outputs are `qa-round1-{scott,fiona,gia,keith}-blink-sheet.png`. Delivery processing only splits each two-panel sheet into equal 887×887 frames, resizes them to 512×512, and encodes them as WebP.

## QA round 1 — deterministic SPIN and medallion-frame renders

These corrections are not generated-image prompts. `scripts/render-gate-c-spin.mjs` renders the approved live Gate B CSS treatment in Chromium. The three SPIN states share the same red radial dome, upper highlight, deep inset shading, gold bezel, and `SPIN` label. The raised state is bright and elevated; the pressed state is smaller, lower, darker, and has less highlight; the disabled state is desaturated and dimmed. The same script renders an empty polished-gold medallion rim with a transparent centre for `sym.frame`.
