# DeckLab 1.3.3 alpha.25 — encoder review

## Repairs
- Mobile Pro now lives in the collapsed Other surfaces group. Existing Mobile profiles remain supported.
- The bundled Host Demo CPU Dial now responds locally to rotation in Device Studio and Host Inspector when no plugin is connected. Its percentage and bar update together, independently per dial, bounded to 0–100.
- A connected plugin retains ownership of its feedback. Imported plugins are not given invented responses: they need their actual runtime to implement dial input and send feedback.
- The bundled live Node demo now accumulates dial values and updates both text and bar. Manual adjustment pauses the CPU sample timer for that context until the next willAppear. Duplicate willAppear no longer leaks timers.

## Evaluation
All 13 test scripts passed after correcting an asynchronous assertion in the artwork test (wait for save/close rather than checking immediately).

| Area | Result |
| --- | --- |
| Overlay geometry | 1,148 image landmark assertions across device models, colours, modes and zoom passed |
| Dials | Wheel, arrows, press/release, dragging, redraw persistence; new CPU feedback checks on +, + XL, GALLEON and Studio passed |
| CPU sample | Bounds, disconnected guard, live plugin ownership, Host Inspector feedback passed |
| Live sample logic | Accumulating values, timer ownership, independent contexts and lifecycle cleanup passed using a simulated WebSocket |
| Studio | Shared Build/Live profile, colour persistence, title/image editing, duplication, undo and export/import passed |
| Artwork and profiles | Full/segment LCD artwork, opacity, feedback visibility, icon packs, library backup/restore, creator A/B, native profile corruption rejection passed |
| SDK | 256 fixtures passed; browser PI/settings/resources/version/report integration passed |
| Packaging/runtime | JavaScript/Python syntax and real localhost companion HTTP serving checked |

Reviewed a rendered Live Preview screenshot for encoder feedback and alignment. SDK coverage remains 33/54 current directional APIs with passing core behaviour cases; no claim of complete protocol support or physical-device validation.

Limitations: browser checks used Linux Chromium. Windows PowerShell launch behaviour, real Stream Deck hardware, and arbitrary third-party plugin execution were not tested. Live sample logic tests simulated WebSocket delivery; this is not a full external plugin end-to-end certification.

## Start
Close the old DeckLab PowerShell/terminal before starting the companion from this extracted release. This preserves the usual localhost origin and browser-saved profiles. Clearing browser data is unnecessary.
