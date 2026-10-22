//! `manifest.json` — the metadata record inside every VDF archive.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EngineInfo {
    pub name: String,
    pub version: String,
    #[serde(rename = "minVersion")]
    pub min_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Manifest {
    pub format: String,
    pub version: String,
    pub mimetype: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub author: String,
    #[serde(default)]
    pub subject: String,
    #[serde(default)]
    pub keywords: Vec<String>,
    #[serde(default)]
    pub created: String,
    #[serde(default)]
    pub modified: String,
    #[serde(default)]
    pub generator: String,
    /// Archive-relative path of the Zolto entry document, e.g. `document.zl`.
    pub entry: String,
    pub engine: EngineInfo,
    /// Archive-relative paths of bundled assets.
    #[serde(default)]
    pub assets: Vec<String>,
    /// Whether `runtime/zolto.bundle.js` is embedded in this archive.
    #[serde(default, rename = "hasRuntime")]
    pub has_runtime: bool,
    #[serde(default)]
    pub compression: String,
}

impl Manifest {
    pub fn new(entry: impl Into<String>) -> Manifest {
        let now = crate::util::now_rfc3339();
        Manifest {
            format: "vdf".into(),
            version: "1.0".into(),
            mimetype: crate::format::MIMETYPE.into(),
            title: String::new(),
            author: String::new(),
            subject: String::new(),
            keywords: Vec::new(),
            created: now.clone(),
            modified: now,
            generator: format!("vdf/{}", env!("CARGO_PKG_VERSION")),
            entry: entry.into(),
            engine: EngineInfo {
                name: "zolto".into(),
                version: crate::engine::ZOLTO_VERSION.into(),
                min_version: "1.0".into(),
            },
            assets: Vec::new(),
            has_runtime: false,
            compression: "deflate".into(),
        }
    }

    pub fn parse(bytes: &[u8]) -> Result<Manifest, String> {
        let m: Manifest = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
        if !m.format.eq_ignore_ascii_case("vdf") {
            return Err(format!("`format` must be \"vdf\", found {:?}", m.format));
        }
        if m.entry.is_empty() {
            return Err("`entry` must name the Zolto document (e.g. \"document.zl\")".into());
        }
        Ok(m)
    }

    pub fn to_json_bytes(&self) -> Vec<u8> {
        let mut b = serde_json::to_vec_pretty(self).expect("manifest serializes");
        b.push(b'\n');
        b
    }
}
