//! VDF project handling: `vdf.toml` + directory layout.

use std::path::{Path, PathBuf};

use serde::Deserialize;
use vdf_core::Manifest;

#[derive(Debug, Deserialize, Default)]
pub struct ProjectDoc {
    pub entry: Option<String>,
    pub title: Option<String>,
    pub author: Option<String>,
    pub subject: Option<String>,
    pub keywords: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Default)]
pub struct ProjectBuild {
    pub runtime: Option<bool>,
    pub output: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
pub struct Project {
    pub document: Option<ProjectDoc>,
    pub build: Option<ProjectBuild>,
}

pub struct LoadedProject {
    pub dir: PathBuf,
    pub manifest: Manifest,
    pub with_runtime: bool,
    pub output: PathBuf,
}

pub fn load(dir: &Path, title: Option<String>, author: Option<String>) -> std::io::Result<(Project, PathBuf)> {
    let file = dir.join("vdf.toml");
    let (project, path) = if file.is_file() {
        let text = std::fs::read_to_string(&file)?;
        let p: Project = toml::from_str(&text).map_err(|e| {
            std::io::Error::new(std::io::ErrorKind::InvalidData, format!("vdf.toml: {e}"))
        })?;
        (p, file)
    } else {
        (Project::default(), file)
    };
    let _ = title;
    let _ = author;
    Ok((project, path))
}

/// Resolve a full build configuration from a project dir + CLI overrides.
pub fn resolve(
    dir: &Path,
    cli_title: Option<String>,
    cli_author: Option<String>,
) -> LoadedProject {
    let (project, _) = load(dir, cli_title.clone(), cli_author.clone())
        .unwrap_or_default_path(dir);

    let doc = project.document.unwrap_or_default();
    let bld = project.build.unwrap_or_default();

    let mut manifest = Manifest::new(doc.entry.clone().unwrap_or_else(|| "document.zl".into()));
    manifest.title = cli_title
        .or(doc.title)
        .unwrap_or_else(|| fallback_title(dir));
    manifest.author = cli_author.or(doc.author).unwrap_or_default();
    manifest.subject = doc.subject.unwrap_or_default();
    manifest.keywords = doc.keywords.unwrap_or_default();

    // default output: <parent>/<dirname>.vdf next to the project dir
    let output = match bld.output.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        Some(o) => {
            let p = PathBuf::from(o);
            if p.is_absolute() { p } else { dir.join(p) }
        }
        None => default_output_for(dir),
    };

    LoadedProject {
        dir: dir.to_path_buf(),
        manifest,
        with_runtime: bld.runtime.unwrap_or(false),
        output,
    }
}

trait DefaultPath {
    fn unwrap_or_default_path(self, dir: &Path) -> (Project, PathBuf);
}
impl DefaultPath for std::io::Result<(Project, PathBuf)> {
    fn unwrap_or_default_path(self, dir: &Path) -> (Project, PathBuf) {
        self.unwrap_or_else(|_| (Project::default(), dir.join("vdf.toml")))
    }
}

fn fallback_title(dir: &Path) -> String {
    dir.file_name()
        .map(|s| s.to_string_lossy().to_string())
        .filter(|s| !s.is_empty() && s != ".")
        .unwrap_or_else(|| "Untitled VDF".into())
}

pub fn default_output_for(dir: &Path) -> PathBuf {
    let name = dir
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "document".into());
    let name = name.trim_end_matches('/');
    let file = format!("{}.vdf", if name.is_empty() { "document" } else { name });
    dir.parent()
        .map(|p| p.join(&file))
        .unwrap_or_else(|| PathBuf::from(&file))
}

/// Starter document written by `vdf init`.
pub fn starter_document() -> String {
    r#"---
title: My First VDF Document
author: Vacter
---

@var product = VDF

# Welcome to {{product}}

This is a **Zolto** document living inside a `.vdf` archive — one super-compressed
file that carries the document, its images, SVGs and fonts everywhere it goes.

[note title="Why VDF?"]
- PDF-style identity: `%VDF-1.0` magic header + CRC trailer
- A standard ZIP inside — `unzip` opens it too
- Renders in any browser with the Zolto engine
[/note]

## Try some math

The mass-energy relation $E = mc^2$ renders natively, no LaTeX server needed.

## A chart

@chart bar title="Compression ratio by content type"
labels:
Text
SVG
PNG
Font

data:
88
62
4
55
@/chart

## An image from the assets folder

![VDF logo](assets/logo.svg)

---

Edit `document.zl`, drop files into `assets/`, then run `vdf build`.
"#
    .to_string()
}
