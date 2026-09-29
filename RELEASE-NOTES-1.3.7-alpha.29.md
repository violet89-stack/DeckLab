# DeckLab 1.3.7 alpha.29 — LCD and dial repairs

Close the earlier DeckLab PowerShell/companion window, extract this release into a new folder and start `py -3 decklab_host.py`. Keep the same localhost address/port to retain browser data. Help should show **1.3.7 Community Alpha**.

## Active LCD area

Stream Deck + and + XL now place artwork, action feedback, widgets and touch targets inside the illuminated display area, leaving the surrounding black glass visible. All workspaces share the corrected geometry. The full and segmented views preserve the supplied canvas proportions:

| Device | Full canvas | Segments |
| --- | --- | --- |
| Stream Deck + | 800 × 100 | Four at 200 × 100 |
| Stream Deck + XL | 1200 × 100 | Six at 200 × 100 |

Full screen, vertical split, horizontal split and separate segments remain available in Build. Black and white + use the appropriate image scale. The positions are calibrated from the supplied references; they have not been measured against physical hardware.

## Dial selection and reassignment

The reported dial 4 problem was reproducible: selecting dial 4 left the LCD editor targeting the full display's source, dial 1. Changing the LCD Action field therefore changed dial 1 while dial 4 retained CPU. Physical dial selection now synchronizes the matching LCD region and its Action field. Segment bindings follow their own physical dial even if an old profile contains a stale source mapping.

A full-screen or split-screen composition keeps its chosen source when another dial is selected. In that case the unrelated LCD editor closes and the selected dial can be changed under Artwork & action. Selecting a visible LCD region reopens its editor.

Dropping an Encoder action from the library onto an occupied dial or segment now replaces the assigned action. Explicit user artwork is retained. Reassignment clears the previous action's settings, feedback layout and saved preview layout; a fresh plugin Encoder assignment no longer acquires an empty artwork override that hides its feedback layout. Undo and profile saving remain available.

## GALLEON lower row

Click either top or bottom LCD region to choose the action controlled by the corresponding physical dial. This works in Build and Live Preview, including keyboard selection with Enter/Space. Both columns retain independent active rows. Active regions have a subtle outline and the preview status identifies the selected dial action.

LCD clicks are a DeckLab selection shortcut. GALLEON remains modeled as a non-touch screen: region selection does not emit `touchTap`. Holding a dial for three seconds and releasing still switches its top/bottom action. Independent artwork and widget compositions remain separate from those action bindings.

## Verification

All 19 automated suites pass. The new regression suite exercises all 14 physical dials and all 16 Encoder action slots across Stream Deck +, + XL, GALLEON and Studio: selection, reassignment, occupied drops, keyboard/wheel/drag operation, press feedback, visible feedback, touch-zone routing where supported, and profile reload. It also checks GALLEON region selection/long holds, full-screen source preservation, legacy segment mappings and LCD aspect/inset geometry at two zoom levels.

The broader suite includes 256 protocol fixtures, 1,148 image-landmark checks, import/export, creator workflows, artwork, stable zoom, runtime layouts and the actual Python localhost HTTP/WebSocket companion. See `TESTING.md` and the historical records under `verification/1.3.7/`.

Physical-device validation and Windows GPU/compositor testing remain outstanding. Studio is still a modeled Bitfocus-host device, not certified Stream Deck-app compatibility. This repair does not increase SDK conformance or hardware-validation claims. Built-in widgets use simulated values; imported plugin feedback still depends on the connected plugin.
