# DeckLab 1.3.12-alpha.34 — Saved icons and profile builds

- **Save icon design** adds named, editable compositions to My artwork, preserving separate backgrounds, foregrounds, titles, A/B visuals, creator recipes and source credits.
- Saved designs can be reused, renamed, backed up and exported as static state-A PNGs. Directly saved GIF sources retain their bytes and animation when reapplied.
- **Build → Saved builds** keeps named profiles with Open, Download, Update, Rename, Duplicate and Delete controls. Downloadable backups support moving the library between browsers.
- Opening another build saves a recovery copy first. Updates preserve the previous saved version as recovery. Failed storage writes leave the open deck unchanged; invalid backup batches are rejected before writing.
- Restoring profiles now derives folder and Multi Action counters from existing IDs, preventing new items from reusing IDs after earlier items were deleted.

Use the same localhost address and port to retain browser data when upgrading. Export backups before clearing data. Plugin executables are loaded separately, and plugin global settings stay local. PNG export and the asset creator are static; this release does not add an animation renderer or native Stream Deck export certification.

See [creator workflows](CREATOR-WORKFLOWS.md) for instructions and [testing](TESTING.md) for validation commands. Physical hardware validation remains outstanding.

Validation: all 25 automated suites passed on Linux using Chromium 153 headless, including fresh-browser backup imports and named-build update/rename/duplicate/delete controls. Release consistency checks passed. See `verification/1.3.12/release-test-results.json`. Windows CI and physical-device testing are separate from these local checks.
