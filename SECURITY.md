# Security policy

## Local companion boundary

The Python companion binds to `127.0.0.1`. It accepts HTTP/WebSocket requests only for its actual `127.0.0.1:port` or `localhost:port` Host. Browser origins must exactly match one of those HTTP addresses; foreign, opaque/null and cross-site browser requests are rejected. Directory listing and dot-prefixed paths (including `.git` and `.env`) are blocked.

Browser registration requires a trusted browser Origin. Native plugin registration requires no Origin and a valid registration message. WebSocket client messages must be masked; malformed messages, invalid registration and payloads above 16 MiB are rejected. Unregistered connections have a read timeout. Fragmented text messages and ping/pong are supported.

This boundary protects against unrelated websites reaching the local bridge. It is **not authentication against other programs already running on the same computer**. A local native program can connect as a plugin. Use the companion only on a trusted computer and do not expose it through a proxy, port forwarding or a public tunnel.

## Imported content and execution

- Static package inspection does not execute imported plugin application code.
- Property Inspector previews run third-party web content inside the existing sandboxed bridge. They are not equivalent to static inspection or a general security sandbox for arbitrary hostile content.
- DeckLab never automatically launches or terminates imported plugin programs. Live testing requires the user to start a trusted program explicitly.
- A manually launched plugin has the permissions of that native process; DeckLab cannot restrict its network or filesystem access.
- Developer tests invoke Python and Chromium explicitly. The application runtime has no automatic native plugin launcher.

## Report privately

Private vulnerability reporting is enabled for violet89-stack/DeckLab. Open its **Security → Report a vulnerability** form. Do not post exploit details, credentials, private keys or proprietary plugin code in a public issue. Include the build, reproduction steps and the minimum diagnostic data necessary.

GitHub private vulnerability reporting was enabled during release preparation and the Security overview confirms it is enabled. Use the private form under the repository Security tab.

## Verification

`npm run test:security` runs the raw-protocol security checks and the actual-browser/native-plugin bridge smoke test. The full suite also covers application behaviour. These targeted checks are not a penetration-test certification.

Origin validation follows the [OWASP WebSocket Security guidance](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html).
