# DeckLab 1.1.5 alpha.17 — Built-in actions and native profiles

## Try it

1. Open Device Studio → Build.
2. Choose a built-in action in the action list, then click an empty compatible slot.
3. Select it to edit the available settings. Double-click its key to simulate it.
4. Use Import profile to select a `.streamDeckProfile` or DeckLab JSON file.
5. The included `examples/builtin-actions.streamDeckProfile` demonstrates text, website, hotkey, pages, a folder and an intentionally unavailable action.

## Changes

- Ten built-in actions: Website, Text, Hotkey, Open file/application, Open Application, Multimedia, Next Page, Previous Page, Go to Page and Parent Folder.
- Navigation operates within DeckLab. System actions show simulation results; they do not launch applications, open websites, type into other applications or control system media.
- Built-in actions are separate from loaded plugin actions. Built-in and preserved unsupported actions are not sent to a connected third-party plugin as input/lifecycle events.
- Native profile ZIP import runs locally in the browser and does not require a plugin process or companion server.
- Reads controller placements, page ordering, current page, folder destinations, action settings, key states and referenced PNG/JPEG/GIF/WebP images. Includes the filesystem-safe encoded page IDs used by the supplied default profiles.
- Unknown actions remain visible and retain their settings/source metadata. The import summary names unsupported actions and warns about missing images, controller backgrounds and off-grid placements.
- Imported images and settings survive DeckLab JSON export/re-import. Copying an imported action preserves its image and settings.
- Full browser checks are now available. All application version labels and asset cache identifiers are updated.

## Verification

- Parsed 14 user-supplied default profiles and resolved all folder destinations.
- Loaded all 14 into the application in a DOM test environment, checking placement counts and image retention through JSON export/re-import.
- Chromium tests: native file selection, import summary, demo navigation, built-in text simulation, 62-placement Stream Deck Plus profile, imported-action duplication and the existing plugin demo; no page errors.
- ZIP corruption/truncation rejection, encoded-ID conversion, catalogue regression and canonical device surface regression checks.
- Inspected browser screenshots of the built-in demo and imported Plus profile.

## Current limits

- Advanced native actions, including dial stacks, action wheels, Key Logic and native multi-action containers, are retained as unavailable placeholders. DeckLab-created Multi Actions continue to work and can contain supported built-in simulations.
- Native export back to `.streamDeckProfile` is not implemented; save edited imports as DeckLab JSON.
- Text appearance is approximate. Referenced controller background images, SVG imports and native encoder feedback configuration are not rendered; source metadata is retained where present.
- Six verified model mappings: standard, Mini, XL, Plus, Neo and Plus XL. Other models use a virtual grid and report the fallback.
- Imports are limited to 64 MB expanded, 8 MB per archive entry, 5,000 entries and 16 MB of referenced image data. Large profiles may exceed browser autosave storage; the badge then requests a manual export.

Reference profiles and Elgato software/assets supplied for examination are not included in this release. The included demo was authored for DeckLab.
