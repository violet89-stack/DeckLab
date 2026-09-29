# DeckLab 1.0.7-alpha.7 — Official Elgato Reference Calibration

This release keeps the unified `DeviceSurface` architecture from 1.0.6 and recalibrates first-party hardware using Elgato-supplied front product renders and artwork guidance.

## Highlights

- Calibrated MK.2, Mini, XL, Stream Deck +, Neo, + XL, Studio, and GALLEON control placement against official Elgato reference imagery.
- Preserved a consistent physical key size across the classic MK.2 / Mini / XL family rather than stretching keys to fill each chassis.
- Corrected Stream Deck + horizontal key pitch and lowered its dial row.
- Corrected + XL face height / dial-row placement.
- Corrected Neo physical Infobar placement while preserving the SDK 232×50 layout canvas.
- Added the official Neo 248×58 artwork surface and 232×42 safe-area metadata.
- Corrected Stream Deck Studio keys to the official rectangular 72×56 artwork aspect.
- Corrected GALLEON's two Encoder feedback regions to approximately 2:1 logical segments rather than treating the entire display as two vertical halves.
- Added official artwork/safe-area metadata for standard keys, Studio keys, Encoder segments, + touch strip, + XL touch strip, and Neo Infobar.
- Added regression tests for all of the above.

The source Elgato product images used for calibration are **not redistributed** in the DeckLab package.
