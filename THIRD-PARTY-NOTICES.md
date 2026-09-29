# Third-party notices

## Stream Deck Templates

**Creators:** Elgato and Will Johnson.
**Resource:** Stream Deck Templates.
**Source:** https://www.figma.com/community/file/1315040482142393672/stream-deck-templates
**Licence:** Creative Commons Attribution 4.0 International (**CC BY 4.0**) — https://creativecommons.org/licenses/by/4.0/

Product previews in `assets/elgato/` and colour-template sheets in `assets/elgato-colour-templates/` come from this resource as supplied by the owner. The resource screenshot supplied on 30 September 2026 explicitly identifies the creators and licence; it is retained under `assets/licence-evidence/`. Per-file inventories and hashes identify the bundled material.

DeckLab adapts presentation through cropping, resizing, tiling/compositing and live key/LCD/dial/editor overlays. The original colour-template PNGs are preserved; only the rendered/exported selection is adapted. Corrections to three Stroke colour labels are documented in the template attribution file.

These images and adaptations remain under CC BY 4.0, independently of DeckLab's MPL-2.0 source-code licence. Retain attribution, the source/licence links and a description of adaptations when redistributing them. This use does not imply endorsement by Elgato, Will Johnson or CORSAIR. Product names and marks remain their owners' property.

## Elgato Icons

**Source:** https://github.com/elgatosf/icons
**Pinned package:** `@elgato/icons` 2.5.1.
**Licence:** MIT. **Copyright (c) 2025 Corsair Memory Inc.**

The complete upstream notice is in [assets/elgato-icons/LICENSE](assets/elgato-icons/LICENSE). The local catalogue contains 1,241 original SVG icon names/variants, deduplicated across source sizes. DeckLab can recolour monochrome icons and rasterize them with transparent padding. Saved artwork and profile exports retain the MIT notice. No upstream executable code or fonts are bundled. See [icon attribution](assets/elgato-icons/ATTRIBUTION.md).

## Development dependencies

Playwright and Playwright Core are test-only npm dependencies under Apache-2.0; see their installed licence files and https://github.com/microsoft/playwright/blob/main/LICENSE . They are installed with `npm ci` and are not bundled into the release ZIP.

Official SDK documentation informs the protocol model. Imported plugins, profiles and icon packs retain their own rights. DeckLab does not grant redistribution rights to imported content or decrypt Marketplace-protected packages.
