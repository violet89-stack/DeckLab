# DeckLab 1.0.8-alpha.8 — Official Device Preview Renderer

This release replaces the synthetic chassis artwork for supported Elgato models with Elgato's own maker device-preview assets, used under **CC BY 4.0**.

## Highlights

- Official image-backed hardware surfaces for MK.2, Mini, XL, Stream Deck +, Stream Deck + XL, Neo, and Studio.
- The same canonical `DeviceSurface` still powers Preview, Build Profile, and compatibility views.
- Live LCD icons/animations, titles, states, touch/Infobar layouts, dial indicators, selection, drag/drop, and hit-zones render above the hardware artwork.
- Hardware artwork is non-interactive (`pointer-events: none`) so it cannot interfere with DeckLab behavior.
- CSS/synthetic fallback remains available for devices without a suitable full-face preview asset.
- GALLEON's official module close-up is bundled as a calibration/reference asset; DeckLab retains the full-keyboard hardware view.
- Added full CC BY attribution and third-party notices.

## Attribution

Selected Stream Deck preview artwork is provided by **Elgato** and used under the **Creative Commons Attribution 4.0 International** license:
https://creativecommons.org/licenses/by/4.0/

DeckLab modifies presentation through resizing, compositing, live-content overlays, and interactive/editor layers. This use does not imply endorsement by Elgato or CORSAIR.
