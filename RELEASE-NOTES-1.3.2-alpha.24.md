# DeckLab 1.3.2-alpha.24 — Full displays and segments

Build now has an expandable **LCD artwork · full screen & segments** section at the top of the inspector for Stream Deck +, + XL and Galleon.

- Stream Deck +: full touch strip plus four horizontal artwork segments.
- Stream Deck + XL: full touch strip plus six horizontal artwork segments.
- Galleon: full LCD screen plus four artwork regions, numbered 1 top left, 2 bottom left, 3 top right, 4 bottom right, following the supplied reference.
- Each area accepts PNG/JPEG/GIF/WebP, Fill or Fit, and an optional opaque black background. Transparent/unfilled segments reveal the full-screen background. Remove image does not remove the other layers.
- Action feedback may be shown above the artwork or hidden to inspect the complete design. This visibility control does not stop runtime actions.
- Artwork is stored separately per page and device and survives undo, autosave and DeckLab profile export/import. It is a preview composition, not a new SDK full-screen command or four independent Galleon encoder contexts.
- MK.2 labels now read Black, White, Wild Lavender, Pink Petal, Glacier Ice, Forest Green and Atomic Purple. Existing saved colour IDs remain compatible.

Validation covers the full/segment selectors, opaque fill, feedback visibility, Build/Live rendering, profile round-trip preservation, Galleon segment ordering and colour names. Existing alignment/dial and shared studio checks pass. Physical hardware validation is unchanged.
