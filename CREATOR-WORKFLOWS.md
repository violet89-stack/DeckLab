# Creator workflow checklist

| Idea | Current implementation | Remaining work |
|---|---|---|
| Built-in catalogue | Canonical JS metadata for 17 built-ins/demos, stable IDs/controllers/defaults/states/configuration, separate runtime handlers | More built-ins and schema-driven complex controls |
| Profile structures/importer/explorer | Existing native importer plus navigable page/folder explorer, settings/source inspection, device fit and preserved assignments | Automatic migration/reflow, broader real-profile corpus and round-trip native export |
| Multi Action sequencing | Ordered actions, waits, A/B switch, move/remove, duplicate, editable delays and running-step presentation | Rich per-step settings/state editing and more edge-case runtime tests |
| Dial/touch grouping | Existing encoder surfaces plus grouped dial demo and selection-based rotation test | True stacked actions on one dial, stack selection/lifecycle parity |
| Neo Infobar | Independent Neo surface, static asset composition and status/media/monitoring starter pages | More templates and hardware validation |
| Icon packs | Readable ZIP packages/extracted directories, manifest/index metadata, tags, favourites, recent use, drag/drop, animated GIF reuse | Protected/encrypted packages, arbitrary legacy encodings, complex SVG compatibility |
| Key/asset creator | Static background/image/text layers, alignment, fit/crop, zoom/pan, A/B visuals, safe guide, Apply/Cancel preview, PNG library saves | Arbitrary layer stacks, animation editing, per-layer selection and full vector editing |
| Advanced interactions | Manual hold/double/touch-hold and grouped dial scenarios | Actual Action Wheel/Trigger/Key Logic compatibility; gesture interpretation remains the action’s responsibility |
| Starter profiles/tutorials | Additive named starter pages and contextual usage guidance | Full step-by-step onboarding tours and broader task-specific starters |
| Smart Profiles | Explicit application-name → page simulation, logged without launching a process | Persistent rules, cross-profile activation and automatic OS detection |
| Catalogue/package/loader/runtime boundaries | Existing browsing/static inspection separated from user-started plugin runtime; icon/profile imports are data only | More integration testing across real plugins; no protected Marketplace loader recreation |
| Protocol coverage | Existing canonical inventory, version gates, fixtures, Reports and trace comparison | Full remaining APIs and real hardware evidence; coverage unchanged by these UI additions |

## How to use

1. Build → select an action → Choose image. Import icon pack accepts readable ZIP packages. Import pack folder accepts an extracted folder containing manifest.json, icons.json and icons/. Try examples/decklab-demo.streamDeckIconPack (two original CC0 sample icons).
2. Search by icon name, pack or tag. Star favourites. Choose Dock beside deck, then drag an icon onto a key or LCD segment. The library is local to this browser/origin; Export preserves collection metadata and images.
3. Explore profile opens a navigable page/folder inventory. Check device fit does not mutate the profile. View on this device changes the virtual target while preserving assignments; out-of-range controls stay in the profile. It does not migrate them automatically.
4. Create / edit asset opens a static raster composer for the selected placement. Upload/select an image first to use it as the image layer. Edit either visual state, inspect the physical preview, then Apply or Cancel. A/B visuals follow the action’s state; defining B does not add a state-toggle behavior to a single-state action.
5. Starter examples adds demo pages to the current profile. Neo and Dial studio select their corresponding virtual device. The named starters are illustrative simulations, not working integrations with streaming/gaming/monitoring services.
6. Interaction scenarios is an expandable inspector panel. Gesture packets test an action’s response; a double press is two press/release pairs, not a new claimed SDK event. The application condition is a manually selected page transition, not real Smart Profile emulation.

## Import and rendering boundaries

The icon reader follows the public manifest and icon index description at https://docs.elgato.com/stream-deck/icons/api/. It does not execute package scripts or load external resources. Raster icon data is preserved, including GIF bytes. Simple SVGs are validated and converted to 144×144 PNG; referenced/active SVG content is rejected, including image/use/style/animation elements and URL references. SVG animations and some otherwise safe complex SVGs therefore need raster conversion before import. Pack validation checks all indexed files before storing; a storage failure may leave a reported partial import. Import is additive and duplicate image bytes are skipped.

The static creator uses 144×144 for keys, 200×100 for encoder segments and 232×50 for the Neo layout canvas. Its 8% inset is a visual composition guide, not a newly hardware-validated safe-area specification. GIF composition produces a still image; use direct library placement to retain animation. No new physical-device validation is claimed.

## Verification

New browser workflow checks cover A/B preview/apply/cancel, state resolution, manifest/tag metadata, unsafe paths, readable ZIP pack input including SVG conversion, favourites, drag onto an empty key, profile exploration, additive Neo pages, and Multi Action duplicate/edit-delay controls. Existing refinement, unified Build, shared Live Preview, native importer, catalogue and protocol checks pass. All 256 protocol fixtures still pass. Visual inspection covered the new creator and sequence editor at a desktop viewport. More browsers, large real-world packs, complex native profiles and real hardware remain unvalidated.
