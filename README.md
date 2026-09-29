# DeckLab — Community Alpha

**1.3.10-alpha.32 · community alpha**

DeckLab is an independent local studio for building Stream Deck profiles, previewing artwork and testing documented plugin behaviour on virtual device models. It is not affiliated with, endorsed by, or supported by Elgato or CORSAIR.

## Start on Windows

You need Python 3.10 or newer and a recent Chrome or Edge browser. Normal use needs no npm installation.

1. Close any earlier DeckLab companion/PowerShell window. Extract this release into a new folder.
2. Open that folder in File Explorer. Type `powershell` in its address bar and press Enter.
3. Run `py -3 decklab_host.py` (or `python decklab_host.py`).
4. Open **http://127.0.0.1:8975** if the browser does not open automatically.
5. Confirm Help shows **1.3.10**. Load the demo plugin and build the demo profile.

On macOS/Linux, run `python3 decklab_host.py` in a terminal. Use the same browser and localhost address/port to retain autosaved data. Export a project before switching versions; keeping an old companion running can serve the old build.

## What to explore

- **Plugins:** discover catalogue links, inspect readable development packages, and manage a local plugin library. Marketplace-protected packages are identified; DeckLab does not decrypt them.
- **Project:** import/export project data and keep project notes.
- **Device Studio → Build:** edit actions, titles and artwork together. Layouts & assets, LCD artwork, the Icon Library and asset creation belong here. Colour variants and Original / Backlit effect / Light off affect the device preview.
- **Live Preview:** operate keys and dials and try the built-in simulations. These demo values are simulated, not live PC monitoring.
- **Advanced → Test / Inspect:** use plugin QA, package details and protocol tooling.
- **Reports:** inspect SDK coverage, run the protocol fixtures, export reports and compare supplied hardware traces.

Try `examples/builtin-actions.streamDeckProfile`, the starter pages and the LCD demos. Native profile imports reconstruct supported pages/folders/actions; unsupported fields and device behaviour may require manual adjustment. Readable icon packs and animated artwork are supported; the asset creator produces static artwork.

The + and + XL provide full-strip artwork and four/six segments respectively. GALLEON provides full-screen, vertical/horizontal split and four independent regions (1/2 left, 3/4 right). Selecting a GALLEON region chooses the corresponding dial action; these clicks are simulator shortcuts, not hardware touchscreen events.

## Testing scope

This is a specification-based simulator, not a hardware-certified emulator. Some documented APIs remain partial or unsupported. The protocol inventory contains 55 directional entries and 256 fixtures; passing rejection tests does not imply support. No API currently has a claim of complete coverage or physical hardware validation. See [protocol coverage](PROTOCOL-COVERAGE.md) and [hardware validation](HARDWARE-VALIDATION.md).

The current release separates background templates from foreground images/icons and removes obsolete internal documentation. MPL-2.0 licensing, built-in colour templates and 1,241 Elgato icons remain included. Previous connection hardening, portable tests and Windows/Linux CI configuration remain in place. See [release notes](RELEASE-NOTES-1.3.10-alpha.32.md) and [testing instructions](TESTING.md). Automated browser checks do not establish Windows GPU behaviour, physical touch timing or complete compatibility with real plugins.

## Report a problem

Follow the [community test guide](COMMUNITY-ALPHA.md). Include the build, OS/browser, device and colour, zoom/scaling, steps and expected/actual results. For visual defects, include a screenshot. Export a **Create bug report** ZIP and review its contents before attaching it to an issue. Reports are never uploaded automatically.

For security problems, follow [SECURITY.md](SECURITY.md) instead of posting exploit details publicly. See [PRIVACY.md](PRIVACY.md) for storage and diagnostic boundaries.

## Optional live plugin demo

With Node.js 22 or newer, open a second terminal in the DeckLab folder:

```sh
node examples/live-plugin/com.decklab.live.sdPlugin/bin/plugin.js -port 8975 -pluginUUID com.decklab.hostdemo -registerEvent registerPlugin -info "{}"
```

DeckLab does not launch imported plugin executables. Only run code you trust; a manually launched plugin is a normal native process. Stop it when finished.

## Developers and publication

Run `npm ci --ignore-scripts`, `npx playwright install chromium`, then `npm test`. See [TESTING.md](TESTING.md) for prerequisites and test groups. All 23 suites passed in the local Linux browser environment, including the independent artwork-layer regressions. The [GitHub Actions workflow](https://github.com/violet89-stack/DeckLab/actions) tests Windows and Linux; consult its actual run results separately from the recorded local tests.

DeckLab is licensed under MPL-2.0. The product artwork and colour templates are separately licensed CC BY 4.0, with attribution to Elgato and Will Johnson. Elgato Icons are separately licensed MIT, copyright Corsair Memory Inc. The public repository is [violet89-stack/DeckLab](https://github.com/violet89-stack/DeckLab). See [publishing checklist](GITHUB-PUBLISHING-CHECKLIST.md), [licence status](LICENSE-NOTICE.md), [third-party notices](THIRD-PARTY-NOTICES.md) and [contributing](CONTRIBUTING.md).

## Colour templates

In Build, choose **Colour templates** beside the selected action, in My artwork, or in **LCD artwork · full screen & segments**. Choose Flat, Glass, Gradient or Stroke; then a colour and tone. Preview before applying as a background or save the result to My artwork. A separately selected image/icon remains in front; the × beside each layer removes that layer only. Match selected surface tiles four/six panels on +/+ XL and a 2×2 grid on GALLEON. Other panel compositions are artwork choices and do not change the assigned controls. Templates also work on Neo actions and individual dial segments.

## Built-in Elgato icons

Choose an action in **Build → Image / icon → Choose image / icon**, then select **Elgato icons** in Artwork source. Search 1,241 local icons, filter regular/filled variants, recolour monochrome icons and click to apply. Dock the library to drag icons onto keys. The **+** button saves a rendered icon to My artwork, where favourites and recent items remain available. The icon sits above the selected background template. Titles and action assignments are preserved. The MIT licence and attribution travel with saved artwork and profile exports.

For detailed artwork/profile workflows see [creator tools](CREATOR-WORKFLOWS.md); for renderer architecture see [device rendering](UNIFIED-DEVICE-SURFACE.md). Older release notes are historical records, not current instructions.
