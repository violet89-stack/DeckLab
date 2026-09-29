# DeckLab 1.2.0-alpha.20

## Button titles

An intentional empty title no longer falls back to the action name. Title edits update immediately; Show title hides the overlay while preserving the editable title and artwork.

## Protocol coverage

- Canonical `sdk-contract.json`: 55 directional entries across plugin and Property Inspector channels, including registration and legacy dialPress.
- 256 fixtures with controller, payload, correlation, version-boundary and rejection assertions. Regenerate browser data with `node scripts/build-sdk-data.cjs`.
- Version selection in Advanced and Reports, including legacy dial events and newer API gates. Restart a connected plugin after changing versions to refresh launch arguments.
- Profile/PI dispatcher integration for settings, global settings, resource maps, messaging and trigger descriptions. Resource maps persist in profile exports.
- Reports can run isolated fixtures, inspect API limitations, export coverage and session traces, and compare hardware captures.
- Hardware review requires matching traces and named provenance confirmation. No real hardware captures are bundled or claimed as validated.

## Evidence and limits

All 256 protocol fixtures pass. At the default 7.6 target, 33 of 54 current directional APIs have passing core-behaviour fixture sets. This is not a full SDK compatibility percentage: schema-only checks and unsupported-command rejection do not earn support credit. Full-support and hardware-validated API counts remain zero.

Browser regression checks cover blank/hidden titles, shared Build/Live Preview state, real profile/PI handler settings and resources, versioned dial emission and Reports. Native profile import, device geometry and catalogue checks also pass.

Native resource file copying/export, plugin-distributed profile switching, complete visual state/target semantics, OS lifecycle monitoring and physical timing equivalence remain gaps. Older Inspect/QA paths are only partially migrated. See PROTOCOL-COVERAGE.md and HARDWARE-VALIDATION.md.
