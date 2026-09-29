# DeckLab 1.3.0-alpha.22 — Creator workflows

- Built-in actions and LCD demos now share one canonical metadata catalogue (`builtin-catalogue.js`), including IDs, controller support, defaults, states, configuration and demo descriptions. Rendering/interaction handlers remain separate.
- My artwork imports readable ZIP-based `.streamDeckIconPack`, `.sdIcons` and `.zip` packages, or extracted pack folders. Names, tags, pack, author, version and licence text are retained. Search includes pack names and tags; favourites and recently used sorting are available.
- Dock the artwork picker to drag images onto existing actions or empty key/LCD slots. Empty slots become Artwork only actions. Live Preview rejects editing.
- Profile explorer lists pages, nested folders, assignments, settings and retained source data, with device-fit warnings and a View on this device action. Positions are preserved, not automatically rearranged.
- Asset creator provides background/image/text composition, fit/fill, zoom/pan crop, text alignment, A/B artwork, a non-exported safe-area guide and immediate device preview. Apply saves; Cancel discards preview. Save to artwork creates a reusable static PNG. Recipes are retained with the profile.
- Starter examples add new pages without replacing existing work. Neo Infobar provides status/media/monitoring pages; Dial studio provides grouped encoder examples.
- Multi Actions gain duplicate-step controls, editable delays and readable state descriptions. Manual interaction scenarios provide hold, double press, touch hold, grouped dial rotation and an explicit application-name → page test.

Validated with browser workflows, existing studio/profile regression checks and the unchanged 256 protocol fixtures. See CREATOR-WORKFLOWS.md for exact boundaries.
