//! On-disk layout of a VDF 1.0 file.
//!
//! ```text
//! offset 0                     ┌──────────────────────────────────────┐
//!                              │ HEADER  (64 bytes, ASCII)            │
//!                              │  "%VDF-1.0\n"                        │
//!                              │  "%VACTER-DOCUMENT-FILE\n"           │
//!                              │  ... padded with '%'-comment lines   │
//! offset 64                    ├──────────────────────────────────────┤
//!                              │ ZIP PAYLOAD                          │
//!                              │  mimetype        (stored, first)     │
//!                              │  manifest.json                       │
//!                              │  document.zl    (deflate, best)      │
//!                              │  assets/**      (deflate, best)     │
//!                              │  runtime/**     (optional engine)    │
//! EOF-64                       ├──────────────────────────────────────┤
//!                              │ TRAILER (64 bytes, little-endian)    │
//!                              │  "VDFT" magic + version + flags      │
//!                              │  zip_offset, zip_size                │
//!                              │  doc_crc32, manifest_crc32           │
//!                              │  reserved + "%%VDF-EOF\n"            │
//! EOF                          └──────────────────────────────────────┘
//! ```
//!
//! The ZIP payload is a fully standard ZIP archive: `unzip`, `7z`, Python's
//! `zipfile` and every OS can open it directly (they locate the end-of-central-
//! directory record by scanning backwards, which tolerates both the 64-byte
//! VDF header before it and the 64-byte trailer after it).

/// First line of every VDF file, mirroring PDF's `%PDF-1.7`.
pub const HEADER_MAGIC: &[u8; 9] = b"%VDF-1.0\n";

/// Total size of the fixed header block.
pub const HEADER_SIZE: usize = 64;

/// Total size of the fixed trailer block.
pub const TRAILER_SIZE: usize = 64;

/// Magic bytes at the start of the trailer.
pub const TRAILER_MAGIC: &[u8; 4] = b"VDFT";

/// Human end-marker, mirroring PDF's `%%EOF`.
pub const END_MARKER: &[u8; 10] = b"%%VDF-EOF\n";

/// MIME type stored (uncompressed, first entry) inside every VDF archive.
pub const MIMETYPE: &str = "application/vnd.vacter.vdf";

/// Trailer flag: archive embeds a Zolto runtime bundle under `runtime/`.
pub const FLAG_HAS_RUNTIME: u16 = 1 << 0;

/// Trailer flag: reserved for future encryption support.
pub const FLAG_ENCRYPTED: u16 = 1 << 1;

/// Trailer flag: reserved for future signature support.
pub const FLAG_SIGNED: u16 = 1 << 2;

/// Fixed trailer record (fields are little-endian on disk).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Trailer {
    pub version: u16,
    pub flags: u16,
    /// Absolute file offset where the ZIP payload starts (normally 64).
    pub zip_offset: u64,
    /// Byte length of the ZIP payload.
    pub zip_size: u64,
    /// CRC-32 of the raw entry document bytes.
    pub doc_crc32: u32,
    /// CRC-32 of the raw `manifest.json` bytes.
    pub manifest_crc32: u32,
}

impl Trailer {
    pub fn to_bytes(&self) -> [u8; TRAILER_SIZE] {
        let mut b = [0u8; TRAILER_SIZE];
        b[0..4].copy_from_slice(TRAILER_MAGIC);
        b[4..6].copy_from_slice(&self.version.to_le_bytes());
        b[6..8].copy_from_slice(&self.flags.to_le_bytes());
        b[8..16].copy_from_slice(&self.zip_offset.to_le_bytes());
        b[16..24].copy_from_slice(&self.zip_size.to_le_bytes());
        b[24..28].copy_from_slice(&self.doc_crc32.to_le_bytes());
        b[28..32].copy_from_slice(&self.manifest_crc32.to_le_bytes());
        // bytes 32..54 reserved (zero)
        b[54..64].copy_from_slice(END_MARKER);
        b
    }

    pub fn parse(b: &[u8]) -> Option<Trailer> {
        if b.len() != TRAILER_SIZE {
            return None;
        }
        if &b[0..4] != TRAILER_MAGIC || &b[54..64] != END_MARKER {
            return None;
        }
        Some(Trailer {
            version: u16::from_le_bytes([b[4], b[5]]),
            flags: u16::from_le_bytes([b[6], b[7]]),
            zip_offset: u64::from_le_bytes(b[8..16].try_into().ok()?),
            zip_size: u64::from_le_bytes(b[16..24].try_into().ok()?),
            doc_crc32: u32::from_le_bytes(b[24..28].try_into().ok()?),
            manifest_crc32: u32::from_le_bytes(b[28..32].try_into().ok()?),
        })
    }

    pub fn has_runtime(&self) -> bool {
        self.flags & FLAG_HAS_RUNTIME != 0
    }
}

/// Build the fixed 64-byte header block.
pub fn make_header() -> [u8; HEADER_SIZE] {
    let mut h = [0u8; HEADER_SIZE];
    h[0..9].copy_from_slice(HEADER_MAGIC);
    let comment = b"%VACTER-DOCUMENT-FILE container: zip/deflate payload + binary trailer";
    let n = comment.len().min(HEADER_SIZE - 9 - 1);
    h[9..9 + n].copy_from_slice(&comment[..n]);
    // pad the remainder with spaces and end with a newline
    for byte in h.iter_mut().skip(9 + n) {
        *byte = b' ';
    }
    h[HEADER_SIZE - 1] = b'\n';
    h
}

/// Check the header of a buffer that starts a candidate VDF file.
pub fn check_header(buf: &[u8]) -> Result<(), crate::error::VdfError> {
    if buf.len() < HEADER_SIZE {
        return Err(crate::error::VdfError::Truncated);
    }
    if &buf[0..9] != HEADER_MAGIC {
        return Err(crate::error::VdfError::BadHeaderMagic);
    }
    Ok(())
}
