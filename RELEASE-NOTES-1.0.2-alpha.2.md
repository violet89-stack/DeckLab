# DeckLab 1.0.3-alpha.3 — Community Alpha

This patch focuses on **physical preview fidelity**.

## Fixed

Earlier releases normalized device grids to a generic preview width. That caused low-key-count devices such as Stream Deck Mini to display physically oversized keys. 1.0.2 anchors supported first-party hardware to published chassis widths and uses a shared visual key scale instead.

The correction is applied to Device Preview, Profile Lab, and compatibility mini previews. Stream Deck + / + XL touch-strip widths also use their published physical dimensions.

## Important limitation

Manufacturer documentation publishes chassis dimensions and image resolutions, but not every key-cap/LCD aperture measurement. The preview is therefore **spec-calibrated, hardware-unverified**, not a claim of millimetre-perfect CAD accuracy. Community hardware comparisons are especially welcome.

All Community Alpha security behaviour remains unchanged: localhost only, no telemetry, and no automatic third-party plugin execution.
