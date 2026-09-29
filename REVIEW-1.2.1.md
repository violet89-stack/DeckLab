# Function and visual consistency review

## Scope

Reviewed the shared Build/Live Preview workflow, action artwork editing, LCD rendering and interaction, colour selection, profile round trips, and protocol-report regressions. Visual inspection used Chromium at 1440 × 1000. This is not a claim that every screen, browser, device or physical plugin has been validated.

## Findings addressed

| Finding | Change |
|---|---|
| LCD actions without a feedback layout could retain stale content | Refresh their action face consistently with keys |
| Narrow LCD typography clipped | Scale demo typography by available height |
| Inspector title size lost to an important CSS rule | Allow the chosen inline title size to win |
| Dial interactions depended on mouse input | Add arrow adjustment and Enter/Space press/release, accessible labels |
| Repeated image uploads disrupted editing | Contextual searchable My artwork collection with portable backups |
| Root page name appeared twice | Hide redundant root breadcrumb while retaining page navigation |
| Too few immediately usable LCD examples | Six local interactive demos, visibly separated from plugin actions |

## Validation

- Browser regression: demo placement on four Stream Deck + encoder segments, rotation, keyboard adjustment, mute, custom title, artwork apply/search/removal, backup export/import and profile export/reimport.
- Existing browser checks: artwork editing, undo, action reassignment, reset, colour persistence, shared Build/Live Preview state, navigation and disabled editing in Live.
- Existing protocol browser checks: actual profile/PI dispatch, settings, globals, resources, version gates and Reports.
- All 256 protocol fixtures pass. Browser runs reported no uncaught page errors.
- Inspected Build and My artwork screenshots. The collection uses a modal with Escape/keyboard support, responsive grid and explicit local-storage notice.

## Boundaries and next priorities

The demo monitors are synthetic, not PC telemetry. Now playing uses sample tracks and does not play audio. These demos exercise the interface, not the WebSocket compatibility contract. Physical-device validation remains outstanding.

The artwork collection is a first local library: filename search, reuse and backup. It does not yet include tags, folders, Marketplace packs or cross-device synchronisation. Removing an entry does not remove embedded images from profiles. Large artwork can still encounter browser storage quotas; keep exported backups. GIF bytes are preserved, but frame timing has not been measured against hardware.

Next review should exercise real third-party plugin inspectors and visual state transitions on more device models, followed by responsive visual checks at additional desktop sizes. Native resource-file handling and plugin-distributed profile switching remain protocol gaps.
