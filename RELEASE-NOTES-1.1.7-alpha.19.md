# DeckLab 1.1.7 alpha.19 — One Build workspace

## Changes

- Removed the separate Artwork workspace entry. Legacy preview links now enter Build.
- Build contains artwork and action settings for the selected placement; Live Preview runs the same profile.
- Choose PNG, JPEG, GIF or WebP artwork (up to 8 MB per image), edit title, size, colour, position, visibility and image fit. Animated files retain their original bytes and use browser playback.
- Artwork only placements let you design before assigning an action. Compatible actions can be reassigned in the inspector while retaining user artwork.
- Artwork is preserved by profile autosave, JSON export/import, copy, duplicate and undo/redo. Folder artwork copying copies the visual, not its child-page contents.
- User artwork overrides runtime images/titles until Reset artwork is used. Edits currently apply to all states of the placement; independent per-state artwork editing is not yet exposed.
- Test and Inspect are in Advanced. Raw action settings are collapsed. Manage plugins is available beside the action library.
- Reports exposes an implementation audit of the proposed Protocol Coverage Project. The full project is not implemented and no coverage percentage is claimed.

## Try it

Device Studio → Build → place Artwork only (or any supported action) → select the placement → choose an image and title. Switch to Live Preview. Use Profile & pages → Export to save.

## Validation

Chromium: artwork upload, title editing, retained artwork on action reassignment, duplication, undo, reset, JSON round-trip, shared Build/Live profile, colour persistence, editing blocked in Live, and no page errors. Visually inspected the combined editor. Native import, geometry and catalogue regression checks passed.

## Protocol status

Read TESTING.md for code references and remaining work. Canonical contract, exhaustive fixtures, version-aware dispatch, coverage calculation and paired hardware traces remain future work. Existing event handlers and QA checks are foundations, not full conformance evidence.
