# DeckLab 1.3.10-alpha.32 — independent artwork layers

- Colour templates now set a background. Images and Elgato icons occupy a separate foreground, in either selection order.
- Build exposes Background and Image / icon rows with independent remove controls. Full/split/segment LCD artwork uses the same model and can select icons from the library.
- Transparency and direct GIF placement are preserved. Old template-only profiles migrate when edited. Saved templates retain their background role; profile export retains both CC BY template credits and the full MIT icon notice.
- Undo/Redo, state artwork and the foreground asset creator preserve the other layer.
- Removed the AJAZZ comparison and 21 obsolete internal/redundant documents. Consolidated useful rendering and creator guidance, repaired references and removed the stale protocol-audit card. Historical release notes remain available.

Run the portable regression suite with `npm test`. Current evidence is in `verification/1.3.10/`; actual Windows/Linux runs are in GitHub Actions. No physical-hardware validation is claimed.

Stop any earlier companion before starting this build from a freshly extracted folder. Help should show **1.3.10**.
