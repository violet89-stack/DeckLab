# DeckLab 1.1.2-alpha.11 — Interaction & Guidance

This release focuses on discoverability, speed and confidence rather than adding another major emulator subsystem.

## Highlights

- Added contextual tooltips across Device Studio, profile editing, compatibility and status controls.
- Added persisted **Beginner / Developer** presentation modes.
- Added a searchable **Ctrl+K command palette** for modes, devices, projects, reports, zoom and common actions.
- Added device **zoom / fit** controls with Ctrl+/Ctrl-/Ctrl+0 shortcuts.
- Added a persistent status bar for autosave, selected hardware, current mode, plugin connection and warnings.
- Added contextual quick-help for Preview, Build, Test and Inspect.
- Added smart empty states with direct demo/import actions.
- Reorganized the action library into **Recommended for this device** and **Unavailable on this device** groups.
- Added controller-aware explanations for unavailable actions.
- Added inline drag/drop compatibility feedback.
- Added right-click profile actions for test/copy/duplicate/delete and paste where appropriate.
- Strengthened visible focus states and keyboard accessibility.

## What did not change

- The canonical unified `DeviceSurface` remains the single geometry/rendering path.
- The official Elgato preview-art layer remains under CC BY 4.0 attribution.
- Profile, compatibility and QA file schemas remain at their existing schema versions.
- DeckLab still never automatically launches imported plugin executable code.

## Testing focus

Community testers are particularly invited to report:

- tooltips that obscure important device areas,
- commands that are hard to find or missing from Ctrl+K,
- Beginner mode hiding information that should remain visible,
- Developer mode details that are still difficult to access,
- confusing invalid-drop explanations,
- zoom behaviour on unusual aspect-ratio devices such as Studio or Galleon,
- keyboard/focus problems.
