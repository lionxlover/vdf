//! Writing `.vdf` archives.

use std::io::{Cursor, Seek, SeekFrom, Write};
use std::path::Path;

use zip::write::SimpleFileOptions;
use zip::CompressionMethod;

use crate::error::{Result, VdfError};
use crate::format::{self, Trailer};
use crate::manifest::Manifest;

/// One in-memory archive entry.
#[derive(Clone)]
pub struct Entry {
    pub name: String,
    pub data: Vec<u8>,
}

/// Builder for a `.vdf` archive.
///
/// ```no_run
/// use vdf_core::{VdfBuilder, Manifest};
///
/// let mut manifest = Manifest::new("document.zl");
/// manifest.title = "Hello".into();
/// let logo = std::fs::read("logo.svg").unwrap();
/// let vdf = VdfBuilder::new(manifest, b"# Hello\n".to_vec())
///     .asset("assets/logo.svg", logo)
///     .runtime(false)
///     .build()
///     .unwrap();
/// std::fs::write("hello.vdf", vdf).unwrap();
/// ```
pub struct VdfBuilder {
    manifest: Manifest,
    document: Vec<u8>,
    assets: Vec<Entry>,
    with_runtime: bool,
}

impl VdfBuilder {
    pub fn new(manifest: Manifest, document: Vec<u8>) -> VdfBuilder {
        VdfBuilder {
            manifest,
            document,
            assets: Vec::new(),
            with_runtime: false,
        }
    }

    /// Add (or replace) an asset entry. Names are stored archive-relative,
    /// e.g. `assets/logo.svg`. Nested folders are created automatically.
    pub fn asset(mut self, name: impl Into<String>, data: Vec<u8>) -> Self {
        let name = name.into();
        if let Some(e) = self.assets.iter_mut().find(|e| e.name == name) {
            e.data = data;
        } else {
            self.assets.push(Entry { name, data });
        }
        self
    }

    /// Embed the Zolto runtime bundle under `runtime/`.
    pub fn runtime(mut self, yes: bool) -> Self {
        self.with_runtime = yes;
        self
    }

    /// Serialize the complete `.vdf` file into a byte vector.
    pub fn build(&self) -> Result<Vec<u8>> {
        let mut manifest = self.manifest.clone();
        manifest.has_runtime = self.with_runtime;
        manifest.assets = self.assets.iter().map(|e| e.name.clone()).collect();
        manifest.modified = crate::util::now_rfc3339();

        // deterministic entry order: assets sorted by name
        let mut assets = self.assets.clone();
        assets.sort_by(|a, b| a.name.cmp(&b.name));

        let manifest_bytes = manifest.to_json_bytes();
        let doc_crc = crc32fast::hash(&self.document);
        let manifest_crc = crc32fast::hash(&manifest_bytes);

        let mut out: Vec<u8> = Vec::with_capacity(4096);
        // 1. header
        out.extend_from_slice(&format::make_header());
        // 2. zip payload
        let zip_offset = out.len() as u64;
        {
            let mut cursor = Cursor::new(&mut out);
            cursor.seek(SeekFrom::End(0))?; // start writing after the header
            let mut zip = zip::ZipWriter::new(cursor);
            let stored = SimpleFileOptions::default()
                .compression_method(CompressionMethod::Stored);
            let best = SimpleFileOptions::default()
                .compression_method(CompressionMethod::Deflated)
                .compression_level(Some(10)) // "super compressed"
                .unix_permissions(0o644);

            // mimetype first, uncompressed (ODF convention — enables sniffing)
            zip.start_file("mimetype", stored)?;
            zip.write_all(format::MIMETYPE.as_bytes())?;
            // manifest
            zip.start_file("manifest.json", best)?;
            zip.write_all(&manifest_bytes)?;
            // entry document
            zip.start_file(&manifest.entry, best)?;
            zip.write_all(&self.document)?;
            // assets
            for e in &assets {
                ensure_safe_name(&e.name)?;
                zip.start_file(&e.name, best)?;
                zip.write_all(&e.data)?;
            }
            // optional runtime
            if self.with_runtime {
                for (name, data) in crate::engine::RUNTIME_FILES {
                    zip.start_file(name, best)?;
                    zip.write_all(data)?;
                }
            }
            let _cursor = zip.finish()?;
        }
        let zip_size = out.len() as u64 - zip_offset;

        // 3. trailer
        let trailer = Trailer {
            version: 1,
            flags: if self.with_runtime { format::FLAG_HAS_RUNTIME } else { 0 },
            zip_offset,
            zip_size,
            doc_crc32: doc_crc,
            manifest_crc32: manifest_crc,
        };
        out.extend_from_slice(&trailer.to_bytes());
        Ok(out)
    }

    /// Serialize and write to a file path.
    pub fn write_to(&self, path: &Path) -> Result<()> {
        // write to a sibling temp file first, then rename (atomic-ish)
        let bytes = self.build()?;
        let tmp = path.with_extension("vdf.tmp");
        {
            let mut f = std::fs::File::create(&tmp)?;
            f.write_all(&bytes)?;
            f.sync_all()?;
        }
        std::fs::rename(&tmp, path)?;
        Ok(())
    }
}

/// Ensure an archive entry name is relative and traversal-safe.
pub fn ensure_safe_name(name: &str) -> Result<()> {
    if name.is_empty()
        || name.starts_with('/')
        || name.contains('\\')
        || name.split('/').any(|p| p == "..")
    {
        return Err(VdfError::UnsafePath(name.to_string()));
    }
    Ok(())
}

/// Convenience: build a `.vdf` from a whole project directory on disk.
///
/// Layout expected:
///   `<dir>/document.zl` (or whatever `entry` says)
///   `<dir>/assets/**`
pub fn build_from_dir(
    dir: &Path,
    manifest: &mut Manifest,
    with_runtime: bool,
) -> Result<Vec<u8>> {
    let entry_path = dir.join(&manifest.entry);
    if !entry_path.is_file() {
        return Err(VdfError::BadProject(format!(
            "entry document `{}` not found in {}",
            manifest.entry,
            dir.display()
        )));
    }
    let document = std::fs::read(&entry_path)?;

    let mut builder = VdfBuilder::new(manifest.clone(), document);
    let assets_dir = dir.join("assets");
    if assets_dir.is_dir() {
        let mut files = Vec::new();
        collect_files(&assets_dir, "", &mut files)?;
        files.sort();
        for (rel, abs) in files {
            let name = format!("assets/{rel}");
            let data = std::fs::read(&abs)?;
            builder = builder.asset(name, data);
        }
    }
    let bytes = builder.runtime(with_runtime).build()?;
    manifest.has_runtime = with_runtime;
    Ok(bytes)
}

fn collect_files(root: &Path, prefix: &str, out: &mut Vec<(String, std::path::PathBuf)>)
-> std::io::Result<()> {
    for entry in std::fs::read_dir(root)? {
        let entry = entry?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue; // skip dotfiles (.gitkeep, .DS_Store, ...)
        }
        let rel = if prefix.is_empty() {
            name.clone()
        } else {
            format!("{prefix}/{name}")
        };
        if path.is_dir() {
            collect_files(&path, &rel, out)?;
        } else {
            out.push((rel, path));
        }
    }
    Ok(())
}
