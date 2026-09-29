# Release verification — 1.3.7-alpha.29

All 19 suites below passed in headless Chromium / Node, with the actual Python companion used for its HTTP/WebSocket smoke test. No physical Stream Deck, GALLEON, Studio or Windows GPU validation was performed.

- PASS — `tests-alignment-browser.cjs`
- PASS — `tests-companion-smoke.cjs`
- PASS — `tests-creator-workflows.cjs`
- PASS — `tests-device-surface.js`
- PASS — `tests-dial-display-repair.cjs`
- PASS — `tests-display-artwork.cjs`
- PASS — `tests-display-controls.cjs`
- PASS — `tests-documentation-audit.cjs`
- PASS — `tests-encoder-review.cjs`
- PASS — `tests-galleon-independent.cjs`
- PASS — `tests-live-demo.cjs`
- PASS — `tests-native-profile.cjs`
- PASS — `tests-plugin-catalogue.cjs`
- PASS — `tests-protocol-browser.cjs`
- PASS — `tests-protocol.cjs`
- PASS — `tests-refinement-browser.cjs`
- PASS — `tests-repaired-release.cjs`
- PASS — `tests-studio-browser.cjs`
- PASS — `tests-unified-browser.cjs`

The focused repair suite covers all 16 Encoder action slots (14 physical dials), in Build and Live Preview. It verifies assignment isolation, replacement in both inspectors, occupied library drops, plugin feedback visibility after reassignment, key/wheel/drag/press inputs and profile persistence. GALLEON checks include both rows/columns, region click and keyboard shortcuts, independent active sets, long-hold switching and absence of touchscreen events.

The artwork test explicitly selects the full background before upload, rather than assuming the stale full-screen editor selection that caused the reported bug. The older GALLEON hold test explicitly selects the top sets before testing its top-to-bottom hold, since editing a bottom region now activates it.

## Reference calibration

The supplied PNG canvases measure 800×100 (+), 1200×100 (+ XL), and 200×100 (segment). Illuminated-device references show a glass margin around them. In bundled product-image coordinates:

| Device | Outer glass (x, y, width, height) | Active LCD (x, y, width, height) |
| --- | --- | --- |
| + black, 1024×972 image | 68, 412, 888, 188 | 112, 456, 800, 100 |
| + XL, 1472×1320 image | 100, 688, 1272, 172 | 148, 725, 1176, 98 |

The white + uses its existing doubled-image transform plus four pixels of asset padding. Image-space dimensions are separate from native canvas resolution; the + XL active rectangle keeps the 12:1 full-strip ratio and 2:1 segment ratio. These are image-based calibrations, not physical measurements. Tests verify inset bounds, full/segment ratios and alignment at 100% and 150% zoom.

Visual review covered black/white +, black + XL and all four GALLEON LCD regions. Reference screenshots are included in `verification/1.3.7/`. Existing protocol and hardware coverage status is unchanged.
