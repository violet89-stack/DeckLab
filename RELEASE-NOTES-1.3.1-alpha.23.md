# DeckLab 1.3.1-alpha.23 — Surface alignment and dial feedback

- Calibrated LCD key rectangles to the bundled image pixels for MK.2, Mini, XL, +, + XL, Neo, Studio and Galleon. MK.2 white and + white account for their distinct source size/origin.
- Studio now preserves the larger gap between its two banks of eight columns.
- Corrected + and + XL touch-strip bounds, including the previously shortened display height.
- Corrected dial centres and diameters; one shared rotating indicator replaces the inconsistent old pseudo-element markers.
- Wheel and arrow-key operations visibly turn each dial. Assigned dials also support vertical dragging while pressed; indicators show press feedback and retain their angle through redraws and Build/Live mode changes. Unassigned dials respond visually to wheel and arrow keys without generating plugin actions.
- Colour changes recalibrate all controls, including Neo navigation hit regions. Key artwork now fills the measured LCD glass instead of applying a second generic inset.

Browser verification: 1,148 landmark comparisons across eight image-backed models, all available colour variants, Build/Live Preview, and 75%/150% rendering scales. Interaction checks cover independent wheel/keyboard turns, pointer dragging, press/release, unassigned dials and redraw persistence. Existing studio, artwork, creator and protocol browser regressions pass. This verifies alignment to the bundled images, not real-device timing or physical encoder resolution.
