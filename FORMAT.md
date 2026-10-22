# VDF 1.0 — Vacter Document File Format Specification

*Status: 1.0 (stable) · 22 October 2026 · This document is also available in
every `vdf` binary as `vdf doc`.*

## 1. Overview

VDF (Vacter Document File) is a single-file document container for
[Zolto](https://github.com/uxle/Zolto) `.zl` documents and their assets
(images, SVG, fonts, media). Design goals:

1. **PDF-like identity** — a text magic header, a binary trailer with
   checksums, an `%%VDF-EOF` end marker. Tools identify and verify VDF
   files the way they do PDF.
2. **Zero lock-in** — the payload is a 100% standard ZIP archive.
3. **Small files** — DEFLATE at maximum compression for every entry.
4. **Self-contained** — document + assets (+ optional renderer) travel
   together.

MIME type: `application/vnd.vacter.vdf`
Common extensions: `.vdf`

## 2. File layout

A VDF 1.0 file is exactly three stacked sections:

```
offset 0                    HEADER (64 bytes, ASCII)
offset 64                   ZIP PAYLOAD (variable)
offset EOF-64               TRAILER (64 bytes, little-endian binary)
offset EOF
```

### 2.1 Header (64 bytes)

```
bytes 0..8    b"%VDF-1.0\n"                     — 9 bytes, ASCII magic line
bytes 9..63   b"%VACTER-DOCUMENT-FILE container: zip/deflate payload"
              + binary trailer", padded with spaces
byte  63      b"\n"
```

The first line mirrors PDF's `%PDF-1.7`: `file(1)`, `head(1)` and hex viewers
identify the format instantly.

### 2.2 ZIP payload

A conventional ZIP archive (PKZIP APPNOTE). Entries, in order:

| # | Name | Compression | Notes |
|---|------|-------------|-------|
| 1 | `mimetype` | **Stored** | content `application/vnd.vacter.vdf` — must be the FIRST entry (ODF convention) |
| 2 | `manifest.json` | Deflate | metadata record, §2.3 |
| 3 | `<manifest.entry>` (e.g. `document.zl`) | Deflate (level 9/10) | the Zolto entry document, UTF-8 |
| 4..n | `assets/**` | Deflate (level 9/10) | images, SVG, fonts, media |
| opt | `runtime/**` | Deflate | `runtime/zolto.bundle.js` + `runtime/ZOLTO-LICENSE` when the `HAS_RUNTIME` flag is set |

All entry names are archive-relative, use `/` separators, and MUST NOT
contain absolute paths, `\`, or `..` components (extractors must reject
them). ZIP64 is not required (files are far below 4 GB) but readers may
accept it. Central-directory offsets are **absolute** byte positions in the
VDF file.

> Standard ZIP tools locate the end-of-central-directory record by scanning
> backwards from EOF, which tolerates both the 64-byte VDF header *before*
> the archive and the 64-byte trailer *after* it — the same property
> self-extracting installers rely on. `unzip`, `7z`, Archive Utility and
> Python `zipfile` open `.vdf` files directly.

### 2.3 `manifest.json`

```json
{
  "format": "vdf",
  "version": "1.0",
  "mimetype": "application/vnd.vacter.vdf",
  "title": "Document title",
  "author": "Author name",
  "subject": "Optional subject",
  "keywords": ["optional", "keywords"],
  "created": "2026-10-22T02:41:07Z",
  "modified": "2026-10-22T02:41:07Z",
  "generator": "vdf/1.0.0",
  "entry": "document.zl",
  "engine": { "name": "zolto", "version": "15.0.0", "minVersion": "1.0" },
  "assets": ["assets/logo.svg", "assets/fonts/Body.woff2"],
  "hasRuntime": false,
  "compression": "deflate"
}
```

Required: `format` (must be `"vdf"`), `entry`. All other fields have
sensible defaults. Timestamps are RFC 3339, UTC.

### 2.4 Trailer (64 bytes, little-endian)

| Offset | Size | Field | Value |
|--------|------|-------|-------|
| 0 | 4 | magic | `0x54 0x44 0x46 0x56` (`"VDFT"`) |
| 4 | 2 | version | `1` |
| 6 | 2 | flags | bit 0 `HAS_RUNTIME`; bits 1–15 reserved, must be 0 in 1.0 |
| 8 | 8 | zip_offset | byte offset of the ZIP payload (normally `64`) |
| 16 | 8 | zip_size | byte length of the ZIP payload |
| 24 | 4 | doc_crc32 | CRC-32 of the raw entry-document bytes |
| 28 | 4 | manifest_crc32 | CRC-32 of the raw `manifest.json` bytes |
| 32 | 22 | reserved | zero |
| 54 | 10 | end marker | `"%%VDF-EOF\n"` |

A parser can therefore: read 9 bytes at 0 (magic), read the last 64 bytes
(trailer), seek directly to `zip_offset` and open the ZIP — no scanning.

## 3. Rendering model

The entry document is Zolto source (a Markdown superset with math, charts,
diagrams, vector graphics and interactive widgets). Reference renderers:

- **`vdf view file.vdf`** — extracts to a temp dir and writes a standalone
  HTML viewer (engine + assets resolved locally; `--single` inlines
  everything into one portable HTML file).
- **Browser extension** — parses the ZIP in JavaScript
  (`DecompressionStream('deflate-raw')`), maps assets to blob URLs, renders
  with the vendored Zolto engine.
- **Android app** — extracts via the native Rust core (`libvdf.so`, JNI)
  and renders in a WebView.

Font convention: any `assets/fonts/*.woff2|woff|ttf|otf` is injected as a
web font by official viewers (`@font-face`), in archive order.

## 4. Validation suite (what `vdf validate` checks)

1. Header magic `%VDF-1.0`
2. Trailer magic, version, end marker, offset sanity
3. `mimetype` is entry #0, stored, correct value
4. `manifest.json` parses; `format == "vdf"`; entry present in archive
5. `manifest_crc32` matches the trailer
6. `doc_crc32` matches the trailer
7. Entry document is text (not binary garbage)
8. All manifest-listed assets exist
9. `HAS_RUNTIME` flag ↔ `runtime/zolto.bundle.js` presence
10. Full CRC-32 sweep of every ZIP entry + path-safety check

## 5. Conformance

A conforming **writer** must: emit the 64-byte header, put `mimetype` first
and stored, record absolute ZIP offsets, and write a valid trailer.

A conforming **reader** must: accept files with prepended/appended framing
(i.e. locate the ZIP via the EOCD scan or the trailer offset), verify CRC-32
of entries it reads, and reject unsafe entry names.

## 6. Example: hand-parsing in 10 lines of Python

```python
import json, struct, zipfile
data = open("sample.vdf", "rb").read()
assert data[:9] == b"%VDF-1.0\n"
magic, ver, flags, zoff, zsize, dcrc, mcrc = struct.unpack("<4sHHQQII", data[-64:-10])
z = zipfile.ZipFile("sample.vdf")            # plain ZIP semantics work
manifest = json.loads(z.read("manifest.json"))
doc = z.read(manifest["entry"])
import zlib; assert zlib.crc32(doc) & 0xFFFFFFFF == dcrc
print(manifest["title"], "·", len(doc), "bytes of Zolto")
```

## 7. Change log

- **1.0** — initial stable format. Header/trailer framing, ZIP payload,
  manifest schema, runtime flag.
