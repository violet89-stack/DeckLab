# AJAZZ Control Center vs DeckLab

This note compares the user-supplied AJAZZ Control Center source tree with DeckLab's current purpose. It is a feature/architecture comparison only; DeckLab does not copy AJAZZ source code.

## AJAZZ Control Center does things DeckLab intentionally does not currently do

- Controls **real hardware** over HID and supports hot-plugged devices.
- Changes device-specific RGB, DPI, macros, layers, firmware-facing settings, clocks and battery-related functions where supported.
- Acts as a day-to-day replacement control center for supported AJAZZ keyboards, mice and Stream Dock hardware.
- Includes a plugin catalogue/store experience and installer paths for plugin ecosystems.
- Hosts its own sandboxed Python plugin format in addition to Stream Deck-compatible plugin hosting.
- Is a native Qt/C++ cross-platform desktop app with platform installers/packages.
- Has modular hardware backends and extensive device-protocol reverse-engineering/verification infrastructure.

## DeckLab does things AJAZZ Control Center is not primarily designed for

- Simulates many **Elgato/CORSAIR device surfaces without requiring the hardware**.
- Uses calibrated/official device preview art for visual profile and asset previewing.
- Lets a developer build one profile and compare/adapt it across multiple device families.
- Provides Stream Deck SDK layout rendering for keys, Encoder feedback, touch segments and Neo Infobar surfaces.
- Provides developer-oriented host simulation, context inspection, Property Inspector previewing and SDK event traces.
- Runs automated static/live plugin QA and keeps regression history.
- Produces compatibility reports and sanitized community bug reports.
- Keeps third-party plugin execution manual rather than silently starting imported code.

## Ideas worth adopting without changing DeckLab's identity

1. **Local plugin library view** — index many packages at once instead of importing one folder at a time.
2. **Package-status intelligence** — distinguish inspectable, protected and malformed plugin packages.
3. **Installed-plugin discovery workflow** — user selects a plugin root once, then browses packages inside DeckLab.
4. **Optional catalog integration later** — browse openly distributable test plugins without turning DeckLab into a hardware-control suite.
5. **Native packaging later** — once the alpha stabilizes, move toward a signed/portable desktop build for easier community testing.

## Not an immediate DeckLab goal

Direct RGB/DPI/firmware/device-management features are valuable in AJAZZ Control Center because it is a hardware control application. Adding those to DeckLab would broaden the product substantially and distract from its strongest role: visual simulation, profile/plugin development, compatibility testing and QA.
