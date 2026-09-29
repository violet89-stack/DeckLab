# Verification — 1.3.9-alpha.31

All **22/22 regression suites passed** on Linux. The new colour-template suite checks 38 original sheets / 93 colour-tone crops, corrected Stroke colour labels, key/Neo/full LCD dimensions, preserved actions and titles, Undo, saved attribution, project round trips, independent GALLEON regions and stale-selection rejection. The Elgato icon suite verifies 1,241 source hashes, search/style/pagination, colour rendering, transparent padding, preserved titles, saved favourites, drag placement, profile round trips, complete MIT notices and multicolour SVG decoding. The existing LCD/dial, protocol, import, creator and companion-security suites also passed.

The release consistency/publication-metadata check and JavaScript syntax checks passed. Python modules compile. Source licence: MPL-2.0. Artwork licence: CC BY 4.0, supported by owner-provided resource/deed screenshots. The local metadata check does not create the remote repository or validate its settings.

Environment: Linux, Node 24.19.0, Python 3.12.14, Playwright 1.62.1, explicitly supplied Chromium 153.0.8010.0. Standard Playwright browser download remains unavailable in this environment. The template and Elgato icon dialog screenshots were visually inspected.

Windows desktop/GPU behaviour and physical-device comparisons remain unverified. The public repository exists and private vulnerability reporting is enabled. Source publication used GitHub's authenticated web uploader after the connector rejected a write. [Windows/Linux CI results](https://github.com/violet89-stack/DeckLab/actions) are recorded separately in GitHub Actions; the 22/22 result above refers to the local Linux run.
