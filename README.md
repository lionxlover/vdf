# VDF — Vacter Document File

**A PDF-like document format powered by Zolto.** One small, super-compressed
`.vdf` file carries a [Zolto](https://github.com/uxle/Zolto) `.zl` document
together with every image, SVG and font it needs — and renders in any browser.

```
%VDF-1.0
%VACTER-DOCUMENT-FILE container: zip/deflate payload + binary trailer
┌──────────────────────────────────────────────┐
│  mimetype            "application/vnd.vacter.vdf"   (stored, first)
│  manifest.json       metadata + checksums
│  document.zl         the Zolto source document
│  assets/             images · SVG · fonts · media
│  runtime/            optional embedded Zolto engine
└──────────────────────────────────────────────┘
VDFT …zip offset… …CRC-32 checksums… %%VDF-EOF
```

## Why VDF?

| | PDF | VDF |
|---|---|---|
| Magic header | `%PDF-1.7` | `%VDF-1.0` |
| Payload | opaque object streams | standard ZIP + Zolto |
| Integrity | — | CRC-32 manifest + document checksums in a binary trailer |
| Reflows on any screen | rarely | always |
| Math / charts / diagrams | embedded fonts & images | **native markup, rendered live** |
| Interactivity | forms at best | quizzes, tabs, full runtime |
| Open without VDF tools | — | `unzip`, 7-Zip, Python `zipfile` |

## What's in this package

```
vdf-1.0.0/
├── binaries/                ready-to-run `vdf` CLI for every platform
│   ├── linux/{x86_64,aarch64,armv7}/vdf        static musl binaries
│   ├── macos/{x86_64,aarch64}/vdf
│   ├── windows/{x86_64,aarch64}/vdf.exe
│   └── android/{aarch64,armv7,x86_64,x86}/vdf  Termux / adb CLI
├── android/
│   ├── vdf-viewer.apk       installable Android viewer app
│   └── vdf-android.aar      Android library (JNI) for app integration
├── browser-extension/       open .vdf in Chrome / Edge / Brave / Firefox
├── sample/                  showcase document (sample.vdf) + its source
├── source/                  full source (Rust workspace + Android + extension)
├── install.sh · install.ps1
├── FORMAT.md                the VDF 1.0 file format specification
├── INSTALL.md               per-platform install guide
└── NOTICES.md               open-source licenses
```

## Quick start (desktop)

```sh
# Linux / macOS
./install.sh                       # installs the right binary to ~/.local/bin

vdf init mydoc                     # scaffold a project
vdf build mydoc                    # → mydoc.vdf
vdf validate mydoc.vdf             # 10-point structural check
vdf view mydoc.vdf                 # offline HTML viewer (opens your browser)
vdf view mydoc.vdf --single page.html   # ONE portable .html — email it to anyone
```

```powershell
# Windows (PowerShell)
.\install.ps1
vdf init mydoc ; vdf build mydoc ; vdf view mydoc.vdf
```

## Quick start (browser)

Load the extension once, then click its toolbar icon and drop any `.vdf`
onto the page:

- **Chrome / Edge / Brave** → `chrome://extensions` → *Developer mode* → *Load unpacked* → select `browser-extension/`
- **Firefox** → `about:debugging` → *This Firefox* → *Load Temporary Add-on* → pick `browser-extension/manifest.json`

## Quick start (Android)

Install `android/vdf-viewer.apk`, then open any `.vdf` from your file manager
(or use the built-in picker / bundled sample).

App developers: drop `android/vdf-android.aar` into your project and call
`com.vacter.vdf.Vdf` (JNI, all 4 ABIs included).

## Super compression

Every payload entry is DEFLATE at maximum level. Typical numbers from the
bundled showcase (48 KB total):

```
Zolto text        5.7 KB  →  1.9 KB
SVG artwork       3.6 KB  →  1.3 KB
Web fonts        42.6 KB  → 42.4 KB   (woff2 is pre-compressed)
Whole archive    51.5 KB  → 46.0 KB packed  →  48.0 KB on disk
```

Text-heavy documents routinely shrink 70–90%.

## The format in 30 seconds

- **Bytes 0–63** — ASCII header starting with `%VDF-1.0\n` (PDF-style magic)
- **Bytes 64 … EOF-64** — a *standard* ZIP archive (first entry `mimetype`,
  stored uncompressed, like ODF; then `manifest.json`, the entry document,
  `assets/**`, optional `runtime/**`)
- **Last 64 bytes** — binary little-endian trailer: `VDFT` magic, version,
  flags, ZIP offset + size, CRC-32 of the entry document and of
  `manifest.json`, `%%VDF-EOF\n` end marker

Full specification: **FORMAT.md** (also available as `vdf doc`).

## Source code layout

```
source/rust/
├── crates/vdf-core/    format library (reader/writer/validator/viewer)
├── crates/vdf-cli/     the `vdf` command
└── crates/vdf-jni/     Android JNI bridge (libvdf.so)
source/android/         APK app + AAR library sources & build scripts
source/extension/       browser extension (zero-dependency VDF parser)
```

Build everything: `cd source/rust && cargo build --release` — the Rust
workspace is 100% pure-Rust dependencies and cross-compiles cleanly.

## License

MIT OR Apache-2.0 for VDF tooling. Documents the Zolto engine (MIT) under
`NOTICES.md`. See `LICENSE`.
