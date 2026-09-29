# DeckLab 1.1.0-alpha.9 — Interactive Device Studio

This release is an interaction and usability refactor built on the canonical device renderer introduced in the 1.0.x series.

## Highlights

- Replaces the seven-workspace top navigation with **Project · Device Studio · Reports · Help**.
- Device Studio now presents **Preview · Build · Test · Inspect** as activities around one selected device.
- Adds a visual, grouped device picker using official Elgato preview art where available.
- Promotes primary Stream Deck hardware while moving XENEON/Virtual into **Other surfaces** and SCIMITAR/Pedal into collapsed **Input-only integrations**.
- Treats **Scissor Keys as an appearance choice** for the 15-key Stream Deck in the main picker instead of a competing headline device.
- Keeps the selected device visible in Test and advanced Inspect workflows.
- Moves Plugin Lab, Layout Lab and Host Lab behind the **Inspect** activity instead of exposing them as top-level destinations.
- Adds a simplified Reports surface for QA history, compatibility, project export and sanitized bug reports.
- Adds task-oriented Help cards and collapses raw SDK tooling into an Advanced section.
- Device changes in Build mode now preserve existing profile placements rather than clearing the profile automatically.
- Fresh sessions enter the device-first workflow and prompt for hardware selection.

## Compatibility and safety

- Existing DeckLab 1.0 project/profile schemas remain unchanged.
- Canonical device geometry and official-preview artwork remain shared across Preview, Build and compatibility.
- Manual-only external plugin execution remains unchanged; DeckLab does not launch imported plugin executables.
