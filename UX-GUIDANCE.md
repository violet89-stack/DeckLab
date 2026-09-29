# DeckLab 1.1.2 — Interaction & Guidance

DeckLab 1.1.2 is a usability-focused release. The simulator, canonical device renderer, profile runtime, compatibility engine and QA system remain intact; this release makes those systems easier to discover and faster to operate.

## Interaction principles

1. **Selected device stays central.** Preview, Build, Test and Inspect continue to orbit the same selected hardware.
2. **Beginner first, developer depth on demand.** Beginner view hides low-level identifiers/log density while Developer view exposes UUIDs, protocol detail and diagnostics.
3. **Explain before rejecting.** Unsupported action/device combinations stay visible with a reason instead of silently disappearing.
4. **Direct manipulation first.** Drag, drop, double-click, right-click, mouse-wheel dial rotation and keyboard shortcuts are surfaced by tooltips and contextual help.
5. **Status should be ambient.** Autosave, target device, current mode, plugin connection and warning count are always visible in a low-noise status bar.
6. **Advanced features stay searchable.** Ctrl+K opens a command palette for modes, devices, reports, project actions, zoom, demo content and developer workflows.

## Added in 1.1.2

### Contextual tooltips

DeckLab now provides custom tooltips for device/mode navigation, profile editing controls, dial/touch interactions, controller chips, compatibility targets and status indicators. Native `title` hints are promoted into the same tooltip system so dynamically rendered controls remain consistent.

### Beginner / Developer presentation

The global view selector is persisted locally:

- **Beginner** reduces UUID/log/schema noise and keeps the common workflow prominent.
- **Developer** preserves full technical detail.

This is presentation-only; it does not alter plugin execution, profile data or QA behaviour.

### Ctrl+K command palette

Search and execute common actions without navigating panels. Examples include:

- Preview / Build / Test / Inspect
- switch hardware target
- fit / zoom device
- load sample plugin
- build demo profile
- import a plugin folder
- compare devices
- save project
- create bug report
- open reports/help

Keyboard navigation uses Up/Down, Enter and Escape.

### Smart profile builder guidance

The action library now separates actions into:

- **Recommended for the selected device**
- **Unavailable on the selected device**

Unavailable actions remain visible and explain which controller surface they require. Empty action libraries provide direct demo/import actions. Empty profiles show a small first-action coach rather than a silent blank surface.

### Inline drag compatibility

While dragging an item over the canonical device surface, DeckLab reports whether the target controller is compatible and reinforces valid/invalid drop targets visually.

### Right-click profile actions

Placed actions now support a context menu for common operations such as Test, Copy, Duplicate and Delete. Paste appears when a clipboard item is available.

### Device zoom / fit

Device Studio adds zoom-out, fit/reset and zoom-in controls. The zoom is applied uniformly to the canonical device surface and persists locally. Shortcuts:

- `Ctrl +` — zoom in
- `Ctrl -` — zoom out
- `Ctrl 0` — fit/reset

### Persistent status bar

The bottom status bar shows:

- autosave state
- selected device
- active workspace/mode
- plugin socket status
- warning/failure count
- quick command/help access

### Contextual mode help

The `?` control in Device Studio opens a short, task-specific guide for Preview, Build, Test or Inspect without leaving the current device.

## Security boundary

None of these UX changes alter DeckLab's safe runtime policy. Imported plugin code is not automatically executed. Live plugin testing still requires the user to explicitly launch trusted plugin code outside DeckLab.
