# Unified Device Surface — DeckLab 1.1.2-alpha.11

DeckLab 1.1.0 removes workspace-owned device geometry.

## Why this refactor exists

Older builds had separate DOM/layout implementations for Device Preview, Profile Lab, and compatibility thumbnails. They shared device metadata but could still drift visually. A device correction therefore risked being fixed in one workspace and remaining wrong in another.

1.0.6 makes `device-surface.js` the canonical source for:

- device definitions;
- physical/body canvas dimensions;
- key coordinates and pitch;
- dial coordinates;
- Stream Deck + / + XL touchscreen coordinates;
- Neo Infobar and Touch Point coordinates;
- SCIMITAR, GALLEON, Pedal, and Studio hardware-specific surfaces;
- uniform responsive scaling.

## One surface, different interaction layers

The geometry renderer creates the same surface in three modes:

- **Preview** — demo state, click/wheel interactions, animated/static visual preview.
- **Build profile** — drag/drop slots, placement selection, Property Inspector, live action contexts.
- **Compatibility** — read-only miniature using the same normalized coordinates.

The workspace is no longer allowed to decide where a control is. It only supplies the content and behavior placed into each canonical control slot.

## Coordinate model

Each device has one logical face canvas. Physical devices use millimetre-backed chassis dimensions when available. Internally calibrated control positions are stored in the same coordinate space. Virtual/mobile/display targets use a stable logical canvas.

The renderer converts each control rectangle into percentages of the face canvas. The browser can therefore shrink or enlarge the whole surface uniformly without independently stretching buttons, gaps, touch displays, or dial rows.

## Geometry regression contract

For a given device target, Preview, Build, and Compatibility must return the same normalized control rectangles. Only presentation scale and interactivity may differ.

`DeckLabSurface.snapshot(deviceKey)` exposes the canonical canvas and rectangles for regression tests.

Examples of invariants:

- Mini and MK.2 use the same calibrated physical key size.
- Stream Deck + touch and dial controls stay anchored to the same face coordinates in Preview and Build.
- Studio remains 2×16 with end encoders in every workspace.
- SCIMITAR remains a 4×3 side Key Slider in every workspace.
- Neo Infobar and Touch Points use one lower-row geometry everywhere.

## UI simplification

The top-level navigation now presents **Device Studio** instead of separate Device Preview and Profile Lab concepts. Within Device Studio:

- **Preview** opens the clean interactive simulator.
- **Build profile** opens the editing layer around the same canonical device model.

The old Profile workspace is retained internally for compatibility with saved navigation/state and existing code paths, but it is no longer exposed as a separate top-level product concept.

## 1.0.8 artwork layer

The canonical surface now supports an optional official artwork layer. Geometry remains authoritative; artwork is a non-interactive visual layer beneath the same controls. This avoids creating a second image-specific renderer and preserves Preview/Build/compatibility consistency.
