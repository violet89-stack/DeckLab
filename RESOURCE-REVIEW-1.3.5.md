# GALLEON, Stream Deck SDK 3.0 and iCUE resource review
Reviewed 29 September 2026.

## GALLEON: the correction
CORSAIR's guide explicitly describes two dial sets containing four actions. Holding a dial for three seconds and releasing switches its top/bottom action. This disproves DeckLab's earlier assumption that four display regions must share two actions. The guide also separates the keyboard's hardware/Web Hub modes from Stream Deck mode.
Source: https://www.corsair.com/ww/en/explorer/gamer/keyboards/galleon-100-sd/

Implemented: four independent action placements, dial-set switching and separate display composition. The guide does not establish exact WebSocket packet coordinates; DeckLab's 2×2 coordinate model still needs hardware traces. Full/split compositions are preview/editor features rather than verified native export formats.

## Neo and SDK 3.0
Neo actions use controller Neo, are display-only, require Stream Deck 7.6, and render on a 232×50 layout. The guide requires setting the layout on each willAppear. This is a strong source for lifecycle, layout validation, Property Inspector and non-interactivity fixtures.
Source: https://docs.elgato.com/streamdeck/sdk/guides/neo-infobar/

SDK 3.0's getSettings/getGlobalSettings calls no longer trigger the public settings-change callbacks. Request identifiers support the response/promise path and require host version 7.1+. DeckLab must preserve correlated wire responses; removing them would break requests. The SDK's callback policy and the host's WebSocket protocol are separate responsibilities.
Source: https://docs.elgato.com/streamdeck/sdk/releases/upgrading/v3/

Existing DeckLab tests cover Neo/version gates and settings/resource ID correlation. These passing core cases do not certify all of SDK 3.0. Remaining audit work includes real SDK 3.x end-to-end execution, requested layout replacement during Neo lifecycle and physical traces.

## iCUE widgets: useful, separate architecture
The official specification describes HTML/CSS/JavaScript widgets with manifests, framework/application requirements, supported device types, configurable HTML metadata and injected lifecycle/data objects. The CLI validates and packages .icuewidget files. A future adapter can inspect this metadata, generate settings controls and provide explicit simulated data providers inside a sandbox.
Sources:
- https://docs.elgato.com/icue/widgets/
- https://docs.elgato.com/icue/widgets/specification/
- https://docs.elgato.com/icue/widgets/references/plugins/stream-deck/

The documented examples include XENEON EDGE, VANGUARD keyboards and LCD cooling hardware. Their existence does not prove native GALLEON iCUE widget compatibility. Do not merge iCUE widgets into the Stream Deck WebSocket coverage denominator. Proposed work: separate widget package inspection, sandboxed lifecycle, sensor/media simulations, then compatibility tests.

## Attached iCUE software ZIP
Inspected the ZIP inventory without running its programs: 1,092 entries, including 536 DLLs, 289 QML files, 27 EXEs and 3 RCC resource bundles. Widget-related component names include LegacyWidgets.dll and WidgetPermissionsRpc.dll. Readable QML entries are predominantly Qt components; no standalone widget manifest/HTML source package was located by this inspection. Compiled RCC contents were not decoded. These names do not establish an executable widget contract.

No iCUE binaries or extracted vendor code are included in DeckLab. Public documentation is the better foundation for the future adapter. This release implements independent built-in widget previews only; it does not load or run .icuewidget packages.
