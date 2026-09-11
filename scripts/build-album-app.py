#!/usr/bin/env python3
"""Build the Album UI app for the demo and wire it to start through seed.js.

    python3 scripts/build-album-app.py ["../Album UI"]

Builds with the /album/demo/ base so asset URLs resolve under the subpath,
replaces public/album/demo/assets/, and rewrites index.html so the app bundle
isn't loaded directly: seed.js is, with the bundle's URL in data-app, and it
starts the app once the demo pages are in IndexedDB. Run build-album-seed.py
too if the pages changed; the two only share that data-app hand-off.
"""
import pathlib
import re
import shutil
import subprocess
import sys

SITE = pathlib.Path(__file__).resolve().parent.parent
ALBUM = pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else SITE.parent / "Album UI"
DEMO = SITE / "public" / "album" / "demo"
BASE = "/album/demo/"
OUT = ALBUM / "dist-demo"

subprocess.run(["npx", "vite", "build", f"--base={BASE}", "--outDir", str(OUT), "--emptyOutDir"],
               cwd=ALBUM, check=True)

html = (OUT / "index.html").read_text()
tag = re.search(r'<script type="module"[^>]*\ssrc="([^"]+)"[^>]*></script>', html)
if not tag:
    raise SystemExit("couldn't find the app's module script in the built index.html")
html = html.replace(tag.group(0), f'<script src="{BASE}seed.js" data-app="{tag.group(1)}"></script>')

if (DEMO / "assets").exists():
    shutil.rmtree(DEMO / "assets")  # old hashed bundles would otherwise pile up
shutil.copytree(OUT / "assets", DEMO / "assets")
(DEMO / "index.html").write_text(html)

print(f"app bundle: {tag.group(1)}")
for f in sorted((DEMO / "assets").iterdir()):
    print(f"  {f.name}  {f.stat().st_size / 1024:.0f} KB")
