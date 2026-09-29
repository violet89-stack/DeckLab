# SPDX-License-Identifier: MPL-2.0
"""Import SVG data only from the pinned official npm archive; run no package code."""
from pathlib import Path
import base64
import hashlib
import json
import sys
import tarfile
import xml.etree.ElementTree as ET

archive = Path(sys.argv[1])
integrity = 'npp2/p3hYq4ZGJLMA8ndKQLQM4GMfvIhJhMbIqjH3i/f2rGxfUNO6g9FsnLgDahDNyaAAvpNwA17JHmPJifnCw=='
assert base64.b64encode(hashlib.sha512(archive.read_bytes()).digest()).decode() == integrity
out = Path(__file__).resolve().parent.parent / 'assets/elgato-icons'
out.mkdir(exist_ok=True)
allowed = {'svg', 'path', 'g', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'defs', 'clipPath', 'mask', 'linearGradient', 'radialGradient', 'stop', 'pattern', 'use', 'image', 'filter', 'feFlood', 'feBlend', 'feGaussianBlur', 'feColorMatrix', 'feOffset'}
with tarfile.open(archive) as tar:
    package = json.loads(tar.extractfile('package/package.json').read())
    assert package['name'] == '@elgato/icons' and package['version'] == '2.5.1' and package['license'] == 'MIT'
    license_text = tar.extractfile('package/LICENSE').read().decode()
    (out / 'LICENSE').write_text(license_text)
    chosen = {}
    for member in tar.getmembers():
        parts = Path(member.name).parts
        if len(parts) != 4 or parts[:2] != ('package', 'svg') or parts[2] not in ['l', 'm', 's'] or not parts[3].endswith('.svg'):
            continue
        rank = {'l': 3, 'm': 2, 's': 1}[parts[2]]
        ident = Path(parts[3]).stem
        if ident in chosen and chosen[ident][0] >= rank:
            continue
        svg = tar.extractfile(member).read().decode()
        assert '<!DOCTYPE' not in svg and '<!ENTITY' not in svg
        for node in ET.fromstring(svg).iter():
            assert node.tag.split('}')[-1] in allowed, (ident, node.tag)
            for key, value in node.attrib.items():
                assert not key.lower().startswith('on'), (ident, key)
                if 'href' in key.lower():
                    assert value.startswith('#') or value.startswith('data:image/png;base64,'), (ident, key)
                assert 'url(' not in value or value.startswith('url(#'), (ident, key)
        chosen[ident] = (rank, {'id': ident, 'name': ident.replace('--filled', ' (filled)').replace('-', ' ').capitalize(), 'size': parts[2], 'sourcePath': '/'.join(parts[1:]), 'svg': svg, 'sha256': hashlib.sha256(svg.encode()).hexdigest()})
    entries = [entry[1] for _, entry in sorted(chosen.items())]
    data = {'name': 'Elgato Icons', 'version': '2.5.1', 'source': 'https://github.com/elgatosf/icons', 'package': '@elgato/icons', 'license': 'MIT', 'copyright': 'Copyright (c) 2025 Corsair Memory Inc.', 'licenseText': license_text, 'archiveIntegrity': 'sha512-' + integrity, 'entries': entries}
    (out / 'index.json').write_text(json.dumps(data, separators=(',', ':')) + '\n')
    print(f'Imported {len(entries)} distinct icons; catalogue {(out / "index.json").stat().st_size} bytes.')
