# Stream Deck Studio hardware calibration

DeckLab 1.0.5-alpha.5 replaces the earlier generic 4×8 representation of Stream Deck Studio with a rackmount-specific face model.

## Manufacturer-backed facts

- Professional rackmount control surface designed for a standard 19-inch 1U rack.
- 32 customizable LCD keys.
- The physical face is represented as 2 rows × 16 keys, matching product imagery and the rack-width control layout.
- 2 fixed 360° encoders with push function, LED indicator, and LED ring.
- Chassis dimensions: 447 × 80 × 44 mm.
- Integrated NFC support.
- RJ45 Ethernet PoE+ and USB-C connectivity.
- Best with Bitfocus Buttons and compatible with Bitfocus Companion. Standard Stream Deck app profile distribution is treated separately in DeckLab.

## DeckLab geometry

The outer rack face and height are anchored to the published dimensions. Exact key pitch, encoder diameter, rack-ear geometry, and internal offsets are visually calibrated from product imagery rather than claimed as manufacturer CAD measurements. Until compared against physical hardware, this preview remains **spec/reference calibrated, hardware unverified**.

## Profile migration

Older DeckLab builds represented Studio as a generic 4×8 grid. When a Studio profile contains placements in rows 3–4, DeckLab 1.0.5 migrates the row-major slot index into the new 2×16 rack layout so all 32 key assignments retain their sequence.
