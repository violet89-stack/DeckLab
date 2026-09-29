# DeckLab 1.1.6 alpha.18 — Device colours and focused modes

- Colour choices use the supplied device artwork: MK.2 Black, White, Purple, Pink, Blue, Green and Transparent purple; Neo Black/White; Stream Deck + Black/White.
- Colour is a per-model browser preference. It changes artwork without replacing placements, pages, settings or device geometry. Models with a single finish hide the selector.
- Scissor Keys is removed from the device/appearance picker; legacy imported scissor profiles map to the standard layout.
- Build and Live Preview use the same profile. Build shows actions and settings. Live Preview hides editing controls and uses a single click for keys, folders and touch strips; dials retain wheel/press interaction.
- Live Preview blocks drag/drop, editing keyboard shortcuts and placement context menus. Navigation remains available. Built-in system actions still simulate; external plugins still require a connection.
- Short labels, hover/focus tooltips, compact action cards, and collapsible profile/plugin sections reduce visual clutter. Desktop settings sit alongside the device; smaller layouts stack.
- Artwork opens the previous independent artwork/animation sandbox. Test and Inspect remain available as secondary tools.

## Try it
Choose Device Studio, select a device and its Colour, then Build a profile or import the included example. Switch to Live Preview to run it. Save the profile under Profile & pages → Export.

## Checks
Chromium checks covered colour selection and per-model retention, selector hiding for Mini, shared profile state across modes, single-click page navigation, blocked Delete, and absence of page errors. Build and Live screenshots were visually inspected. Existing native import, device geometry and catalogue regression tests passed.

Colour preferences are local to this browser, not embedded in exported profiles. These remain simulated surfaces, not a connection to physical hardware.
