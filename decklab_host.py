#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""DeckLab 1.3.9 Community Alpha safe local companion.

Serves the DeckLab UI and provides a localhost-only WebSocket bridge for
explicitly launched Stream Deck plugin processes. It never spawns or terminates
plugin programs itself. No third-party Python packages are required.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import mimetypes
import os
import pathlib
import platform
import socket
import struct
import sys
import threading
import time
import urllib.parse
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = pathlib.Path(__file__).resolve().parent
DEFAULT_PORT = 8975
WS_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
MAX_WS_MESSAGE = 16 * 1024 * 1024
REGISTRATION_TIMEOUT = 10


class WebSocketProtocolError(Exception):
    def __init__(self, code=1002):
        self.code = code


def local_authorities(port):
    return {f"127.0.0.1:{port}", f"localhost:{port}"}

clients_lock = threading.RLock()
browser_clients: set["WSClient"] = set()
plugin_clients: set["WSClient"] = set()


def json_dumps(obj):
    return json.dumps(obj, separators=(",", ":"), ensure_ascii=False)


class WSClient:
    def __init__(self, handler: "DeckLabHandler"):
        self.handler = handler
        self.sock = handler.connection
        self.rfile = handler.rfile
        self.wfile = handler.wfile
        self.send_lock = threading.Lock()
        self.role = "unknown"
        self.uuid = None
        self.alive = True
        self.fragments = None

    def __hash__(self):
        return id(self)

    def send(self, obj):
        if not self.alive:
            return
        data = json_dumps(obj).encode("utf-8") if not isinstance(obj, (bytes, bytearray)) else bytes(obj)
        header = bytearray([0x81])
        n = len(data)
        if n < 126:
            header.append(n)
        elif n < 65536:
            header.append(126)
            header.extend(struct.pack("!H", n))
        else:
            header.append(127)
            header.extend(struct.pack("!Q", n))
        try:
            with self.send_lock:
                self.wfile.write(header + data)
                self.wfile.flush()
        except Exception:
            self.alive = False

    def send_pong(self, payload=b""):
        try:
            with self.send_lock:
                self.wfile.write(bytes([0x8A, len(payload)]) + payload)
                self.wfile.flush()
        except Exception:
            self.alive = False

    def recv_frame(self):
        first = self.rfile.read(2)
        if len(first) < 2:
            return None, None
        b1, b2 = first
        opcode = b1 & 0x0F
        final = bool(b1 & 0x80)
        masked = bool(b2 & 0x80)
        if b1 & 0x70 or not masked or opcode not in (0, 1, 8, 9, 10):
            raise WebSocketProtocolError()
        length = b2 & 0x7F
        if opcode >= 8 and (not final or length > 125):
            raise WebSocketProtocolError()
        if length == 126:
            raw = self.rfile.read(2)
            if len(raw) < 2:
                return None, None
            length = struct.unpack("!H", raw)[0]
        elif length == 127:
            raw = self.rfile.read(8)
            if len(raw) < 8:
                return None, None
            length = struct.unpack("!Q", raw)[0]
        if length > MAX_WS_MESSAGE or (opcode < 8 and self.fragments is not None and len(self.fragments) + length > MAX_WS_MESSAGE):
            raise WebSocketProtocolError(1009)
        mask = self.rfile.read(4) if masked else None
        if mask is not None and len(mask) != 4:
            return None, None
        payload = self.rfile.read(length) if length else b""
        if len(payload) < length:
            return None, None
        if masked and mask:
            payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        if opcode == 1:
            if self.fragments is not None:
                raise WebSocketProtocolError()
            if not final:
                self.fragments = bytearray(payload)
                return 10, b""
        elif opcode == 0:
            if self.fragments is None:
                raise WebSocketProtocolError()
            self.fragments.extend(payload)
            if not final:
                return 10, b""
            payload = bytes(self.fragments)
            self.fragments = None
            opcode = 1
        return opcode, payload

    def reject(self, code=1008):
        try:
            with self.send_lock:
                self.wfile.write(bytes([0x88, 2]) + struct.pack("!H", code))
                self.wfile.flush()
        except OSError:
            pass
        self.alive = False

    def close(self):
        self.alive = False
        try:
            self.sock.shutdown(socket.SHUT_RDWR)
        except Exception:
            pass
        try:
            self.sock.close()
        except Exception:
            pass


