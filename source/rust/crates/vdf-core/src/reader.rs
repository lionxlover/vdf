//! Reading `.vdf` archives.

use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

use crate::error::{Result, VdfError};
use crate::format::{self, Trailer, HEADER_SIZE, TRAILER_SIZE};
use crate::manifest::Manifest;

/// An open `.vdf` document.
pub struct VdfDocument {
    pub path: PathBuf,
    pub trailer: Trailer,
    zip: zip::ZipArchive<std::fs::File>,
    pub manifest: Manifest,
}

impl VdfDocument {
    /// Open and parse a `.vdf` file (header, trailer, manifest).
    pub fn open(path: impl AsRef<Path>) -> Result<VdfDocument> {
        let path = path.as_ref().to_path_buf();
        let mut file = std::fs::File::open(&path)?;
        let file_len = file.metadata()?.len();
        if file_len < (HEADER_SIZE + TRAILER_SIZE) as u64 {
            return Err(VdfError::Truncated);
        }

        // header
        let mut header = [0u8; HEADER_SIZE];
        file.read_exact(&mut header)?;
        format::check_header(&header)?;

        // trailer
        file.seek(SeekFrom::End(-(TRAILER_SIZE as i64)))?;
        let mut trailer_bytes = [0u8; TRAILER_SIZE];
        file.read_exact(&mut trailer_bytes)?;
        let trailer =
            Trailer::parse(&trailer_bytes).ok_or(VdfError::BadTrailerMagic)?;
        if trailer.version != 1 {
            return Err(VdfError::UnsupportedVersion(trailer.version));
        }
        if trailer.zip_offset + trailer.zip_size > file_len {
            return Err(VdfError::BadTrailerMagic);
        }

        // zip payload — seek to the start of the archive and open it.
        // (zip-rs locates the EOCD by scanning back from EOF, which tolerates
        // both our 64-byte header prefix and the 64-byte trailer suffix.)
        file.seek(SeekFrom::Start(trailer.zip_offset))?;
        let mut zip = zip::ZipArchive::new(file)?;

        // manifest (must exist)
        let manifest_bytes = read_zip_entry(&mut zip, "manifest.json")
            .ok_or_else(|| VdfError::MissingEntry("manifest.json".into()))?;
        let manifest = Manifest::parse(&manifest_bytes)
            .map_err(VdfError::BadManifest)?;

        Ok(VdfDocument { path, trailer, zip, manifest })
    }

    pub fn entry_names(&self) -> Vec<String> {
        self.zip
            .file_names()
            .map(|s| s.to_string())
            .collect()
    }

    /// `(index, name, compression, uncompressed, compressed)` for an entry.
    pub fn entry_info(&mut self, name: &str) -> Option<(usize, String, String, u64, u64)> {
        let i = self.zip.index_for_name(name)?;
        let f = self.zip.by_index(i).ok()?;
        Some((
            i,
            f.name().to_string(),
            f.compression().to_string(),
            f.size(),
            f.compressed_size(),
        ))
    }

    /// Read one archive entry fully into memory.
    pub fn read_entry(&mut self, name: &str) -> Result<Vec<u8>> {
        read_zip_entry(&mut self.zip, name)
            .ok_or_else(|| VdfError::EntryNotFound(name.to_string()))
    }

    /// Read the entry document (`manifest.entry`, e.g. `document.zl`).
    pub fn read_document(&mut self) -> Result<Vec<u8>> {
        self.read_entry(&self.manifest.entry.clone())
    }

    /// Total uncompressed / compressed size of the ZIP payload.
    pub fn sizes(&mut self) -> (u64, u64) {
        let mut raw = 0u64;
        let mut packed = 0u64;
        for i in 0..self.zip.len() {
            if let Ok(f) = self.zip.by_index(i) {
                raw += f.size();
                packed += f.compressed_size();
            }
        }
        (raw, packed)
    }

    /// Extract the whole archive into `dir`. Returns the extracted file paths.
    /// Paths are sanitized (no `..`, no absolute, no `\`).
    pub fn extract_to(&mut self, dir: &Path) -> Result<Vec<PathBuf>> {
        std::fs::create_dir_all(dir)?;
        let mut written = Vec::new();
        for i in 0..self.zip.len() {
            let mut file = self.zip.by_index(i).map_err(VdfError::Zip)?;
            let name = file.name().to_string();
            if name.ends_with('/') {
                continue; // directory entry
            }
            let safe = sanitize_entry_name(&name)?;
            let out_path = dir.join(&safe);
            if let Some(parent) = out_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            let mut out = std::fs::File::create(&out_path)?;
            std::io::copy(&mut file, &mut out)?;
            written.push(out_path);
        }
        Ok(written)
    }
}

fn read_zip_entry<R: Read + Seek>(
    zip: &mut zip::ZipArchive<R>,
    name: &str,
) -> Option<Vec<u8>> {
    let mut f = zip.by_name(name).ok()?;
    let mut buf = Vec::with_capacity(f.size() as usize);
    f.read_to_end(&mut buf).ok()?;
    Some(buf)
}

/// Reject unsafe archive paths; return the normalized relative path.
pub fn sanitize_entry_name(name: &str) -> Result<PathBuf> {
    let bad = name.is_empty()
        || name.starts_with('/')
        || name.contains('\\')
        || name.split('/').any(|p| p == ".." || p.is_empty());
    if bad {
        return Err(VdfError::UnsafePath(name.to_string()));
    }
    // also reject windows drive-letter style names like C:/
    if name.len() >= 2 && name.as_bytes()[1] == b':' {
        return Err(VdfError::UnsafePath(name.to_string()));
    }
    let mut p = PathBuf::new();
    for part in name.split('/') {
        p.push(part);
    }
    Ok(p)
}
