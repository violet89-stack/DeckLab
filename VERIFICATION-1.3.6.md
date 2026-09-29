# Release verification — 1.3.6-alpha.28

All checks below passed during this repair pass. Browser tests used headless Chromium; companion smoke testing used the actual Python localhost HTTP/WebSocket server. No physical Stream Deck or Windows GPU/compositor test was performed.

- PASS — `tests-documentation-audit.cjs`
- PASS — `tests-repaired-release.cjs`
- PASS — `tests-protocol.cjs`
- PASS — `tests-protocol-browser.cjs`
- PASS — `tests-companion-smoke.cjs`
- PASS — `tests-device-surface.js`
- PASS — `tests-alignment-browser.cjs`
- PASS — `tests-unified-browser.cjs`
- PASS — `tests-studio-browser.cjs`
- PASS — `tests-refinement-browser.cjs`
- PASS — `tests-creator-workflows.cjs`
- PASS — `tests-display-artwork.cjs`
- PASS — `tests-display-controls.cjs`
- PASS — `tests-galleon-independent.cjs`
- PASS — `tests-encoder-review.cjs`
- PASS — `tests-live-demo.cjs`
- PASS — `tests-native-profile.cjs`
- PASS — `tests-plugin-catalogue.cjs`

The six audit probes now pass. New tests cover state/target isolation, requested and invalid layouts, local settings migration, Build navigation, layout round trips, preview effects, Light off interaction and stable zoom over multiple timer cycles. Existing checks include 256 core fixtures and 1,148 image-landmark assertions.

Visual review: + Original and Light off; MK.2 Atomic Purple; compact Layout source/device preview. Product PNGs retained their existing transparent backgrounds; unnecessary composite shadows/decorative layers were removed in the renderer.

Full SDK conformance and hardware validation remain outstanding. Refer to the release notes for open gaps.
