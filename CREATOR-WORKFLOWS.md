# Artwork and profile tools

## Background plus image/icon

Select an action in **Device Studio → Build**. The inspector has two separate rows:

- **Background → Colour templates:** choose a finish, colour and tone.
- **Image / icon → Choose image / icon:** choose from My artwork or Elgato icons, or upload an image into the library.

Either order works. Transparent areas of the foreground reveal the background. Use the × beside either row to remove only that layer; Reset artwork restores the action's default visuals. Title, action settings, Undo/Redo, copy/paste and saved profiles remain independent of the layer pickers. Both source notices travel with exported profiles.

The same rows are available under **LCD artwork · full screen & segments** for the chosen region. Use the composition selector for full, vertical split, horizontal split or segments. Action feedback can be hidden to inspect the page artwork. Templates saved to My artwork retain their background role when reused.

## Reusable artwork

Import icon pack accepts readable `.sdIcons`, `.streamDeckIconPack` and ZIP packages. Import pack folder accepts an extracted pack containing `manifest.json`, `icons.json` and `icons/`. Try `examples/decklab-demo.streamDeckIconPack`.

Search by name, pack or tag; star favourites or show recent artwork. Dock beside deck to drag onto a key or LCD action. The library is local to this browser/origin. Export it before clearing browser data. Removing a library entry leaves placed artwork intact. GIF bytes are preserved on direct placement.

The built-in Elgato catalogue includes 1,241 MIT-licensed icons. Monochrome icons can be recoloured; multicolour variants keep their original colours. The + button saves an icon into My artwork.

## Asset creator

Create / edit asset edits the foreground's image, text, colour, fit, zoom and position. A colour-template background stays separate; the creator starts transparent when one exists. Choose state A or B, then Apply or Cancel. Adding B artwork does not add state-toggle behaviour to a single-state action. Save to artwork saves the foreground asset.

The creator produces static PNGs: GIF sources become still images. Its safe-area overlay is an editing guide and is not exported or hardware-validated. Canvas sizes are 144 × 144 for keys, 200 × 100 for Encoder feedback and 232 × 50 for Neo.

## Profiles and examples

Explore profile lists pages, folders and assignments. Check device fit is read-only; View on this device preserves assignments, including those outside the new device's range. It does not automatically migrate the layout. Starter examples add simulated demo pages to the current profile.

Multi Actions contain ordered actions and waits. The sequence editor can move, duplicate or remove steps and change delays. Interaction scenarios simulate inputs and application conditions; they do not monitor or launch real applications.

## Import boundaries

Icon/profile packages are data; imported scripts are not executed. Simple SVGs are validated and rasterized. Active or externally referenced SVG content is rejected, so some complex icons need conversion first. Large collections can exceed browser storage limits; keep exported backups. See [privacy](PRIVACY.md), [testing](TESTING.md) and [protocol coverage](PROTOCOL-COVERAGE.md).
