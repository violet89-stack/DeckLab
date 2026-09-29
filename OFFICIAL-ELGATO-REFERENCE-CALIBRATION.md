# Official Elgato reference calibration — DeckLab 1.0.8-alpha.8

DeckLab now uses selected Elgato-supplied **device preview assets directly** as the visual hardware layer for supported models. The assets are distributed under **CC BY 4.0**; see `THIRD-PARTY-NOTICES.md` and `assets/elgato/ATTRIBUTION.md`.

The canonical `DeviceSurface` remains authoritative for hit zones, SDK coordinates, responsive scaling, compatibility analysis, and fallbacks. Official artwork is presentation-only and has no pointer interaction of its own.

## Artwork-backed devices

- Stream Deck / MK.2
- Stream Deck Mini
- Stream Deck XL
- Stream Deck +
- Stream Deck + XL
- Stream Deck Neo
- Stream Deck Studio

The supplied GALLEON 100 SD reference is a close-up of its embedded Stream Deck module. DeckLab now uses that close-up directly as the canonical interactive surface, intentionally omitting the unrelated keyboard keys.

## Confirmed artwork / layout surfaces

| Surface | Full asset size | Safe area | Margin |
|---|---:|---:|---:|
| Standard key icon | 144×144 @2x / 72×72 @1x | 112×112 | 16 px |
| Stream Deck Studio key icon | 144×112 @2x / 72×56 @1x | 112×80 | 16 px |
| Encoder segment | 200×100 | 168×76 | 16 px X / 12 px Y |
| Stream Deck + full touch-strip artwork | 800×100 | 768×76 | 16 px X / 12 px Y |
| Stream Deck + XL full touch-strip artwork | 1200×100 | 1168×76 | 16 px X / 12 px Y |
| Neo Infobar artwork surface | 248×58 | 232×42 | 8 px X / 8 px Y |

Stream Deck SDK custom-layout coordinates remain **200×100 per Encoder segment** and **232×50 for a Neo Infobar layout**. The Neo 248×58 figure is the artwork/display surface, not a replacement for the SDK coordinate system.

## Rendering model

The official image is fitted to the canonical face canvas. Key/touch/dial/Infobar controls are then positioned using the same normalized geometry that Preview, Build Profile, and compatibility already share. Runtime content is inset into the official black LCD regions, while physical bezels and knobs remain visible from the artwork beneath.

Automated checks compare DeckLab's LCD overlay regions with the supplied black display regions; the sampled artwork-backed keys have very high dark-region coverage, confirming the current geometry aligns with the official face previews.

## Calibration status

This is **official-art calibrated**, not physical-hardware certified. Community comparison with real devices is still valuable for physical pitch, viewing angle, animation timing, press behavior, touch behavior, and hardware/host quirks.
