//! Structural validation of `.vdf` archives.

use serde::Serialize;

use crate::error::VdfError;
use crate::format::MIMETYPE;
use crate::reader::VdfDocument;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Pass,
    Warn,
    Fail,
}

#[derive(Debug, Clone, Serialize)]
pub struct Check {
    pub name: String,
    pub status: Status,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Report {
    pub file: String,
    pub valid: bool,
    pub passed: usize,
    pub warnings: usize,
    pub failures: usize,
    pub checks: Vec<Check>,
}

impl Report {
    fn push(&mut self, name: &str, status: Status, detail: String) {
        match status {
            Status::Pass => self.passed += 1,
            Status::Warn => self.warnings += 1,
            Status::Fail => self.failures += 1,
        }
        self.checks.push(Check { name: name.into(), status, detail });
    }

    pub fn to_json(&self) -> String {
        serde_json::to_string_pretty(self).unwrap_or_default()
    }
}

/// Run the full check suite against an open document.
pub fn validate(doc: &mut VdfDocument) -> Report {
    let mut r = Report {
        file: doc.path.display().to_string(),
        valid: false,
        passed: 0,
        warnings: 0,
        failures: 0,
        checks: Vec::new(),
    };

    // 1. mimetype entry is first, stored, and correct
    let first_ok = doc
        .entry_info("mimetype")
        .map(|(i, name, method, _, _)| {
            let mut ok = true;
            if i != 0 {
                r.push("mimetype-position", Status::Fail, format!("mimetype is entry #{i}, must be first"));
                ok = false;
            }
            if name != "mimetype" {
                r.push("mimetype-name", Status::Fail, format!("first entry is `{name}`, must be `mimetype`"));
                ok = false;
            }
            if !method.eq_ignore_ascii_case("stored") {
                r.push("mimetype-stored", Status::Fail, format!("mimetype is {method}, must be stored (uncompressed)"));
                ok = false;
            }
            if ok {
                let bytes = doc.read_entry("mimetype").unwrap_or_default();
                if bytes == MIMETYPE.as_bytes() {
                    r.push("mimetype", Status::Pass, MIMETYPE.to_string());
                } else {
                    r.push("mimetype", Status::Fail, "wrong mimetype value".into());
                }
            }
        })
        .is_some();
    if !first_ok {
        r.push("mimetype", Status::Fail, "archive is empty".into());
    }

    // 2. manifest parsed (already done by open()) + sanity
    r.push("manifest-json", Status::Pass, format!("v{} · entry `{}`", doc.manifest.version, doc.manifest.entry));
    if doc.manifest.version != "1.0" {
        r.push("manifest-version", Status::Warn, format!("manifest version {} (tool supports 1.0)", doc.manifest.version));
    }

    // 3. trailer CRC of manifest
    match doc.read_entry("manifest.json") {
        Ok(bytes) => {
            let crc = crc32fast::hash(&bytes);
            if crc == doc.trailer.manifest_crc32 {
                r.push("manifest-crc32", Status::Pass, format!("{crc:08x}"));
            } else {
                r.push("manifest-crc32", Status::Fail,
                    format!("trailer says {:08x}, computed {crc:08x}", doc.trailer.manifest_crc32));
            }
        }
        Err(_) => r.push("manifest-crc32", Status::Fail, "manifest.json missing".into()),
    }

    // 4. entry document exists + CRC
    match doc.read_document() {
        Ok(bytes) => {
            let crc = crc32fast::hash(&bytes);
            if crc == doc.trailer.doc_crc32 {
                r.push("document-crc32", Status::Pass, format!("{} bytes, {crc:08x}", bytes.len()));
            } else {
                r.push("document-crc32", Status::Fail,
                    format!("trailer says {:08x}, computed {crc:08x}", doc.trailer.doc_crc32));
            }
            // 4b. sniff: does it look like Zolto/Markdown text?
            if looks_binary(&bytes) {
                r.push("document-text", Status::Warn, "entry document contains binary bytes (expected UTF-8 Zolto text)".into());
            } else {
                r.push("document-text", Status::Pass, "UTF-8 Zolto source".into());
            }
        }
        Err(VdfError::EntryNotFound(_)) => {
            r.push("document-crc32", Status::Fail, format!("entry document `{}` missing from archive", doc.manifest.entry));
        }
        Err(e) => r.push("document-crc32", Status::Fail, e.to_string()),
    }

    // 5. every asset listed in the manifest exists
    let names = doc.entry_names();
    let mut missing = 0;
    for a in &doc.manifest.assets {
        if !names.iter().any(|n| n == a) {
            r.push("asset-exists", Status::Fail, format!("manifest lists `{a}` but it is not in the archive"));
            missing += 1;
        }
    }
    if missing == 0 {
        r.push("assets", Status::Pass, format!("{} asset(s) all present", doc.manifest.assets.len()));
    }

    // 6. runtime consistency
    if doc.trailer.has_runtime() || doc.manifest.has_runtime {
        let has = names.iter().any(|n| n == "runtime/zolto.bundle.js");
        if has {
            r.push("runtime", Status::Pass, "embedded Zolto runtime".into());
        } else {
            r.push("runtime", Status::Fail, "flagged as having a runtime but `runtime/zolto.bundle.js` is missing".into());
        }
    } else {
        r.push("runtime", Status::Pass, "none (viewer uses its own engine copy)".into());
    }

    // 7. full CRC sweep over every entry (zip checks CRC while reading)
    let mut sweep_fail = 0;
    for name in &names {
        if let Err(e) = doc.read_entry(name) {
            r.push("zip-crc-sweep", Status::Fail, format!("`{name}`: {e}"));
            sweep_fail += 1;
        }
    }
    if sweep_fail == 0 {
        let (raw, packed) = doc.sizes();
        r.push("zip-crc-sweep", Status::Pass,
            format!("{} entries OK · {} -> {} packed", names.len(), crate::util::human_bytes(raw), crate::util::human_bytes(packed)));
    }

    // 8. path safety
    let mut unsafe_count = 0;
    for name in &names {
        if crate::reader::sanitize_entry_name(name).is_err() {
            r.push("path-safety", Status::Fail, format!("unsafe entry name `{name}`"));
            unsafe_count += 1;
        }
    }
    if unsafe_count == 0 {
        r.push("path-safety", Status::Pass, "no traversal/absolute paths".into());
    }

    r.valid = r.failures == 0;
    r
}

fn looks_binary(b: &[u8]) -> bool {
    if b.is_empty() {
        return false;
    }
    let n = b.len().min(2048);
    let bad = b[..n].iter().filter(|&&c| c == 0).count();
    bad > n / 16
}
