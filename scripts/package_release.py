# SPDX-License-Identifier: MPL-2.0
"""Create a source release without local dependencies, secrets or generated work files."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent.parent
version = (ROOT / 'BUILD.txt').read_text().strip()
out = ROOT / 'dist'
out.mkdir(exist_ok=True)
archive = out / f'decklab-{version}.zip'
skip_dirs = {'.git', 'node_modules', 'test-results', 'dist', '__pycache__', '.venv', 'venv'}
skip_suffixes = {'.pyc', '.pyo', '.log', '.exe', '.dll', '.pdb'}
files = []
for file in sorted(ROOT.rglob('*')):
    rel = file.relative_to(ROOT)
    if any(part in skip_dirs for part in rel.parts):
        continue
    if file.is_symlink():
        raise RuntimeError(f'Unexpected symlink: {rel}')
    if not file.is_file():
        continue
    if file.name.startswith('.env') or file.name in {'.DS_Store', 'Thumbs.db'} or file.suffix.lower() in skip_suffixes:
        continue
    # Root-level results/screenshots are historical scratch outputs, not current proof.
    if len(rel.parts) == 1 and (file.suffix == '.png' or file.name.endswith('-results.json') or file.name == 'RELEASE-MANIFEST.json'):
        continue
    files.append((file, rel))
manifest = {'version': version, 'files': {str(rel).replace('\\', '/'): hashlib.sha256(file.read_bytes()).hexdigest() for file, rel in files}}
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for file, rel in files:
        z.write(file, f'decklab-{version}/{rel.as_posix()}')
    z.writestr(f'decklab-{version}/RELEASE-MANIFEST.json', json.dumps(manifest, indent=2)+'\n')
with zipfile.ZipFile(archive) as z:
    if z.testzip():
        raise RuntimeError('Archive integrity check failed')
    if len(z.namelist()) != len(set(z.namelist())):
        raise RuntimeError('Duplicate archive paths')
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(out / (archive.name+'.sha256')).write_text(f'{digest}  {archive.name}\n')
print(f'{archive}\n{len(files)+1} files; {archive.stat().st_size} bytes\nSHA256 {digest}')
