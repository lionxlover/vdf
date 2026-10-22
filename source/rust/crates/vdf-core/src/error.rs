//! Error type for all VDF operations.

use thiserror::Error;

#[derive(Debug, Error)]
pub enum VdfError {
    #[error("not a VDF file: bad header magic (expected `%VDF-1.0`)")]
    BadHeaderMagic,

    #[error("not a VDF file: bad trailer magic (expected `VDFT`)")]
    BadTrailerMagic,

    #[error("unsupported VDF version: {0} (this tool supports 1.x)")]
    UnsupportedVersion(u16),

    #[error("file is truncated (smaller than header + trailer)")]
    Truncated,

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("zip container error: {0}")]
    Zip(#[from] zip::result::ZipError),

    #[error("missing required entry: {0}")]
    MissingEntry(String),

    #[error("invalid manifest: {0}")]
    BadManifest(String),

    #[error("CRC mismatch for `{0}`: archive is corrupt or was modified")]
    CrcMismatch(String),

    #[error("unsafe path in archive: {0}")]
    UnsafePath(String),

    #[error("entry not found: {0}")]
    EntryNotFound(String),

    #[error("invalid project: {0}")]
    BadProject(String),
}

pub type Result<T> = std::result::Result<T, VdfError>;
