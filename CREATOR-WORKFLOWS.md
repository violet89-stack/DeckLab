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

Create / edit asset edits the foreground's image, text, colour, fit, zoom and position. A colour-template background stays separate; the creator starts transparent when one exists. Choose state A or B, then Apply or Cancel. Adding B artwork does not add state-toggle behaviour to a single-state action. Save editable design stores the composition and its editing recipe in My artwork.

The creator produces static PNGs: GIF sources become still images. Its safe-area overlay is an editing guide and is not exported or hardware-validated. Canvas sizes are 144 × 144 for keys, 200 × 100 for Encoder feedback and 232 × 50 for Neo.

## Save an editable icon design

1. Select a placed action in **Device Studio → Build** and compose its background, foreground image and title.
2. Choose **Save icon design**, give it a name, and select **Save to My artwork**.
3. Open **Icon library → My artwork** and select the saved design to apply it to a matching canvas. The card is marked **editable**. Applying it changes the artwork, preserving the action and its settings.

Designs retain separate layers, titles, source credits, and A/B artwork. In **Create / edit asset**, **Save editable design** also keeps the text, crop, zoom, position and original source so they can be edited after reopening. Save does not require Apply first; Cancel can still leave the original placed artwork unchanged.

Use **PNG** on a saved design card to download a static, composed state-A icon. Use **Export** in My artwork to back up editable designs alongside your images, and **Import** to restore them on another browser or computer. Directly saved GIF artwork preserves its animation in the design; library thumbnails and PNG downloads are still images. The asset creator continues to render static artwork.

Designs use a specific canvas: Keypad, Encoder or Neo. A design cannot silently replace a different canvas or full-screen LCD artwork. Existing image and colour-template library items still apply as separate layers.

## Save and reopen profile builds

Open **Device Studio → Build → Saved builds**. Enter a name and choose **Save new build** to keep a separate local copy. Each saved build offers **Open**, **Download**, **Update**, **Rename**, **Duplicate** and **Delete**. Updating asks before replacing a saved build; Save new build always creates a separate entry.

Builds retain the selected device model, all pages and folders, action assignments and settings, Multi Action sequences, editable icon designs, LCD compositions and embedded artwork. Plugin executables and local plugin global settings are excluded; load the relevant plugin separately to run its behaviour. Unsupported actions remain placeholders.

Opening a saved build first stores your current profile in a **Recovery** entry. Updating stores the previous saved version there. Only the latest recovery is kept; save or download it if you want to keep it permanently. If the recovery write fails, DeckLab leaves your open profile unchanged.

**Download current profile** exports a `.decklab-profile.json` even if you have not saved a library entry. **Back up all builds** downloads a library backup; **Import** accepts that backup or a DeckLab profile JSON and adds copies without replacing the open deck. These are editable DeckLab files, not a claim of native Stream Deck profile export compatibility.

Local saves belong to the browser and localhost origin. Keep the same address and port after upgrading. Download both your artwork library and saved builds before clearing browser data or changing computers. Autosave continues to protect the current working profile separately from named saves.

## Profiles and examples

Explore profile lists pages, folders and assignments. Check device fit is read-only; View on this device preserves assignments, including those outside the new device's range. It does not automatically migrate the layout. Starter examples add simulated demo pages to the current profile.

Multi Actions contain ordered actions and waits. The sequence editor can move, duplicate or remove steps and change delays. Interaction scenarios simulate inputs and application conditions; they do not monitor or launch real applications.

## Import boundaries

Icon/profile packages are data; imported scripts are not executed. Simple SVGs are validated and rasterized. Active or externally referenced SVG content is rejected, so some complex icons need conversion first. Large collections can exceed browser storage limits; keep exported backups. See [privacy](PRIVACY.md), [testing](TESTING.md) and [protocol coverage](PROTOCOL-COVERAGE.md).

## Built-in samples

Open **Build → Icon library**. The artwork picker includes **Built-in samples** alongside My artwork and Elgato icons. **Neo Dino Runner** is a bundled 232 × 50 animated GIF. Click to apply it to the selected action, or dock the picker and drag it onto an empty Neo Infobar to create an Artwork only action. The thumbnail and directly placed image stay animated. Saving it to My artwork enables favourites; removing that optional copy does not remove the bundled sample. Profile exports embed the original GIF bytes.
