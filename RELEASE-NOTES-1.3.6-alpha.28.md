# DeckLab 1.3.6 alpha.28 — repairs and Build refinement

This package contains the application, not just an audit. Close any earlier DeckLab PowerShell/companion window before starting this copy; an already-running server can keep serving the earlier release. Extract into a new folder, keep the same localhost address/port to retain browser data, and check Help shows 1.3.6 Community Alpha.

## Build and appearance

- Build contains Actions & artwork, Layouts & assets and Icon library. Layout editing is removed from the Advanced menu. The icon library can open with no action selected for browsing/importing.
- Layout source identifies device compatibility and canvas dimensions. Encoder sources label + / + XL / GALLEON at 200×100 per action; Neo identifies its 232×50 Infobar. An incompatible selected device is called out. Apply a valid layout to a selected matching action, then return to its physical preview. User-built layouts survive profile export/import.
- Display appearance offers Original, Backlit effect and Light off. The preference persists locally and affects rendered displays only. Source images and exported artwork are unchanged. Light off still permits key/dial/touch interaction.
- Physical key artwork is inset by a small model-specific amount while the calibrated control positions and hit areas remain intact.
- The bundled product PNGs already contain alpha transparency. Removed the additional composite shadows and decorative background layers responsible for rectangular/halo distractions; preserved the actual product pixels, including Atomic Purple's casing. The stage uses a quiet, uniform background.

## Zoom and runtime repairs

The guidance observer no longer responds to its own DOM updates. Context previews are rebuilt only when their device changes, and zoom is applied before newly rendered devices become visible. Feedback layouts rescale to their containers. This removes periodic unzoomed frames and unnecessary device replacement. Browser checks observed stable dimensions and node identity across multiple timer cycles. Windows GPU/compositor behavior has not been directly tested here.

Requested `setFeedbackLayout` paths and built-in IDs now select the requested layout. Both Encoder and Neo are supported; missing, mismatched and invalid layouts are rejected without silently loading a different default. Invalid runtime layouts remain blank while the editor can still show diagnostics.

Runtime title/image overrides are tracked separately per state and SDK target. An inactive-state update does not replace the visible state, omitted state updates both states, software-only updates do not overwrite the physical device preview, and reset restores the underlying user/manifest visual. These overrides remain transient rather than modifying source artwork. Software target data is modeled internally; a second complete native software UI is not emulated.

Actions with `VisibleInActionsList=false` no longer appear in the main action catalogue, but imported placements still resolve. The wake scenario now emits visible action appearances plus the wake event.

## Settings preservation

Ordinary profile and project exports omit plugin global settings. Global settings stay in browser-local storage under the plugin UUID, separate from the shareable design. Existing browser autosaves are migrated into this local store without overwriting an existing entry. Importing a profile does not overwrite local global settings. This is browser-local storage, not an OS credential vault; protocol/global-storage fidelity remains partial. Existing exported files are not retroactively rewritten.

## Verification and remaining limits

New browser checks cover state/target title and image behavior, Encoder/Neo layout selection, invalid-layout rejection, layout round trips, plugin-local settings isolation/migration, Build navigation, the icon library, all three appearance modes, Light off touch routing and zoom stability across six devices at three zoom levels. The earlier six audit probes now pass.

The existing protocol, device geometry, native-profile import, catalogue, creator, LCD, encoder, GALLEON, artwork, Studio and live-demo checks also passed. This includes 256 protocol fixtures and 1,148 image-landmark assertions. See repair-test-results.json and audit-probe-results.json for focused results.

This release does not establish full SDK conformance. Core coverage remains 33/54 current directional APIs with selected passing behavior cases; full=0 and hardware-validated=0. Resource byte packaging, bundled-profile switching, full field/schema coverage and real SDK 3/hardware integration remain open. GALLEON's coordinate/hold model still needs physical traces. Full/split screen composition remains a DeckLab preview/editor feature, and built-in widgets are not native iCUE widget execution.

Official behavior references: [Plugin WebSocket](https://docs.elgato.com/streamdeck/sdk/references/websocket/plugin/), [Neo Infobar](https://docs.elgato.com/streamdeck/sdk/guides/neo-infobar/), [Settings](https://docs.elgato.com/streamdeck/sdk/guides/settings/), [Layouts](https://docs.elgato.com/streamdeck/sdk/references/layouts/).