def broadcast_browsers(message):
    dead = []
    with clients_lock:
        for client in list(browser_clients):
            client.send(message)
            if not client.alive:
                dead.append(client)
        for client in dead:
            browser_clients.discard(client)


def broadcast_plugins(message):
    dead = []
    with clients_lock:
        for client in list(plugin_clients):
            client.send(message)
            if not client.alive:
                dead.append(client)
        for client in dead:
            plugin_clients.discard(client)


def companion_message(kind, **data):
    broadcast_browsers({"__decklabCompanion": True, "type": kind, **data})


def process_status():
    return {
        "running": False,
        "pid": None,
        "pluginRoot": None,
        "manifest": None,
        "pluginConnections": len(plugin_clients),
        "autoLaunchEnabled": False,
        "safeBuild": True,
    }


def handle_browser_control(client: WSClient, message: dict, port: int):
    kind = message.get("type")
    if kind == "sendToPlugin":
        payload = message.get("message")
        if isinstance(payload, dict):
            broadcast_plugins(payload)
    elif kind == "launchPlugin":
        companion_message(
            "launchResult",
            ok=False,
            error=(
                "Automatic plugin process launching is disabled in DeckLab 1.3.9 Community Alpha. "
                "Run the plugin explicitly from a terminal instead; see START-HERE-WINDOWS.txt."
            ),
            safeBuild=True,
        )
    elif kind == "stopPlugin":
        companion_message(
            "stopResult",
            ok=True,
            running=False,
            note="Safe build does not own or terminate externally launched plugin processes.",
        )
    elif kind == "status":
        client.send({"__decklabCompanion": True, "type": "status", **process_status()})
    elif kind == "ping":
        client.send({"__decklabCompanion": True, "type": "pong", "time": time.time(), **process_status()})


