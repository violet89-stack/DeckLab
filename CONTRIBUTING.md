# Contributing to DeckLab Community Alpha

Thank you for testing DeckLab.

## Most useful contributions right now

1. **Reproducible bugs** — especially rendering/layout differences.
2. **Physical-device comparisons** — tell us the exact device and what the real hardware does differently.
3. **Plugin compatibility findings** — include whether the finding is static or from a plugin you explicitly ran.
4. **UX feedback** — confusing labels, unexpected workflow, inaccessible controls, scaling problems, or missing feedback.

## A good bug report

Please include:

- DeckLab version/build
- target device
- exact reproduction steps
- expected behavior
- actual behavior
- whether you own/tested the physical device
- screenshot/video for visual issues
- DeckLab's sanitized bug-report ZIP when appropriate

Use the templates in `.github/ISSUE_TEMPLATE/`.

## Hardware verification

Use the **Hardware verification** issue template when comparing a DeckLab model against a physical device. A hardware comparison should distinguish:

- confirmed match
- measurable visual difference
- input/gesture difference
- animation/timing difference
- behavior that cannot be checked without proprietary host/software support

DeckLab will not call a target “hardware verified” merely because its public specification is known.

## Code contributions

Code contributions are welcome under MPL-2.0. By submitting a contribution, you agree to license your original changes under the same terms. Preserve existing source and third-party notices, include focused regression coverage for changed behaviour, and describe any remaining limitations. Discuss substantial changes in an issue first. Do not include third-party assets without compatible rights and attribution.

## Run checks locally

Use Node.js 22+ and Python 3.10+. Run `npm ci --ignore-scripts`, `npx playwright install chromium`, `npm run check:release`, then `npm test`. Logs and screenshots go to `test-results/`. See TESTING.md for groups and environment overrides. CI runs on Windows and Linux; check the results for your commit. Do not commit generated logs, personal profiles or imported third-party plugins.
