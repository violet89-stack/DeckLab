# Verification — 1.3.10-alpha.32

All **23/23 automated suites passed** in the local Linux environment (Node 24, Python 3.12, Playwright 1.62.1 with a supplied Chromium). See [suite results](release-test-results.json) and [layering assertions](artwork-layer-results.txt).

The new artwork-layer suite verifies rendered background/foreground pixels, both picker orders, independent removal, Undo/Redo, old template-only profiles, A/B state isolation and attribution, reusable template roles, the foreground creator, preserved GIF bytes, live dial demo feedback, profile round trips, Keypad/Encoder/Neo and full/split/segment LCD surfaces. The [Build screenshot](artwork-layers.png) was visually inspected.

Existing alignment, dial/LCD, import, protocol, runtime and companion-security suites also pass. Release metadata, syntax, asset hashes and local Markdown links were checked. Source and bundled asset licences are unchanged.

Actual Windows/Linux CI results are recorded separately in [GitHub Actions](https://github.com/violet89-stack/DeckLab/actions). Windows desktop/GPU behaviour and physical-device equivalence remain unverified.
