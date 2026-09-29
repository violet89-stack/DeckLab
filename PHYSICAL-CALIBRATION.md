# Physical preview calibration

DeckLab 1.0.3-alpha.3 changes the hardware preview from **grid-normalized** scaling to **device-calibrated** scaling for first-party Stream Deck hardware.

## Why this changed

Earlier builds let each key grid expand to fill a generic preview shell. That made devices with fewer keys look as though they had much larger keys. The clearest example was Stream Deck Mini: its 3×2 keys inflated substantially compared with the 5×3 Stream Deck/MK.2 even though product photography shows them in the same general physical key class.

## What is now anchored to published specifications

DeckLab uses manufacturer chassis widths for the physical preview where those dimensions are published:

- Stream Deck / MK.2 / Scissor Keys: 118 mm
- Stream Deck Mini: 84 mm
- Stream Deck XL: 182 mm
- Stream Deck Neo: 107 mm
- Stream Deck +: 138 mm horizontal width (from the published D × W × H dimensions)
- Stream Deck + XL: 205 mm horizontal span

The Stream Deck + touch panel is modelled at its published 108 mm width, and Stream Deck + XL at 161 mm.

## Key size

Elgato publishes key image resolutions, but not the physical width of the key caps/LCD apertures in millimetres. DeckLab therefore uses a shared calibrated visual key unit for Mini, 15-key, XL, Neo and + families rather than claiming a laboratory-accurate physical measurement. The important change is that **key count no longer determines key size**.

This is currently marked **spec-modelled, hardware-unverified**. Community measurements/photos can refine individual device geometry later.

## Where the calibration applies

The same scaling model is used in:

- Device Studio Preview
- Device Studio Build
- Device Compatibility mini previews

Mobile, Virtual Stream Deck and XENEON EDGE remain schematic or screen-surface models. SCIMITAR, Pedal, Galleon and Studio now have reference/spec-calibrated hardware shells, but their internal control measurements are still community-hardware-unverified.
