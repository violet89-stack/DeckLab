# Testing DeckLab

## Prerequisites

- Node.js 22 or newer (CI uses 24).
- Python 3.10 or newer (CI uses 3.13).
- Playwright's Chromium browser. Recent Chrome/Edge is recommended for manual desktop tests.

From the extracted project root:

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm run check:release
npm test
```

On Linux, `npx playwright install --with-deps chromium` can also install required system libraries. The [Playwright documentation](https://playwright.dev/docs/library) describes browser installation. If a managed environment already provides a compatible Chromium, set `CHROMIUM_EXECUTABLE` to that executable. Leave it unset for the normal Playwright installation. Set `PYTHON` only if automatic Python discovery fails.

## Test groups and evidence

- `npm run test:core`: model, import, catalogue, protocol and Python companion checks without browser automation.
- `npm run test:browser`: browser interaction suites, including the actual companion bridge.
- `npm run test:security`: raw HTTP/WebSocket boundary checks plus the browser/native-plugin smoke test.
- `npm test`: all 24 suites, sequentially, with a failure exit status if any fail.

Logs, screenshots and `release-test-results.json` go into `test-results/` (gitignored), or `DECKLAB_TEST_ARTIFACTS` if explicitly set. Each run records build, platform, Node version and per-suite exit codes. A group run is only evidence for that group. Current release evidence is under `verification/1.3.11/`; older versioned evidence is historical.

The contract fixtures can be regenerated using `node scripts/build-sdk-data.cjs`. `node tests-protocol.cjs` verifies the generated data matches the canonical contract and individual fixtures. Do not increase coverage just by accepting a message name.

`.github/workflows/tests.yml` runs checks on Windows and Linux and preserves test artifacts. It has read-only repository permissions and does not publish a release. A checked-in workflow is not evidence that CI has run.

## Manual release checks

Follow [COMMUNITY-ALPHA.md](COMMUNITY-ALPHA.md) on a normal Windows desktop. In particular, check zoom/flicker with GPU acceleration and Windows scaling, every physical dial position, both GALLEON LCD rows, project save/reopen, icon/profile imports and new-folder startup after stopping an old companion.

Compare actual hardware separately using [HARDWARE-VALIDATION.md](HARDWARE-VALIDATION.md). Browser screenshots and simulated input cannot establish physical display size, touch timing, device firmware behaviour or native plugin compatibility beyond the cases tested.
