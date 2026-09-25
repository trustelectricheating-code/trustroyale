# Contract: Asset manifest (`public/assets/manifest.json`)

Single source of truth for every image, animation, font and sound. Used by:
1. the Phase C **asset board** page (`/assets.html`) that shows every asset in order with status, and
2. the runtime loader (PixiJS `Assets` bundles).

## Shape

```json
{
  "version": 1,
  "groups": ["background", "cabinet", "symbols", "faces", "emblem", "fx", "ui", "fonts", "audio"],
  "assets": [
    {
      "key": "face.scott.idle",
      "group": "faces",
      "file": "faces/scott-idle.webp",
      "status": "draft",
      "source": "supplied",
      "licence": "Trust Electric Heating — internal",
      "sourceUrl": null,
      "notes": "Cut from reference/2.png"
    }
  ]
}
```

Field rules are in [data-model.md → AssetEntry](../data-model.md#assetentry).

## Required asset list (the order the board displays)

| # | Group | Keys | Source plan |
|---|---|---|---|
| 1 | background | `bg.portrait`, `bg.landscape`, `bg.bokeh` (light specks), `bg.curtain.left/right` | generated |
| 2 | cabinet | `cabinet.body`, `cabinet.glass`, `cabinet.reelWindow.mask`, `cabinet.trim.gold`, `cabinet.marquee` (TRUST ROYALE panel), `cabinet.bulb.on/off`, `cabinet.spinButton.up/down/disabled` | generated or rendered, layered |
| 3 | symbols | `sym.cherry`, `sym.seven`, `sym.sweets` (each + `.shine`), `sym.frame` (gold medallion rim) | generated / CC0, restyled to match |
| 4 | faces | `face.{scott,fiona,keith}.{idle,half,closed,win}` (12 files) | supplied photos / mascot sheet, retouched |
| 4b | emblem | `emblem.neos.svg` (master vector), `emblem.neos.idle` (gold-on-red medallion render), `emblem.neos.pulse` (concentric heat rings overlay) | **built**: redrawn from the emblem construction page of `reference/Brand Guidelines.pdf` (circle head, rounded crossbar, rounded stem) |
| 5 | fx | `fx.chip.{red,gold,navy,white}` (4 colours × 2 angles), `fx.coin`, `fx.sparkle`, `fx.confetti` atlas, `fx.glow`, `fx.lightbeam` | generated / CC0 |
| 6 | ui | `ui.paytable.panel`, `ui.popup.win`, `ui.popup.retry`, `ui.mute.on/off`, `ui.play`, `logo.trust.white` | custom |
| 7 | fonts | display (Art Deco / serif for title), UI rounded sans | Google Fonts (OFL) |
| 8 | audio | `sfx.ambient.loop`, `sfx.button`, `sfx.reel.loop`, `sfx.reel.stop.{1,2,3}`, `sfx.nearmiss`, `sfx.win.small`, `sfx.win.big`, `sfx.chips`, `sfx.whoosh` | CC0 libraries |

## Validation

A build script fails if any asset has `status: needed` in a production build, if any non-supplied asset lacks `licence`, or if any referenced file is missing.
