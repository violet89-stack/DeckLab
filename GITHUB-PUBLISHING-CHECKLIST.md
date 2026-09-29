# GitHub community release

Release: **1.3.9-alpha.31**. Repository: **violet89-stack/DeckLab**.

## Established publication settings

- DeckLab source: **MPL-2.0**, with full licence and SPDX source identifiers.
- Product previews and colour templates: **CC BY 4.0**, attributed to **Elgato and Will Johnson** with provenance and supplied licence evidence.
- Elgato Icons: **MIT**, copyright **Corsair Memory Inc.**, with the full upstream notice.
- Public repository named **DeckLab**, Issues enabled and private vulnerability reporting verified as enabled.

## Release procedure

1. Include the complete reviewed source, assets, fixtures, examples and `.github` configuration. Exclude dependencies, transient test output, credentials and personal plugin/profile collections.
2. Run the release checks and full regression suite. Compare the remote source tree with the reviewed local files.
3. Review actual Windows and Linux results in [GitHub Actions](https://github.com/violet89-stack/DeckLab/actions); workflow configuration alone is not a passing result.
4. Run `npm run package:release`. Verify the archive inventory, unique paths and checksum.
5. Create tag **v1.3.9-alpha.31** for the reviewed commit and publish a **pre-release** with source ZIP, checksum, release notes, startup instructions and known limits.
6. Community testers can follow COMMUNITY-ALPHA.md, including Windows desktop zoom/scaling/GPU checks. Physical-device validation remains explicitly unclaimed.

The initial connector write was rejected with HTTP 403. Publication continued through the authenticated GitHub web interface with the owner's approval.
