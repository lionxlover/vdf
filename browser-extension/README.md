# VDF Viewer — Browser Extension

Open **`.vdf` (Vacter Document File)** documents in Chrome, Edge, Brave,
Opera, Vivaldi or Firefox. Everything — the ZIP parser, DEFLATE inflater,
CRC-32 verifier and the Zolto rendering engine — runs locally on the page.
Zero permissions. Zero network.

## Install (Chromium family)

1. Open `chrome://extensions` (Edge: `edge://extensions`, Brave: `brave://extensions`)
2. Toggle **Developer mode** on
3. Click **Load unpacked**
4. Select this `browser-extension/` folder
5. Pin the VDF icon and click it whenever you want to open a document

## Install (Firefox)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Pick `manifest.json` in this folder

## Use

1. Click the toolbar icon — a viewer tab opens
2. **Drag & drop** a `.vdf` file anywhere on the page, or click **Choose file…**
3. The document renders with all assets (images, SVG, fonts) resolved from
   inside the archive; interactive widgets (quizzes, tabs) are live

## What it checks

- `%VDF-1.0` header (plain ZIP files also open, with a note)
- `VDFT` trailer: version, flags, offsets
- Every ZIP entry is **CRC-32 verified** before rendering — corrupt files
  fail with a clear message instead of garbage
- `manifest.json` → entry document must exist
- `assets/fonts/*.woff2|woff|ttf|otf` are auto-injected as web fonts

## Tech notes

- Manifest V3; one `background` entry declares both `service_worker`
  (Chrome) and `scripts` (Firefox) so a single build loads everywhere
- Inflation uses the native `DecompressionStream('deflate-raw')` —
  no bundled decompression library
- No inline scripts (MV3 CSP compliant), no remote code

## Files

```
manifest.json      MV3 manifest
bg.js              opens the viewer tab on toolbar click
viewer.html/.css   landing + document chrome
viewer.js          VDF/ZIP parser + renderer wiring
lib/zolto.bundle.js  Zolto engine (MIT, vendored)
icons/             toolbar icons
```
