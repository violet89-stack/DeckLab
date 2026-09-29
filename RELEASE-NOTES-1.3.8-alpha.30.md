# DeckLab 1.3.8-alpha.30 — community release preparation

This candidate preserves the previous LCD/dial repairs and prepares the project for community testing.

- Restricts companion HTTP/WebSocket browser access to its own localhost addresses and port; rejects foreign/null origins, spoofed Host headers and cross-site requests.
- Separates browser/native registration, validates masked WebSocket messages and limits payloads to 16 MiB. Blocks dot-path serving and directory listings. Native plugins still register through the documented socket flow after being explicitly launched.
- Adds raw-protocol security tests and an actual-browser/native-plugin bridge test.
- Adds pinned npm test dependencies, one portable test command, per-suite logs and read-only Windows/Linux CI configuration.
- Updates startup, UI navigation, test instructions, privacy/security boundaries, bug templates and publishing guidance.
- Adds release consistency checks, repository-link configuration, source packaging and SHA-256 manifests.

No new hardware-validation or complete SDK-conformance claims are made. Windows desktop/GPU checks and the first actual GitHub CI run remain outstanding. The standard Chromium download failed in the preparation environment; local browser tests use an explicitly supplied Chromium executable. See `verification/1.3.8/` for the actual test outcome.

Publication still needs the owner's source-licence choice, a repository, a working private security-report route and original product-artwork licence evidence. This candidate is not yet a public release.
