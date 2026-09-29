# GitHub community release

Candidate: **1.3.9-alpha.31**. Selected repository: **violet89-stack/DeckLab**. The public repository exists and private vulnerability reporting is enabled. Source upload, CI and release publication are verified separately.

## Decisions completed

- DeckLab source: **MPL-2.0**. Full licence, SPDX source identifiers and contribution terms are included.
- Product previews and colour templates: **CC BY 4.0**, attributed to **Elgato and Will Johnson**, with original source/licence links, adaptation notes and owner-provided screenshot evidence.
- Repository name: **DeckLab**, under the owner's GitHub account.

## Remaining publication steps

1. Repository created under the correct account. Upload the extracted source at the root, including `.github` and `.gitignore`; exclude local `node_modules`, `test-results` and `dist`. Do not include personal profiles or third-party plugin collections.
2. Issues and private vulnerability reporting are enabled. SECURITY.md records the private reporting route.
3. Run `npm ci --ignore-scripts`, `npx playwright install chromium`, `npm test` and `npm run check:release -- --publish`. This local check verifies metadata/licence evidence; it does not verify remote settings or CI.
4. Review both Windows and Linux CI results in the actual repository. A checked-in workflow is not a passing run.
5. Complete the Windows desktop smoke checks in COMMUNITY-ALPHA.md, including clean startup, project export/reopen and zoom/scaling/GPU behaviour. Record untested physical hardware honestly.
6. Update publication-status wording and verification evidence, then run `npm run package:release`. The source ZIP and checksum are written under `dist/`.
7. Tag the reviewed commit **v1.3.9-alpha.31** and create a GitHub **pre-release** with the ZIP, checksum, release notes, startup instructions and known limits.

Invite a small initial testing group after these steps. Do not claim complete SDK compatibility or hardware validation from automated browser tests.

## Current publication blocker

GitHub connector upload returned HTTP 403, `Resource not accessible by integration`. The public repository currently contains only its initial README. Application source and release assets have not been uploaded; GitHub CI has not run. The verified local package is ready for a browser upload after that fallback is approved.
