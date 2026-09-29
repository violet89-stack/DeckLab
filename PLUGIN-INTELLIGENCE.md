# DeckLab Plugin Intelligence

DeckLab 1.1.3 classifies imported Stream Deck plugin packages before attempting manifest validation.

## Package classes

### Inspectable development package
`manifest.json` is plain JSON. DeckLab can inspect actions, controllers, assets, layouts, Property Inspector references and compatibility.

### Marketplace-protected package
DeckLab recognizes protected/binary manifest data (including current ELGATO-prefixed protected manifests) and stops gracefully. The package is **not labelled broken**. DeckLab does not decrypt, transform, or bypass Marketplace protection.

### Invalid development package
The manifest appears to be ordinary text but is malformed JSON or has an invalid root. DeckLab reports the actual parse/shape problem.

## Local Plugin Library

`Scan plugin library folder` accepts a user-selected directory containing multiple `.sdPlugin` folders. It indexes manifests locally and shows searchable package cards. Nothing is executed or installed.

This is intentionally different from an app-store client: it provides package discovery for files the user already has, while preserving DeckLab's static-inspection security boundary.

## Catalogue (alpha.13)

The local catalogue remembers package names, authors, versions, statuses and action names across sessions. Search also matches action UUIDs. Filter by inspection status, sort by name or action count, and export the metadata index as JSON. Package files are only held for the current scan; rescan a folder to inspect a remembered entry. Clear index removes remembered metadata. No plugin code runs.
