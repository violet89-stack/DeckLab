# DeckLab 1.1.4 alpha.14 — Plugins workspace

Open **Plugins** in the top navigation.

- Discover: browse catalogue cards, search, filter by source/category, and open plugin details.
- My library: scan local `.sdPlugin` folders, search action names, inspect packages, and retain metadata between sessions.
- Online refresh: fixed-source adapters for OpenDeck and Stream Dock through the Python launcher. Cached data is retained on source failure. Refresh is user initiated.
- Import catalogue JSON: select a source first for a raw array, or use an envelope with `source` and `rows`. Try `examples/plugin-catalogue.json` for clearly labelled example data.
- Details: author, version, description, publisher link, declared platforms/controllers, and action names where supplied. Catalogue entries are not marked tested or installed.

## Verification

JavaScript syntax checks, Python compilation, and the catalogue DOM harness passed. Harness covers local scanning, action search, protected packages, metadata persistence, catalogue import, unsafe URL rejection and retention after network failure. Device surface regression checks pass.

Full browser visual/interactivity testing was not completed: Chromium download was blocked in the build environment. Live OpenDeck (325 entries) and Stream Dock catalogue requests both completed successfully during verification. The source adapters follow the formats documented in the supplied Control Centre archive; upstream changes may require adjustments. HTTP redirects fail visibly rather than silently fetching a new destination.

## Limits

This build browses metadata and inspects local packages. It does not install or launch downloaded plugins. External catalogue images load when Discover cards are displayed. Local files must be selected again after restarting. Stream Dock refresh is capped at 10 pages; partial results are labelled. Portable profile bundles remain a subsequent feature.
