# DeckLab 1.1.3-alpha.12 — Plugin Intelligence & DRM Awareness

This release fixes a common import problem with installed Marketplace plugins and adds a local plugin-library view.

## Highlights

- Elgato-protected Marketplace manifests are recognized instead of reported as broken JSON.
- False follow-on errors such as missing `UUID` / `Actions` are no longer shown for protected packages.
- DeckLab does not attempt to decrypt or bypass Marketplace protection.
- A new local Plugin Library scanner can classify and search many `.sdPlugin` folders at once.
- Plain development plugins remain fully inspectable.
- Malformed plain-text manifests are still reported as genuine package errors.

## Security

The scanner reads only files selected by the user. It does not execute plugins, install plugins, or contact a remote plugin catalogue.
