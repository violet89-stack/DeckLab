# Peripheral hardware calibration

DeckLab 1.0.5-alpha.5 introduces hardware-specific shells for devices that expose Stream Deck actions but are **not themselves rectangular Stream Deck panels**.

## SCIMITAR ELITE WIRELESS SE

DeckLab models the 12 physical thumb buttons as a 4×3 side Key Slider embedded in a mouse silhouette. The shell is visually calibrated from product reference imagery; it is not a dimensionally exact CAD model. The Stream Deck action surface is input-only.

## GALLEON 100 SD

DeckLab models the device as a gaming keyboard with a dedicated right-side Stream Deck module containing:

- 12 LCD keys arranged 4×3
- two rotary encoders
- a separate, non-touch information display

The display is represented as the visual-feedback area associated with the dial/widget experience. It is deliberately not modelled as a Stream Deck + touch strip. The surrounding QWERTY keyboard is decorative context and does not become extra Stream Deck action slots.

## Stream Deck Pedal

The official top-view footprint is 175 × 244 mm and the hardware has three customizable footswitches. DeckLab models the two side pedals and larger center pedal as input-only Keypad action surfaces. Internal pedal-zone geometry is visually calibrated from product imagery rather than manufacturer CAD measurements.

## Fidelity status

These previews are **reference-image/spec calibrated**. Product type, controller count, action-surface arrangement, and documented capabilities are treated as factual; exact curves, bezel offsets, mouse contours, keyboard keycap dimensions, and pedal-zone boundaries remain visual approximations until compared against physical hardware.
