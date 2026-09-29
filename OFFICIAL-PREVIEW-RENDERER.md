# Official preview renderer — DeckLab 1.0.8-alpha.8

DeckLab 1.0.8 changes the canonical `DeviceSurface` from a purely CSS-drawn hardware shell to a layered renderer for supported Elgato devices:

1. **Official hardware artwork layer** — Elgato's CC BY 4.0 device preview image.
2. **Canonical control geometry** — the same control coordinates used by Preview, Build Profile, and compatibility thumbnails.
3. **Live content layer** — icons, animation, titles, states, touch/Infobar layouts, and dial feedback.
4. **Interaction/editor layer** — click, wheel, drag/drop, selection, empty-slot and QA hit zones.

The hardware image has `pointer-events: none`; it never owns interaction. All behavior continues to come from DeckLab's canonical control model. This keeps Preview and Build Profile geometrically identical while dramatically improving visual fidelity.

## Artwork-backed devices in alpha.8

- Stream Deck / MK.2 (black)
- Stream Deck Mini
- Stream Deck XL
- Stream Deck + (black)
- Stream Deck + XL
- Stream Deck Neo (black)
- Stream Deck Studio

Devices without a suitable asset continue to use DeckLab's canonical CSS hardware renderer. GALLEON intentionally uses Elgato's supplied close-up of the embedded Stream Deck module because that is the relevant interactive surface for DeckLab.

## Why the geometry still exists

The preview image is visual presentation, not layout authority. Canonical geometry remains necessary for:

- hit testing and drag/drop;
- SDK coordinates;
- compatibility analysis;
- responsive scaling;
- non-artwork devices;
- automated geometry regression tests.

If an artwork file is unavailable, the same controls therefore fall back to the synthetic shell rather than losing functionality.

## License

See `THIRD-PARTY-NOTICES.md` and `assets/elgato/ATTRIBUTION.md`.
