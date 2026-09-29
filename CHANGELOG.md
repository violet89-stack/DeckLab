## 1.3.9-alpha.31 — 2026-09-30

MPL-2.0 source licensing; confirmed CC BY 4.0 product/template attribution; 38 built-in colour-template sheets with 93 tone variants; native-sized key/LCD artwork, region selection, portable credits and regression coverage; 1,241 MIT-licensed Elgato icons with search, recolouring, drag placement and portable licence notices; public DeckLab repository setup.

## 1.3.8-alpha.30 — 2026-09-29

Companion origin/Host/registration and WebSocket validation; portable tests and Windows/Linux CI configuration; refreshed community documentation; source packaging and publication preparation. See RELEASE-NOTES-1.3.8-alpha.30.md. Publication choices remain outstanding.

# 1.1.7-alpha.19

Unified artwork/action editing inside Build, Advanced tools menu, and explicit protocol-project audit. See RELEASE-NOTES-1.1.7-alpha.19.md.

# 1.1.6-alpha.18

Device colour variants, shared Build/Live Preview workflow, and a cleaner studio layout. See RELEASE-NOTES-1.1.6-alpha.18.md.

# 1.1.5-alpha.17

Added built-in action simulations and native profile ZIP import with preserved images, settings, folder links and unsupported actions. Verified with supplied default profiles and Chromium UI checks.

# 1.1.4-alpha.16

Elgato-focused discovery; official Marketplace browse link; OpenDeck untested labels; removed Stream Dock adapter and cache.

# 1.1.4-alpha.15

Fix runtime version labels and prevent cached scripts/styles across builds.

# 1.1.4-alpha.14

Added Plugins workspace, read-only catalogue source adapters, cached discovery, JSON import, detailed metadata and local-library integration.

# Changelog

## 1.1.3-alpha.12 — Plugin Intelligence & DRM Awareness

- Detect Elgato Marketplace-protected plugin manifests and explain the limitation without presenting false JSON/UUID/Actions errors.
- Preserve a strict no-decryption boundary: DeckLab recognizes protected packages but does not attempt to bypass Marketplace protection.
- Add a local **Plugin Library** scanner for folders containing multiple `.sdPlugin` packages.
- Search and classify local packages as **Inspectable**, **Protected**, or **Needs attention**.
- Keep library scanning static/local-only; no plugin code is executed and no remote catalogue is contacted.
- Improve plugin empty/error states so invalid plain JSON and DRM-protected packages are visually distinct.

## 1.1.2-alpha.11 — Interaction & Guidance

- Added contextual tooltips and task-specific mode help.
- Added persisted Beginner / Developer presentation modes.
- Added Ctrl+K command palette with keyboard navigation and device/mode/project shortcuts.
- Added canonical-device zoom / fit controls and shortcuts.
- Added a persistent autosave/device/mode/plugin/warning status bar.
- Added smart Build/Test empty states and first-action guidance.
- Added device-aware action recommendations while keeping incompatible actions visible with explanations.
- Added inline drag/drop compatibility messaging and stronger valid/invalid target feedback.
- Added right-click profile context actions for test/copy/duplicate/delete/paste.
- Preserved the manual-only plugin execution security boundary.

## 1.1.1-alpha.10 — GALLEON module-focused preview

- Replaced the full-keyboard GALLEON visualization with Elgato's supplied CC BY 4.0 close-up of the dedicated Stream Deck module.
- Aligned the canonical 4×3 LCD-key hit regions, two rotary encoders, and two non-touch Encoder feedback windows directly to the official reference artwork.
- Preview, Build, Test/Inspect context, and compatibility thumbnails continue to use the same canonical DeviceSurface.
- The unrelated QWERTY keyboard body is intentionally omitted so the interactive Stream Deck controls remain large and useful.

## 1.1.0-alpha.9 — Interactive Device Studio

- Reorganized DeckLab around one persistent selected-device workflow.
- Replaced the previous top-level lab navigation with **Project · Device Studio · Reports · Help**.
- Added **Preview · Build · Test · Inspect** activities inside Device Studio.
- Added a visual grouped device picker with main devices, Other surfaces, and collapsed Input-only integrations.
- Demoted SCIMITAR and Stream Deck Pedal from the main picker while retaining compatibility/QA support.
- Presented Scissor Keys as a standard 15-key Stream Deck appearance variant in the primary workflow.
- Added selected-device docks to Test and Inspect so hardware context remains visible.
- Moved Plugin/Layout/Host tooling behind the advanced Inspect activity.
- Added simplified Reports and task-oriented Help views.
- Device changes during profile building preserve placements instead of automatically clearing the profile.
- Fresh sessions now begin with device selection rather than requiring users to understand project/lab architecture first.


## 1.1.0-alpha.9 — Official Device Preview Renderer

- Bundles selected Elgato Stream Deck device-preview artwork under CC BY 4.0 with attribution.
- Adds an official-artwork layer to the canonical `DeviceSurface`; Preview, Build Profile, and compatibility use the same renderer/geometry.
- Uses official black/front artwork for MK.2, Mini, XL, Stream Deck +, Stream Deck + XL, Neo, and Studio.
- Keeps dynamic LCD content, animations, touch/Infobar feedback, dial indicators, hit zones, selection, and drag/drop as DeckLab overlays.
- Keeps CSS hardware fallbacks for unsupported/reference-only surfaces and preserves all interaction if artwork fails to load.
- Retains the supplied GALLEON module image as a CC BY reference asset while keeping DeckLab's full-keyboard hardware view.
- Adds `THIRD-PARTY-NOTICES.md`, artwork attribution, and official-preview renderer documentation.

# DeckLab changelog

