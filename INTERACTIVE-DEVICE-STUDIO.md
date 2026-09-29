# Interactive Device Studio — DeckLab 1.1.2-alpha.11

DeckLab 1.1.2 builds on the interaction-first Device Studio introduced in 1.1.0 and the application around a single user concept: **the selected device**.

## Primary workflow

1. Choose hardware.
2. Stay in Device Studio.
3. Switch activity, not application:
   - **Preview** — interact with keys, dials, touch surfaces and animated output.
   - **Build** — drag actions onto the same device and edit the selected context.
   - **Test** — run static/live QA while the selected hardware remains visible.
   - **Inspect** — open advanced package, layout or runtime/protocol tools.

The canonical `DeviceSurface` remains the only geometry renderer. The 1.1 shell changes navigation and presentation; it does not duplicate device geometry.

## Device catalogue hierarchy

### Main devices
- Stream Deck Mini
- Stream Deck / MK.2
- Stream Deck XL
- Stream Deck Neo
- Stream Deck +
- Stream Deck + XL
- Stream Deck Mobile
- Stream Deck Studio
- Corsair GALLEON 100 SD

**Scissor Keys is an appearance variant of the standard 15-key Stream Deck in the main workflow.** The separate device definition remains available internally for compatibility fidelity.

### Other surfaces
- XENEON EDGE
- Virtual Stream Deck

### Input-only integrations
- SCIMITAR ELITE WIRELESS SE
- Stream Deck Pedal

The latter groups remain fully modelled but no longer compete visually with the primary device family.

## Simplified top-level navigation

- **Project** — save/open project context.
- **Device Studio** — Preview / Build / Test / Inspect.
- **Reports** — QA history, compatibility, project export and bug-report workflows.
- **Help** — task-oriented start points, tour and deliberately collapsed advanced tools.

Legacy Plugin Lab, Layout Lab and Host Lab are retained as internal advanced views behind **Device Studio → Inspect**. This avoids throwing away proven functionality while keeping it out of the main path.

## Device selection

Device Studio uses a visual picker grouped by relevance. Official CC BY 4.0 Elgato artwork is used on supported first-party device cards. The selected device is persisted through Preview, Build, Test and Inspect.

Changing device while a profile already contains placements now preserves the profile data rather than automatically wiping the page. Placements that are structurally incompatible remain available to the compatibility analysis.

## UX principles for later releases

- One selected-device mental model.
- No SDK terminology required for basic preview/profile building.
- Advanced protocol details are opt-in.
- Destructive changes should be explicit.
- Hardware should remain visually stable when changing activities.
- Input-only integrations remain supported without pretending they have display hardware.
