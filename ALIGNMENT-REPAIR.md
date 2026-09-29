# Alignment diagnosis and repair

The previous overlay geometry used approximate chassis measurements and one generic inset. Those values do not reliably match the cropped image coordinates. In particular, the + family touch-strip heights were substantially too small, dial positions/diameters drifted, and Studio assumed uniform key spacing across its centre gap. Profile dial inputs emitted commands but did not update an angular visual state.

`ARTWORK_CALIBRATION` in device-surface.js now records measured image-pixel landmarks. `controlRect` maps those landmarks to the shared surface, so each workspace uses the same bounds. Source dimensions and origin offsets are applied for white MK.2 and white + images. Nominal physical device measurements remain distinct from these preview-image coordinates.

Key measurements were cross-checked against connected dark LCD regions in the actual PNGs; dial centres and strip bounds were visually checked on the reference images. The regression test records those reference landmarks separately and compares them to rendered DOM bounds. A diagnostic contact sheet was visually reviewed for every image-backed model. Procedural surfaces without a bundled image retain their existing geometry.

Each dial has an independent session angle. A visual increment of 15 degrees per emitted tick makes movement visible; it is a presentation choice, not a claim about hardware detents. Positive ticks turn clockwise; negative ticks turn anticlockwise. The angle persists through redraws, colour changes and mode changes, but is not exported as an action setting. Rotation moves the overlay marker, not the baked-in photograph of the knob. Reduced-motion preferences disable the transition while keeping position feedback.

Validation: 1,148 browser landmark checks over models, colour variants, Build/Live and two rendering scales. Separate wheel, arrow, vertical drag, down/up and redraw checks passed, along with the existing device-surface, refinement, unified artwork, creator workflows, studio and protocol browser checks. No physical hardware was connected for this repair.
