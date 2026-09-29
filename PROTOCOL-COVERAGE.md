# Protocol coverage — current implementation

## What is implemented

The canonical `sdk-contract.json` contains 55 directional entries: 23 host→plugin (including historical dialPress), 19 plugin→host (including registration), 4 host→PI and 9 PI→host (including registration). At the current 7.6 snapshot, dialPress is excluded by its removed-version gate, leaving 54 active entries. The inventory covers message names in both official reference pages, plus registration and historical dialPress. RegistrationInfo and connectElgatoStreamDeckSocket are bootstrap information/hooks, not extra packet names.

`protocol-core.js` contains a deterministic engine driven by that contract. The profile WebSocket/PI adapter uses it for settings, global settings, resource maps, trigger descriptions, request correlation, PI broadcasts and version gates. Outbound plugin messages use the same version/controller rules. Registration information reports the chosen software version.

The schema checks cover required envelope fields and selected payload/controller constraints. They are deliberately not advertised as a complete JSON schema for every nested layout property.

`fixtures/protocol/` contains 256 fixtures with packet inputs, initial state and independently stored expected outputs/state. Every API has fixtures; Keypad, Encoder, Neo and Multi Action variants are represented where applicable. Rejection fixtures test malformed packets, wrong controllers, removed/new APIs and version boundaries. Legacy Multi Action lifecycle and PI flags have golden expectations.

Run:

```sh
node scripts/build-sdk-data.cjs
node tests-protocol.cjs
```

The first command regenerates browser data from the canonical contract and individual fixture files. `index.json` and `sdk-data.generated.js` are generated, not alternate sources of truth. The test verifies these agree, executes the fixtures and writes `test-results/protocol-test-results.json`.

Browser integration tests are in `tests-protocol-browser.cjs`; install the pinned dependencies with `npm ci --ignore-scripts` and the browser with `npx playwright install chromium` (see TESTING.md). They exercise the actual profile/PI handlers, launch version, live event gates, report controls and hardware comparison. The older Inspect and live QA dispatchers remain partially separate and are not covered by a claim of complete conformance.

## Version behavior

Presets: 6.0, 6.1, 6.4, 6.5, 6.7, 7.0, 7.1 and 7.6 (documentation snapshot).

- 6.0 dial gestures emit dialPress with pressed true/false.
- 6.1–6.4 emit dialDown/dialUp plus deprecated dialPress.
- 6.5+ emits dialDown/dialUp without dialPress.
- Multi Action lifecycle controller information starts at 6.5; PI isInMultiAction starts at 6.7.
- Deep-link events require 6.5; deviceDidChange requires 7.0; resources require 7.1; Neo action contexts require 7.6.
- Settings/resources payloads omit fields introduced after the selected version.
- Newer commands are rejected before mutation. Plugin launch/PI registration info uses the selected version; restart an already-running plugin after changing it.

These are targeted documented protocol changes, not a recreation of every historical Stream Deck release bug or UI behavior.

## Coverage meaning

Reports → SDK protocol coverage runs the isolated suite without touching the current profile, shows each direction/controller/version/status, and exports the results. Counts distinguish behavior cases from schema/rejection-only fixtures. An absent/failed fixture or a passing unsupported-API rejection never increases tested implementation coverage.

Baseline: 256 passing fixtures; 33 of 54 currently applicable directional entries have passing core behavior cases. This is NOT 61% full SDK compatibility. No entry is currently claimed fully covered, and zero APIs are declared physically hardware-validated. Some response behaviors are tested through command fixtures without being credited independently to response rows, making these counts conservative.

Full, Partial, Implemented-needs-hardware, Not implemented, Not applicable and Outside scope are supported contract statuses. Protected/undocumented Marketplace internals are outside the documented API denominator.

## Remaining limitations

- Resource maps persist and broadcast; referenced local files are not copied or embedded in native profile exports.
- switchToProfile remains explicitly unsupported. Its distributed-profile restrictions, installation, restoration and page behavior are not simulated.
- Visual commands use the existing partial renderer. State/target image and title updates and requested custom-layout lookup have targeted browser regressions; exhaustive layout schemas and equivalence to physical output remain incomplete. Passing schema tests do not earn these APIs behavior coverage.
- System/application/deep-link events can be manually injected; DeckLab does not monitor OS applications or install an OS deep-link handler.
- PI communication uses the existing sandbox shim; this is not full Chromium/official-host equivalence.
- Physical timing, full schemas, all error responses and all historical behavior remain unverified.
- Hardware comparisons are implemented, but require genuine community captures. See HARDWARE-VALIDATION.md.

Official reference snapshot (29 September 2026):

- https://docs.elgato.com/streamdeck/sdk/references/websocket/plugin/
- https://docs.elgato.com/streamdeck/sdk/references/websocket/ui/
- https://docs.elgato.com/streamdeck/sdk/references/websocket/changelog/

Session traces include simulated/offline emissions and are not proof that packets reached a connected plugin or physical device.
