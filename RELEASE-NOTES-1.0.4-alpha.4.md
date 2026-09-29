# DeckLab 1.0.5-alpha.5 — Peripheral Hardware Shell Calibration

This Community Alpha corrects three non-standard hardware previews that were previously represented as generic Stream Deck grids.

## Corrected hardware models

### CORSAIR SCIMITAR ELITE WIRELESS SE

- Rendered as a gaming mouse rather than a rectangular keypad.
- The Stream Deck action surface is the adjustable 12-button Key Slider on the mouse side.
- Corrected the Key Slider orientation to 4 rows × 3 columns.
- The buttons remain input-only in DeckLab: plugin artwork/title/animation is not presented as if the mouse had LCD keys.

### CORSAIR GALLEON 100 SD

- Rendered in full-keyboard context with the integrated Stream Deck module on the right.
- Corrected the LCD-key block to 4 rows × 3 columns.
- Added the two physical rotary dials and a separate non-touch information display.
- Encoder feedback is shown in the information-display region rather than pretending the keyboard has a Stream Deck + touch strip.

### Stream Deck Pedal

- Rendered as the physical three-pedal foot controller rather than three generic keypad buttons.
- The larger center footswitch and two side footswitches now have distinct shapes.
- The device remains input-only: assignments can be previewed/configured, but LCD feedback is not simulated.

## Profile compatibility

Profile Lab and compatibility mini previews now use matching hardware-specific shells. Legacy SCIMITAR/GALLEON profiles created with the old 3×4 model are migrated to the new 4×3 order when the old fourth column is present.

## Security

No change. DeckLab remains localhost-only and does not automatically launch imported plugin executables.
