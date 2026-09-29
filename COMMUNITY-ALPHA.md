# Community testing — 1.3.10-alpha.32

This alpha needs focused usability and compatibility feedback. It is not hardware-certified. Use a copy of an existing profile/project for testing and keep an exported backup.

## First 15 minutes

1. Stop any old companion, extract into a new folder and follow [Windows quick start](START-HERE-WINDOWS.txt). Confirm Help shows 1.3.10.
2. Load the demo plugin and build a demo profile. In **Build**, change a key's artwork and title, clear the title, hide/show it and switch colour variants. Check alignment at Fit and several zoom levels.
3. Try **Colour templates** on a key and on the full LCD/individual regions. Check Flat, Stroke, Gradient and Glass, colour/tone changes, and Save to My artwork. Add an Elgato icon over the background, remove each layer independently, and check Undo and save/reopen. Then try **Original**, **Backlit effect** and **Light off**. Check for page flicker while zoomed and for artwork covering the physical bezel.
4. On **Stream Deck + / + XL**, try full-strip artwork and all four/six segments. Turn every dial using wheel, arrow keys and drag. Replace the Encoder action on each dial, especially dial 4; its new feedback should follow the assigned action.
5. On **GALLEON**, try full-screen, vertical/horizontal splits and all four independent regions. Select both top and bottom rows and turn the corresponding dial. Selecting an LCD region is a simulator shortcut, not a hardware touch event.
6. On **Neo**, try an Infobar demo/layout. Check that informational content is distinct from key input.
7. Import the included profile and icon-pack examples. Assign an icon, create artwork, change a page/folder, and check Undo/Redo.
8. Switch Build / Live Preview / Reports. Save/export, refresh, reopen and compare the result.
9. Optionally run the trusted bundled live plugin in a separate terminal and check key/dial events. Stop the process afterward.

## Useful report details

Include build, OS and browser versions, Windows display scaling, browser zoom, DeckLab zoom, device/colour, action or starter name, reproduction steps and expected/actual behaviour. Say whether the test used a built-in simulation, an imported static package or a running native plugin. For hardware comparisons, include Stream Deck software/firmware versions and the exact hardware model.

Attach screenshots/video for visual defects and a reviewed **Create bug report** ZIP. Never upload proprietary plugin packages or unreviewed diagnostic data. Use the bug or hardware-verification issue template in GitHub. Report security issues privately as described in [SECURITY.md](SECURITY.md).
