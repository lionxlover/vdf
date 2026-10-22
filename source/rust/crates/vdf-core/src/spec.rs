//! The VDF 1.0 format specification (printed by `vdf doc`).

pub const SPEC: &str = r#"VDF 1.0 — Vacter Document File Format Specification
==================================================

VDF is a PDF-like document container for Zolto (.zl) documents with their
assets (images, SVG, fonts, media). A .vdf file is one self-contained,
super-compressed archive that any browser can render with the Zolto engine.

Design goals
------------
1. PDF-like identity  — a text magic header ("%VDF-1.0"), a binary trailer
   with checksums, and an "%%VDF-EOF" end marker, so tools can identify,
   verify and seek inside VDF files the way they do with PDF.
2. Zero lock-in      — the payload is a 100% standard ZIP archive. unzip,
   7-Zip, macOS Archive Utility and Python's zipfile all open .vdf files.
3. Small files       — every payload entry is DEFLATE-compressed at maximum
   level; typical documents shrink 60-90%.
4. Self-contained    — the entry document, all assets and (optionally) a
   Zolto runtime renderer travel together inside one file.

File layout (offsets in bytes)
------------------------------
  +0    HEADER   64 bytes ASCII:
                "%VDF-1.0\n" (9 bytes, like %PDF-1.7)
                "%VACTER-DOCUMENT-FILE container: zip/deflate payload + binary trailer"
                padded with spaces to byte 63, ends with "\n"
  +64   ZIP PAYLOAD (DEFLATE, maximum level) containing, in order:
                mimetype         stored/uncompressed, ALWAYS first:
                                 "application/vnd.vacter.vdf"
                manifest.json    metadata (see below)
                document.zl      the Zolto entry document (name = manifest.entry)
                assets/**        images, SVG, fonts, media
                runtime/**       optional embedded Zolto engine
                                 (runtime/zolto.bundle.js, set by --runtime)
  -64   TRAILER  64 bytes, little-endian:
                u8[4]  "VDFT" magic
                u16    version        (1)
                u16    flags          (bit0: HAS_RUNTIME, bit1: ENCRYPTED*, bit2: SIGNED*)
                u64    zip_offset     (normally 64)
                u64    zip_size       (bytes of the ZIP payload)
                u32    doc_crc32      (CRC-32 of the raw entry document bytes)
                u32    manifest_crc32 (CRC-32 of the raw manifest.json bytes)
                u8[22] reserved (zero)
                u8[10] "%%VDF-EOF\n"
                * reserved for future versions; MUST be 0 in v1.0 files

manifest.json
-------------
  {
    "format": "vdf",
    "version": "1.0",
    "mimetype": "application/vnd.vacter.vdf",
    "title": "Document title",
    "author": "Author name",
    "subject": "", "keywords": [],
    "created": "2026-10-22T02:41:07Z",        // RFC 3339, UTC
    "modified": "2026-10-22T02:41:07Z",
    "generator": "vdf/1.0.0",                 // tool that produced the file
    "entry": "document.zl",                   // archive path of the Zolto document
    "engine": { "name": "zolto", "version": "15.0.0", "minVersion": "1.0" },
    "assets": ["assets/logo.svg", "assets/fonts/x.woff2"],
    "hasRuntime": false,                      // runtime/ embedded?
    "compression": "deflate"
  }

Why ZIP + PDF skin?
-------------------
ZIP tools locate an archive by scanning backwards for the End Of Central
Directory record, which tolerates both the 64-byte VDF header prepended to
the archive and the 64-byte VDF trailer appended after it — the same trick
self-extracting installers rely on. So a .vdf is simultaneously:
  * a first-class VDF document (header, manifest, trailer checksums), and
  * an ordinary ZIP any tool can unpack ("unzip file.vdf -d file_extracted").

Rendering
---------
  * `vdf view doc.vdf`            extract + open an offline HTML viewer
  * `vdf view doc.vdf --single o.html`  one portable .html with everything inlined
  * Browser extension / Android app: parse the ZIP payload in JS/Java and
    render `manifest.entry` with the Zolto engine (https://github.com/uxle/Zolto).

Tooling
-------
  vdf init [dir]          scaffold a VDF project (document.zl, assets/, vdf.toml)
  vdf build [dir]         pack a project into .vdf   [--runtime] [--no-runtime]
  vdf extract FILE        unpack a .vdf
  vdf list FILE           table of contents (sizes, compression, CRCs)
  vdf info FILE           manifest + trailer details
  vdf validate FILE       structural check suite (mimetype, CRCs, paths, ...)
  vdf view FILE           offline HTML viewer
  vdf completions SHELL   shell completions
  vdf doc                 this specification
"#;