class DeckLabHandler(SimpleHTTPRequestHandler):
    server_version = "DeckLabCompanion/1.3.9-alpha.31"
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def trusted_request(self):
        """Reject DNS rebinding and cross-origin browser access before any route."""
        authorities = local_authorities(self.server.server_port)
        hosts = self.headers.get_all("Host", [])
        origins = self.headers.get_all("Origin", [])
        if len(hosts) != 1 or hosts[0].lower() not in authorities:
            self.send_error(403, "Local host required")
            return False
        allowed_origins = {"http://" + host for host in authorities}
        if len(origins) > 1 or (origins and origins[0] not in allowed_origins):
            self.send_error(403, "Local origin required")
            return False
        if self.headers.get("Sec-Fetch-Site") == "cross-site":
            self.send_error(403, "Cross-site access denied")
            return False
        path = urllib.parse.urlsplit(self.path).path
        parts = urllib.parse.unquote(path).replace("\\", "/").split("/")
        if any(part.startswith(".") for part in parts if part):
            self.send_error(404)
            return False
        return True

    def list_directory(self, path):
        self.send_error(404)
        return None

    def do_HEAD(self):
        if self.trusted_request():
            return super().do_HEAD()

    def log_message(self, fmt, *args):
        # Keep the launcher console readable; WebSocket/process activity is shown in the UI.
        if os.environ.get("DECKLAB_VERBOSE"):
            super().log_message(fmt, *args)

    def translate_path(self, path):
        # Always serve from the DeckLab bundle root regardless of launch cwd.
        parsed = urllib.parse.urlparse(path)
        rel = urllib.parse.unquote(parsed.path).lstrip("/") or "index.html"
        candidate = (ROOT / rel).resolve()
        try:
            candidate.relative_to(ROOT)
        except ValueError:
            return str(ROOT / "__blocked__")
        return str(candidate)

    def do_GET(self):
        if not self.trusted_request():
            return
        if urllib.parse.urlparse(self.path).path == "/__decklab_catalogue":
            from catalogue_sources import fetch_catalogue
            source = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get("source", [""])[0]
            try:
                result = fetch_catalogue(source)
                status = 200
            except Exception as exc:
                result = {"error": str(exc)}
                status = 502
            body = json.dumps(result).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if self.headers.get("Upgrade", "").lower() == "websocket":
            return self.handle_websocket()
        if self.path.startswith("/__decklab_status"):
            body = json.dumps(process_status(), ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()

    def handle_websocket(self):
        if urllib.parse.urlsplit(self.path).path != "/":
            self.send_error(404)
            return
        key = self.headers.get("Sec-WebSocket-Key")
        try:
            valid_key = key and len(base64.b64decode(key, validate=True)) == 16
        except (ValueError, TypeError):
            valid_key = False
        connection_tokens = [s.strip().lower() for s in self.headers.get("Connection", "").split(",")]
        if (not valid_key or self.headers.get("Sec-WebSocket-Version") != "13"
                or "upgrade" not in connection_tokens):
            self.send_error(400, "Invalid WebSocket handshake")
            return
        accept = base64.b64encode(hashlib.sha1((key + WS_MAGIC).encode("ascii")).digest()).decode("ascii")
        self.send_response(101, "Switching Protocols")
        self.send_header("Upgrade", "websocket")
        self.send_header("Connection", "Upgrade")
        self.send_header("Sec-WebSocket-Accept", accept)
        self.end_headers()
        self.close_connection = True
        browser_origin = self.headers.get("Origin") is not None
        client = WSClient(self)
        client.sock.settimeout(REGISTRATION_TIMEOUT)
        try:
            while client.alive:
                opcode, payload = client.recv_frame()
                if opcode is None:
                    break
                if opcode == 0x8:  # close
                    break
                if opcode == 0x9:  # ping
                    client.send_pong(payload)
                    continue
                if opcode != 0x1:
                    continue
                try:
                    message = json.loads(payload.decode("utf-8"))
                except (UnicodeDecodeError, ValueError):
                    client.reject(1007)
                    break
                if not isinstance(message, dict):
                    client.reject()
                    break
                if client.role == "unknown":
                    uuid = message.get("uuid")
                    if not isinstance(uuid, str) or not uuid.strip() or len(uuid) > 256:
                        client.reject()
                        break
                    if message.get("event") == "decklabBrowserRegister":
                        if not browser_origin:
                            client.reject()
                            break
                        client.role = "browser"
                        client.uuid = uuid
                        client.sock.settimeout(None)
                        with clients_lock:
                            browser_clients.add(client)
                        client.send({"__decklabCompanion": True, "type": "registered", "version": "1.0-safe", **process_status()})
                        continue
                    if message.get("event") != "registerPlugin" or browser_origin:
                        client.reject()
                        break
                    client.role = "plugin"
                    client.uuid = uuid
                    client.sock.settimeout(None)
                    with clients_lock:
                        plugin_clients.add(client)
                    companion_message("pluginRegistered", registration=message, pluginConnections=len(plugin_clients))
                    continue
                if client.role == "browser":
                    if message.get("__decklabControl"):
                        handle_browser_control(client, message, self.server.server_port)
                elif client.role == "plugin":
                    broadcast_browsers({"__decklabCompanion": True, "type": "pluginMessage", "message": message})
        except WebSocketProtocolError as exc:
            client.reject(exc.code)
        except (OSError, TimeoutError):
            client.reject()
        finally:
            client.alive = False
            with clients_lock:
                browser_clients.discard(client)
                was_plugin = client in plugin_clients
                plugin_clients.discard(client)
            if was_plugin:
                companion_message("pluginDisconnected", pluginConnections=len(plugin_clients))


def parse_args():
    p = argparse.ArgumentParser(description="DeckLab 1.3.9 Community Alpha safe localhost plugin bridge")
    p.add_argument("--port", type=int, default=DEFAULT_PORT)
    p.add_argument("--no-browser", action="store_true")
    return p.parse_args()


def main():
    args = parse_args()
    os.chdir(ROOT)
    try:
        httpd = ThreadingHTTPServer(("127.0.0.1", args.port), DeckLabHandler)
    except OSError as exc:
        print(f"Could not start DeckLab on port {args.port}: {exc}")
        print("Close any older DeckLab launcher window, then start this version again.")
        return
    url = f"http://127.0.0.1:{args.port}/"
    print("\nDeckLab 1.3.9 Community Alpha Companion")
    print("----------------------")
    print(f"UI + WebSocket: {url}")
    print("Bound to localhost only. Automatic process launching is disabled. Close this window to stop the companion.\n")
    if not args.no_browser:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