## 1.1.0-alpha.9 — Official Elgato Reference Calibration

- Recalibrated first-party device face geometry from Elgato-supplied front reference renders.
- Added official artwork/safe-area metadata for keys, Studio keys, Encoder segments, + / + XL strips, and Neo Infobar.
- Corrected Stream Deck + key pitch and dial-row placement.
- Corrected Stream Deck + XL face/dial geometry.
- Corrected Studio to rectangular 72×56 key geometry.
- Corrected GALLEON Encoder display segments.
- Added official-reference geometry regression tests.

## 1.1.0-alpha.9 — Unified Device Surface

- Added `device-surface.js` as the single device registry, geometry engine, and hardware renderer.
- Device Studio Preview and Device Studio Build now render the exact same canonical control coordinates.
- Compatibility thumbnails now use the same renderer at a smaller uniform scale.
- Consolidated Device Preview and Profile Lab into the top-level **Device Studio** concept with Preview / Build profile modes.
- Removed duplicate JavaScript rendering functions for ordinary Stream Deck layouts, Neo, SCIMITAR, GALLEON, Pedal, and Studio.
- Added normalized geometry snapshots and a regression test script for device control bounds/counts.
- Preserved DeckLab 1.0 project/profile schemas and the manual-only external plugin launch security boundary.

# Changelog

## 1.0.5-alpha.5 — Stream Deck Studio rackmount calibration

- Replaced the generic 4×8 Studio preview with a professional 19-inch / 1U rackmount face.
- Corrected the Studio key geometry to 2 rows × 16 columns while preserving all 32 LCD-key contexts.
- Added the two fixed push encoders at the left and right ends of the rack face.
- Added rack ears, front-panel proportions, NFC/USB-C reference marks, and explicit 447 × 80 × 44 mm physical metadata.
- Updated Profile Lab and compatibility mini-preview to use the same 2×16 rack geometry.
- Added migration for DeckLab profiles created with the earlier generic 4×8 Studio coordinates.
- Kept Studio classified as a separate Bitfocus Buttons / Companion-oriented host target rather than claiming standard Stream Deck profile parity.
- Preserved the Community Alpha safe manual-plugin-launch model.

## 1.0.4-alpha.4 — Peripheral hardware shell calibration

- Replaced the generic 3×4 SCIMITAR preview with a gaming-mouse shell and the physical 4×3 adjustable Key Slider layout.
- Replaced the generic GALLEON grid with a close-up Stream Deck module context, two rotary dials, non-touch info display, and physical 4×3 LCD-key layout.
- Replaced the generic three-button Stream Deck Pedal preview with a three-zone foot-pedal shell, including the larger center pedal.
- Updated Profile Lab and compatibility mini previews to preserve the same hardware identity.
- Added migration for older DeckLab SCIMITAR/GALLEON profiles that used the previous 3×4 coordinate orientation when a legacy fourth column is detected.
- Kept all three devices on their existing SDK controller models; this release changes hardware geometry/presentation rather than inventing new plugin events.
- Preserved the Community Alpha safe manual-plugin-launch model.

## 1.0.3-alpha.3 — Device face geometry calibration

- Device Preview now uses explicit face geometry rather than generic stacked controls.
- Corrected Stream Deck + width to 140 mm.
- Reworked + / + XL key, touch-strip, and dial alignment.
- Added Neo Touch Points to Device Preview and recalibrated its lower control row.
- Rebalanced classic/Mini/XL key-grid placement and added a distinct Scissor Keys face treatment.
- Preserved the Community Alpha safe manual-plugin-launch model.


## 1.0.3-alpha.3 — Physical preview calibration

- Replaced grid-normalized hardware scaling with chassis-width-aware physical scaling for Mini, 15-key, XL, Neo, Stream Deck + and Stream Deck + XL.
- Mini and standard 15-key models now use the same visual key unit instead of Mini keys expanding to fill the shell.
- Added calibrated key gaps and centered bezels rather than stretching key grids with `1fr`.
- Stream Deck + and + XL touch-strip widths now follow the published 108 mm and 161 mm dimensions in physical previews.
- Applied the same geometry model to Device Preview, Profile Lab and compatibility mini previews.
- Added `PHYSICAL-CALIBRATION.md` documenting what is published fact versus an unverified visual estimate.

# DeckLab changelog

## 1.0.3-alpha.3 — Community Alpha

Community-testing and release-preparation pass on top of DeckLab 1.0.

### Added

- One-click **Create bug report** action in Project Studio.
- Local, dependency-free sanitized bug-report ZIP generation containing version/environment, project/profile structure, compatibility output, QA output, and protocol traces when available.
- Sanitization for common user-home paths and common password/token/secret/API-key/cookie/session fields.
- About/build/privacy dialog.
- Community Alpha first-run notice.
- Device verification-status badges that distinguish spec modelling from physical-hardware verification.
- `community-config.json` for repository/issue URLs.
- GitHub issue templates for bugs, hardware verification, and feature requests.
- `PRIVACY.md`, `SECURITY.md`, `CONTRIBUTING.md`, `COMMUNITY-ALPHA.md`, `LICENSE-NOTICE.md`, release notes, and publishing checklist.
- `verification/known-hardware.json` as the initial hardware-validation ledger.
- JSON Schema for the bug-report metadata file.

### Security/privacy

- Safe execution model is unchanged: imported plugin programs are never started automatically.
- Companion remains localhost-only.
- No telemetry was added.
- Bug-report ZIPs are produced locally and should still be reviewed by testers before public upload because arbitrary plugin-generated log messages may contain unexpected information.

### Compatibility

- Persisted project/profile/QA/compatibility schema version remains `1.0`.
- Application build version is `1.0.3-alpha.3`.