# DeckLab 1.0.3-alpha.3 — Device Face Geometry Calibration

This alpha focuses on visual fidelity in **Device Preview**.

## Fixed

- Replaced the generic stacked-control renderer with per-family face geometry for first-party Stream Deck hardware.
- Corrected Stream Deck + chassis width from 138 mm to the current published 140 mm specification.
- Added explicit chassis height, key pitch, touch-strip height, dial diameter, and vertical control anchors for Stream Deck + and Stream Deck + XL.
- Added the two Neo Touch Points to Device Preview and positioned the Infobar as part of one calibrated lower control row.
- Calibrated MK.2, Mini, XL, and Neo key-grid placement against their published outer dimensions instead of relying on generic padding.
- Gave Stream Deck Scissor Keys a flatter key treatment instead of rendering it identically to MK.2.
- Hid simulator-only dial labels inside calibrated physical chassis so they no longer distort device height.

## Calibration status

Outer dimensions and touch-strip dimensions are specification-backed. Physical key-cap size, dial diameter, and several internal offsets are visually calibrated because Elgato does not publish every face measurement. Community hardware measurements remain welcome.
