# DeckLab 1.3.5 alpha.27 — independent GALLEON actions and LCD composition

The previous release incorrectly linked GALLEON's top/bottom regions. CORSAIR documents two dial sets with four actions. This release replaces that restriction.

## Use
Build → LCD layout, widgets & artwork → Build layout:
- Full screen / strip
- Vertical split (left/right)
- Horizontal split (top/bottom)
- Separate segments (GALLEON 4, Stream Deck + 4, + XL 6)

Select a region and choose its content: dial action feedback, a built-in simulated widget, or artwork only. Widgets have independent types and sample values. Each region retains its own image, fit and opaque-fill choice. Changing composition hides unused regions without deleting their content.

GALLEON's four segment actions are independent. Slots 1/2 are left top/bottom; 3/4 right top/bottom. Each has its own context, settings, artwork and feedback. Hold a dial for three seconds, then release, to switch its active top/bottom action. Build also exposes explicit left/right action selectors. A short press activates the current action; wheel, arrows and drag adjust it. Cancelled presses do not activate actions. Turning while held does not trigger a set switch on release.

Full/split feedback can select from the four action slots. Independent built-in widgets and artwork do not require a dial action. Widget values are simulated, not live hardware sensor readings. Native .icuewidget execution is not included.

## Preservation and validation
Existing two-action profiles retain their original left/right top actions. Lower slots start independently. Old full-display source choices migrate from physical dial indexes to action-slot indexes. Composition, widget settings, artwork, active dial set and four actions survive profile export/import. Build edits retain undo support.

New browser tests cover four distinct contexts, 2×2 placement coordinates, independent values, a real three-second keyboard hold/release, all four composition modes, independent widget/artwork content, runtime feedback isolation and profile round trips. Existing artwork, touch routing, encoder, refinement, creator, Studio, protocol-browser and 1,148 alignment assertions passed. All 256 protocol fixtures passed. Screenshot reviewed.

Physical-device packet validation remains outstanding: GALLEON uses a provisional 2×2 logical encoder-coordinate model. Short press events are emitted on release so a long hold can be reserved for dial-set switching. Full/split compositions are DeckLab preview/editor features, not a claim that every composition exports to native Stream Deck/iCUE software. SDK coverage percentages are unchanged.

See RESOURCE-REVIEW-1.3.5.md for SDK and iCUE findings and source links.
