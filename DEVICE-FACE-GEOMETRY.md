# Device Studio Preview face geometry

DeckLab 1.0.3 separates **outer physical scale** from **internal face geometry**.

## Specification-backed dimensions

- Stream Deck / MK.2: 118 × 84 mm face footprint
- Stream Deck Scissor Keys: 118 × 84 mm face footprint
- Stream Deck Mini: 84 × 60 mm face footprint
- Stream Deck XL: 182 × 112 mm face footprint
- Stream Deck Neo: 107 × 78 mm face footprint
- Stream Deck +: 140 mm chassis width; touch panel 108 × 14 mm
- Stream Deck + XL: 205 mm chassis width; touch panel 161 × 14 mm; 147 mm calibrated face-height anchor

## Visually calibrated dimensions

Elgato does not publish physical key-cap dimensions or every internal offset. DeckLab therefore uses a shared approximately 18.8 mm classic key unit, explicit horizontal/vertical pitch, and family-specific top/bottom offsets. These are marked as **hardware-unverified** until checked against measurements from physical devices.

## Why this changed

Earlier builds correctly scaled overall chassis width but still laid controls using generic CSS margins and content height. That could produce correct outer dimensions with incorrect internal alignment. 1.0.3 treats each face as a measured layout surface.

## Non-panel peripherals (1.0.4)

SCIMITAR ELITE WIRELESS SE, GALLEON 100 SD, and Stream Deck Pedal no longer use the generic rectangular Stream Deck face renderer. Their Stream Deck action surfaces are anchored inside mouse, keyboard, and foot-pedal shells respectively. See `PERIPHERAL-HARDWARE-CALIBRATION.md`.
