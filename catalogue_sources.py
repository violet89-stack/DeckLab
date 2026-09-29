# SPDX-License-Identifier: MPL-2.0
"""Read-only, fixed-source catalogue adapters for DeckLab."""
import json
import urllib.request

SOURCES = {
    'opendeck': 'https://plugins.amankhanna.me/catalogue.json',
}

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Catalogue redirected; source adapter needs updating')

def read_json(url, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    request = urllib.request.Request(url, data=data, headers={'Accept':'application/json', 'Content-Type':'application/json', 'User-Agent':'DeckLab/1.1.4'})
    with urllib.request.build_opener(NoRedirect()).open(request, timeout=12) as response:
        raw = response.read(4_000_001)
    if len(raw) > 4_000_000:
        raise ValueError('Catalogue exceeds size limit')
    return json.loads(raw)

def fetch_catalogue(source):
    if source not in SOURCES:
        raise ValueError('Unknown catalogue source')
    if source == 'opendeck':
        rows = read_json(SOURCES[source])
        if not isinstance(rows, list):
            raise ValueError('Unexpected OpenDeck catalogue format')
        return {'source':source, 'rows':rows[:5000], 'partial':len(rows)>5000}
