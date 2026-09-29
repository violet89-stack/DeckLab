# DeckLab Community Alpha privacy statement

DeckLab Community Alpha is designed to run locally.

## Telemetry

DeckLab contains **no built-in analytics or telemetry uploader**. The local companion serves the application on `127.0.0.1` and provides the optional local WebSocket bridge used for explicitly launched plugin processes.

DeckLab itself does not need your IP address or precise location and does not intentionally collect either.

## Browser storage

DeckLab uses browser local storage for application state such as project/profile autosave, onboarding state, and workspace preferences. This data stays in that browser profile unless you export it yourself.

## Sanitized bug reports

The **Create bug report** feature creates a ZIP locally in your browser. It can contain:

- DeckLab version/build and current workspace
- browser/platform/display information
- a sanitized project/profile snapshot
- compatibility and QA reports when available
- DeckLab protocol/event traces

The exporter is designed to omit:

- project notes
- plugin executable/binary files
- IP address and precise location
- common password/secret/token/API-key/cookie/session fields
- common Windows/macOS/Linux user-home filesystem prefixes

The sanitizer cannot guarantee that arbitrary plugin-generated log text contains no personal or confidential information. **Review the exported files before posting a report publicly.** Do not attach proprietary plugin packages unless you have permission to share them.

## Third-party plugins

Static inspection does not execute imported plugin application code. If you manually run a third-party plugin for live testing, that program is outside DeckLab's privacy boundary and may make its own network requests or access local resources according to its implementation.

## Optional network activity

Catalogue discovery can request public catalogue data through the companion; opening Marketplace/documentation links contacts those websites. Their servers receive normal request metadata. Imported Property Inspector web content and manually launched native plugins have their own network behaviour. These optional interactions are separate from DeckLab telemetry.
