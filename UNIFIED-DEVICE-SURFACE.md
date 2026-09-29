# Device rendering

`device-surface.js` owns the shared device geometry: chassis canvas, control rectangles and responsive scaling. Build, Live Preview and compatibility thumbnails use those coordinates. `ARTWORK_CALIBRATION` records landmarks in the bundled product images; `controlRect` maps them into the device canvas. Correct positions there rather than adding workspace-specific offsets.

The device photograph is a presentation layer with no pointer input. Action content is inset within each LCD aperture; editable selection and hit zones sit above it. Display appearance (Original, Backlit effect, Light off) changes the preview only. Product artwork provenance and licences are in [third-party notices](THIRD-PARTY-NOTICES.md).

## LCD surfaces

| Device | Artwork canvas | Segments / controls |
|---|---|---|
| Stream Deck + | 800 × 100 | Four 200 × 100 segments, left to right |
| Stream Deck + XL | 1200 × 100 | Six 200 × 100 segments, left to right |
| GALLEON | 400 × 200 | Four regions: 1/2 left, 3/4 right |
| Neo | 232 × 50 SDK action canvas | One informational Infobar action |

Full-screen, vertical split, horizontal split and segment compositions are editor previews. They do not create additional physical dials or establish a native profile-export format. GALLEON has four independent action placements controlled through two dial sets; selecting an LCD region is a simulator shortcut on a non-touch screen. Exact GALLEON packet coordinates still need hardware traces.

Each dial has an independent session angle. A 15-degree visual increment per simulated tick makes movement visible; it is not a claim about physical detents. Reduced-motion preferences disable the transition while keeping position feedback.

## Artwork layers

`studio-visuals.js` resolves placement artwork. `customVisual.background` stores the background image and its attribution; `customVisual.image` and `artworkCredit` store the foreground. State-specific overrides use `customVisual.states`. Older template-only image fields are interpreted as backgrounds when resolved and migrated on edit. DOM image layers retain transparent pixels and GIF animation; the static asset creator edits the foreground independently.

`display-artwork.js` uses the same two-layer representation for each page's full/split/segment LCD artwork. These page layers sit beneath action feedback and widgets. Action backgrounds and page backgrounds are separate: an opaque action image can cover page artwork.

## Validation boundaries

Geometry tests compare rendered rectangles with recorded image landmarks across device colours and preview scales. Artwork tests check rendered transparency, state isolation, persistence and independent layer editing. These are specification/reference checks; no physical-device validation is claimed. See [testing](TESTING.md) and [hardware validation](HARDWARE-VALIDATION.md).
