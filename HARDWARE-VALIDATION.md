# Hardware trace validation

No real hardware traces were supplied or validated in this release. The comparison workflow is ready for community captures. Automated fixtures are synthetic and are never hardware evidence.

## Capture procedure

1. Use a plugin you control with logging around its WebSocket send and receive handlers. Record the complete JSON packet and direction before your SDK wrapper transforms it. For PI tests, instrument the PI connection too.
2. Record the device model, exact Stream Deck software version, plugin version, operating system, capture date and the steps you performed. Use the same profile, settings, states and actions in DeckLab and the official host.
3. In DeckLab choose the matching protocol version under Advanced or Reports. Restart an existing plugin so its launch info uses that version. Perform the same steps and export the session trace from Reports.
4. Put the hardware capture into the format below. Remove setup chatter from both captures consistently when comparing a specific scenario; document what was removed. Never delete a divergent event solely to force a match.
5. Import both files in Reports → Hardware trace comparison. Review differing fields and missing/extra events. Identifier names may differ; their relationships, ordering and payloads must agree.
6. Only confirm a reviewed match when the hardware file is an actual real-device capture. Save the comparison with the original captures and scenario notes.

## Format

```json
{
  "format": "DeckLabProtocolTrace",
  "origin": "hardware",
  "version": "7.6",
  "deviceModel": "plus",
  "capturedAt": "REPLACE_WITH_ACTUAL_ISO_DATE",
  "source": "REPLACE_WITH_DEVICE_PLUGIN_OS_AND_CAPTURE_METHOD",
  "events": []
}
```

Use DeckLab model keys such as `standard`, `mini`, `xl`, `plus`, `plusxl` or `neo`. `version` is the protocol comparison version shared by both files; put the exact official build in `source`. Each event needs a `channel` and `packet`. Valid channels are `host->plugin`, `plugin->host`, `host->pi` and `pi->host`. The packet must be the original JSON message. At least one event is required for a comparison; empty templates cannot pass.

The comparator normalizes only top-level context/device/request-id/registration-uuid values, consistently within each trace. It does not normalize IDs inside settings or other payloads. Message order and payloads remain significant. Timing and visual rendering are not validated. Version and device model must match.

Review records remain local until exported with the coverage report. A reviewed trace match validates only the captured scenario. It does not prove every controller/version case for an API, and does not automatically increase API-wide hardware coverage.

## Suggested first scenarios

- Keypad: appear, get/set settings, keyDown/keyUp, title/image updates, disappear.
- Encoder: press, rotate while held, release outside the control, tap and hold, feedback changes.
- Multi Action: two states, desired state, absent coordinates and lifecycle differences across 6.0/6.5.
- Neo: 7.6 controller payloads and Infobar feedback; distinguish navigation touch points from plugin action input.
- PI: registration, instance/global settings in both directions, request correlation and resources.

Treat traces as potentially sensitive: plugin settings may contain credentials or personal paths. Redact consistently in both files before sharing them with the community.
