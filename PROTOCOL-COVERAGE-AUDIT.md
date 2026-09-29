> Historical audit from alpha.19. See [current protocol coverage](PROTOCOL-COVERAGE.md) for alpha.20.

# Protocol Coverage Project — implementation audit

Audited DeckLab 1.1.7-alpha.19 source, 29 September 2026. This is a code inspection, not an exhaustive protocol conformance result. No support percentage is justified yet.

## Have we built the proposed project?

No. We have useful foundations, but the complete contract-driven project is not implemented.

| Proposed component | Current state | Evidence / remaining work |
| --- | --- | --- |
| Canonical SDK contract | Missing | No sdk-contract.json; event lists are scattered across app.js and qa10.js. |
| Four directional inventories | Missing | Plugin and PI handlers are separate, but no complete channel-specific inventory. |
| Per-API statuses | Missing | Compatibility results describe devices/actions, not every documented API. |
| Packet fixtures and regression runner for every API | Missing | qa10.js has targeted static/live checks; other tests cover imports, catalogue and geometry. These are not exhaustive protocol fixtures. |
| Controller-specific semantics | Partial foundation | profilePayload, profileCoordinates and lifecycle functions distinguish Keypad, Encoder, Neo and Multi Action. No systematic test matrix verifies all combinations. |
| Version-aware dispatch | Missing | No selectable software-version model alters event/command semantics. |
| Modern API gaps | Significant gaps | See below. |
| Reports coverage engine | Missing | Reports now links this audit; it does not calculate a coverage score. |
| Actual-plugin capability accounting | Partial foundation | Bridge and message logs exist. No per-session contract capability tally or verified support classification. |
| Hardware trace validation | Not established | No paired emulator/hardware trace corpus or automated equivalence comparison found. |

## Existing implementation paths

- `app.js`: `profileOutbound`, `profilePayload`, `profileWillAppear`, `profileWillDisappear`, `profileEmitInput` and `handleProfilePluginMessage` provide profile-context event and command handling.
- `app.js`: `handleProfilePiCommand`, `profileSendToPi`, `syncProfilePropertyInspector` and `unloadProfilePropertyInspector` provide PI messaging/lifecycle foundations.
- `app.js`: `handleLivePluginMessage` provides live routing; some fallback behavior depends on the active workspace and needs auditing.
- `decklab_host.py`: companion WebSocket bridge and registration routing.
- `qa10.js`: static checks, live event exercises, observed-message checks and selected settings/feedback assertions.

Code existence is not proof of complete support, version fidelity or hardware equivalence.

## Priority findings

| API / area | Current finding |
| --- | --- |
| getResources / setResources / didReceiveResources | Command names appear in qa10.js validation lists. The profile/PI dispatcher does not implement the complete storage/request/response behavior. Recognition must not count as support. |
| didReceiveDeepLink | No implementation found in the runtime handler paths. |
| switchToProfile, including page | Recognised by QA; no profile-switch command implementation found in the host dispatcher. Built-in next/previous page navigation is a different feature. |
| setTriggerDescription | No command handler found. |
| dialDown / dialUp | Emitted by profile dial controls and QA exercises. Press/rotate semantics, release handling, legacy version behavior and physical equivalence need dedicated fixtures. |
| Global settings | Get/set paths exist. Plugin-to-PI broadcasts, identity scope, correlation and SDK-version behavior need consistent tests across dispatcher paths. |
| PI registration/settings | Present in the iframe shim; request id propagation and actual WebSocket equivalence need auditing. |
| Multi Action payloads | Context and payload branches exist; event/controller/state behavior needs independent fixture assertions. |
| setFeedbackLayout | A handler exists, but currently reloads the action layout rather than demonstrating complete requested-layout handling. Treat as partial, not full. |
| setImage / setTitle | Visual handlers exist; state targeting, target semantics and overrides need a protocol test suite. The new artwork editor is not such a test. |

## Current official documentation checkpoint

Sources consulted for this audit:

- Plugin API: https://docs.elgato.com/streamdeck/sdk/references/websocket/plugin/
- Property Inspector API: https://docs.elgato.com/streamdeck/sdk/references/websocket/ui/
- WebSocket changelog: https://docs.elgato.com/streamdeck/sdk/references/websocket/changelog/

The current changelog lists:

- 6.0: dialPress/dialRotate/touchTap and encoder feedback.
- 6.1: dialDown/dialUp added; dialPress deprecated.
- 6.4: setTriggerDescription added.
- 6.5: dialPress no longer emitted; deep links and page-aware switchToProfile added.
- 7.0: deviceDidChange and passive deep links.
- 7.1: embedded resources.
- 7.6: Neo Infobar action support. Physical Neo availability and Neo SDK action support are separate milestones.

Do not interpret an SDK package version as the Stream Deck software version.

## Implementation sequence

1. Snapshot both API references and changelog; enumerate messages with channel/direction/controller/version requirements. Mark unreviewed semantics explicitly.
2. Build a canonical contract and deterministic packet fixtures with expected state/responses; make dispatch and reports read the same contract.
3. Audit existing handlers before filling resources, deep links, profile switching and trigger-description gaps.
4. Add version gates, controller-specific cases and real-plugin session accounting.
5. Add a report whose coverage only increases after associated semantic tests pass. Show hardware validation separately.

Do not include DRM/protected Marketplace internals in the documented API denominator. A name-only assertion, successful plugin connection, or visual rendering check cannot establish protocol support.
