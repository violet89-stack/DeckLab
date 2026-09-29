# DeckLab 1.0.6-alpha.6 — Unified Device Surface

This release is an architecture and usability consolidation pass.

## Highlights

- Added `device-surface.js`, the single canonical device registry, geometry engine, and hardware renderer.
- Device Studio Preview and Device Studio Build now use the same control coordinates and face geometry.
- Compatibility thumbnails are rendered through the same surface at a smaller uniform size.
- Replaced separate top-level Device Preview / Profile Lab concepts with **Device Studio**, with Preview and Build profile modes.
- Removed duplicate JavaScript hardware-rendering functions for SCIMITAR, GALLEON, Pedal, Studio, Neo, and ordinary Stream Deck layouts.
- Device surfaces now scale responsively as a single unit; controls are positioned in normalized face coordinates rather than independently stretched CSS grids.
- Added `DeckLabSurface.snapshot()` for geometry regression testing.
- Preserved project/profile formats and the safe manual-plugin-launch security model.

## Why this matters

A geometry correction now needs to be made once. Preview, profile editing, and compatibility inspection automatically inherit it.

No persisted DeckLab schema bump is required; project and profile format remain 1.0.
