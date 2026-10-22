//! Subcommand implementations.

use std::path::{Path, PathBuf};

use colored::Colorize;
use vdf_core::util::human_bytes;
use vdf_core::viewer::ViewerInput;
use vdf_core::VdfDocument;

use crate::project;

fn say(what: &str) {
    println!("{} {}", "vdf".truecolor(0x5b, 0x3d, 0xf5).bold(), what);
}

// ─── init ─────────────────────────────────────────────────────────────────────

pub fn init(
    path: Option<PathBuf>,
    title: Option<String>,
    author: Option<String>,
    entry: Option<String>,
) -> i32 {
    let dir = path.unwrap_or_else(|| PathBuf::from("."));
    if let Err(e) = std::fs::create_dir_all(&dir) {
        eprintln!("error: cannot create {}: {e}", dir.display());
        return 1;
    }
    let entry = entry.unwrap_or_else(|| "document.zl".into());

    let doc = dir.join(&entry);
    if doc.exists() {
        eprintln!("error: {} already exists", doc.display());
        return 1;
    }
    let assets = dir.join("assets");
    std::fs::create_dir_all(&assets).ok();

    let mut starter = project::starter_document();
    if let Some(t) = &title {
        starter = starter.replace("My First VDF Document", t);
    }
    if let Some(a) = &author {
        starter = starter.replace("author: Vacter", &format!("author: {a}"));
    }

    let logo = vdf_core::viewer::LOGO_SVG;
    let toml = format!(
        "# VDF project configuration\n\
         # Docs: https://github.com/uxle/Zolto — engine for the .zl document\n\n\
         [document]\n\
         entry = {entry:?}\n\
         title = {title:?}\n\
         author = {author:?}\n\
         subject = \"\"\n\
         keywords = []\n\n\
         [build]\n\
         runtime = false   # true → embed a Zolto renderer inside the .vdf\n\
         output  = \"\"      # blank → <dirname>.vdf next to the project folder\n",
        title = title.unwrap_or_else(|| "My First VDF Document".into()),
        author = author.unwrap_or_else(|| "Vacter".into()),
    );

    let write = |p: &Path, data: &str, what: &str| {
        std::fs::write(p, data).unwrap_or_else(|e| panic!("write {}: {e}", p.display()));
        println!("  created  {}", p.display().to_string().dimmed());
        let _ = what;
    };

    write(&doc, &starter, "document");
    write(&assets.join("logo.svg"), logo, "logo");
    write(&dir.join("vdf.toml"), &toml, "config");

    say(&format!(
        "project ready — {count} file(s)\n  next:  edit {entry}  →  `vdf build {dir}`  →  `vdf view <name>.vdf`",
        count = 3,
        dir = dir.display()
    ));
    0
}

// ─── build ────────────────────────────────────────────────────────────────────

pub fn build(
    path: Option<PathBuf>,
    output: Option<PathBuf>,
    force_runtime: bool,
    title: Option<String>,
    author: Option<String>,
) -> i32 {
    let dir = path.unwrap_or_else(|| PathBuf::from("."));
    if !dir.is_dir() {
        eprintln!("error: {} is not a directory", dir.display());
        return 1;
    }
    let cfg = project::resolve(&dir, title, author);
    let out = output.unwrap_or(cfg.output);
    // `--runtime` forces embedding; otherwise follow vdf.toml [build].runtime
    let with_runtime = if force_runtime { true } else { cfg.with_runtime };

    let t0 = std::time::Instant::now();
    let mut manifest = cfg.manifest.clone();
    match vdf_core::writer::build_from_dir(&dir, &mut manifest, with_runtime) {
        Ok(bytes) => {
            if let Err(e) = std::fs::write(&out, &bytes) {
                eprintln!("error: cannot write {}: {e}", out.display());
                return 1;
            }
            match VdfDocument::open(&out) {
                Ok(mut doc) => {
                    let (rawsize, packed) = doc.sizes();
                    let file_size = std::fs::metadata(&out).map(|m| m.len()).unwrap_or(0);
                    let ratio = if rawsize > 0 {
                        (packed as f64 / rawsize as f64) * 100.0
                    } else {
                        0.0
                    };
                    say(&format!(
                        "built {}  ·  {} entries  ·  {} → {} packed ({ratio:.0}%)  ·  file {}  ·  {t0:.2}s",
                        out.display(),
                        doc.entry_names().len(),
                        human_bytes(rawsize),
                        human_bytes(packed),
                        human_bytes(file_size),
                        t0 = t0.elapsed().as_secs_f32(),
                    ));
                    if with_runtime {
                        println!("  runtime: embedded (Zolto {})", vdf_core::engine::ZOLTO_VERSION);
                    }
                }
                Err(e) => {
                    eprintln!("warning: built file failed re-open check: {e}");
                }
            }
            0
        }
        Err(e) => {
            eprintln!("error: build failed: {e}");
            1
        }
    }
}

// ─── extract ──────────────────────────────────────────────────────────────────

pub fn extract(file: PathBuf, output: Option<PathBuf>) -> i32 {
    let mut doc = match VdfDocument::open(&file) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("error: {}: {e}", file.display());
            return 1;
        }
    };
    let out = output.unwrap_or_else(|| {
        let stem = file.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        file.parent()
            .unwrap_or_else(|| Path::new("."))
            .join(format!("{stem}.extracted"))
    });
    match doc.extract_to(&out) {
        Ok(files) => {
            say(&format!(
                "extracted {} entr{} → {}",
                files.len(),
                if files.len() == 1 { "y" } else { "ies" },
                out.display()
            ));
            for f in files.iter().take(40) {
                println!("  {}", f.display().to_string().dimmed());
            }
            if files.len() > 40 {
                println!("  … and {} more", files.len() - 40);
            }
            0
        }
        Err(e) => {
            eprintln!("error: extract failed: {e}");
            1
        }
    }
}

// ─── list ─────────────────────────────────────────────────────────────────────

pub fn list(file: PathBuf, json: bool) -> i32 {
    let mut doc = match VdfDocument::open(&file) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("error: {}: {e}", file.display());
            return 1;
        }
    };
    if json {
        let names = doc.entry_names();
        let mut items = Vec::new();
        for name in names {
            if let Some((_, _, method, size, _)) = doc.entry_info(&name) {
                items.push(serde_json::json!({
                    "name": name,
                    "method": method,
                    "size": size,
                }));
            }
        }
        println!("{}", serde_json::to_string_pretty(&items).unwrap());
        return 0;
    }
    say(&format!("table of contents — {}", file.display()));
    println!(
        "  {m:<9} {s:>10} {p:>10} {r:>6}  {n}",
        m = "Method".bold(),
        s = "Size".bold(),
        p = "Packed".bold(),
        r = "Ratio".bold(),
        n = "Entry".bold()
    );
    for name in doc.entry_names() {
        if let Some((_, _, method, size, packed)) = doc.entry_info(&name) {
            let ratio = if size > 0 { (packed as f64 / size as f64) * 100.0 } else { 100.0 };
            let mark = if name == doc.manifest.entry {
                "← entry".dimmed().to_string()
            } else {
                String::new()
            };
            println!(
                "  {m:<9} {s:>10} {p:>10} {r:>5.0}%  {n} {mark}",
                m = method,
                s = human_bytes(size),
                p = human_bytes(packed),
                r = ratio,
                n = name,
            );
        }
    }
    0
}

// ─── info ─────────────────────────────────────────────────────────────────────

pub fn info(file: PathBuf, json: bool) -> i32 {
    let mut doc = match VdfDocument::open(&file) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("error: {}: {e}", file.display());
            return 1;
        }
    };
    if json {
        let (raw, packed) = doc.sizes();
        let j = serde_json::json!({
            "path": file,
            "fileSize": std::fs::metadata(&file).map(|m| m.len()).unwrap_or(0),
            "format": { "version": "1.0", "mimetype": vdf_core::format::MIMETYPE },
            "trailer": {
                "version": doc.trailer.version,
                "flags": doc.trailer.flags,
                "hasRuntime": doc.trailer.has_runtime(),
                "zipOffset": doc.trailer.zip_offset,
                "zipSize": doc.trailer.zip_size,
                "docCrc32": format!("{:08x}", doc.trailer.doc_crc32),
                "manifestCrc32": format!("{:08x}", doc.trailer.manifest_crc32),
            },
            "manifest": serde_json::to_value(&doc.manifest).unwrap_or_default(),
            "payload": { "raw": raw, "packed": packed },
        });
        println!("{}", serde_json::to_string_pretty(&j).unwrap());
        return 0;
    }
    let m = &doc.manifest;
    say(&format!("{} — VDF 1.0", file.display()));
    println!("  {:<12} {}", "Title".bold(), m.title);
    println!("  {:<12} {}", "Author".bold(), if m.author.is_empty() { "—" } else { &m.author });
    if !m.subject.is_empty() {
        println!("  {:<12} {}", "Subject".bold(), m.subject);
    }
    if !m.keywords.is_empty() {
        println!("  {:<12} {}", "Keywords".bold(), m.keywords.join(", "));
    }
    println!("  {:<12} {}", "Entry".bold(), m.entry);
    println!("  {:<12} {} v{} (min {})", "Engine".bold(), m.engine.name, m.engine.version, m.engine.min_version);
    println!("  {:<12} {}", "Created".bold(), m.created);
    println!("  {:<12} {}", "Modified".bold(), m.modified);
    println!("  {:<12} {}", "Generator".bold(), m.generator);
    println!("  {:<12} {}", "Assets".bold(), m.assets.len());
    println!("  {:<12} {}", "Runtime".bold(), if doc.trailer.has_runtime() { "embedded" } else { "none" });
    let (raw, packed) = doc.sizes();
    println!(
        "  {:<12} {} → {} packed ({:.0}%)",
        "Payload".bold(),
        human_bytes(raw),
        human_bytes(packed),
        if raw > 0 { packed as f64 / raw as f64 * 100.0 } else { 0.0 }
    );
    println!(
        "  {:<12} doc {:#010x} · manifest {:#010x}",
        "CRC-32".bold(),
        doc.trailer.doc_crc32,
        doc.trailer.manifest_crc32
    );
    0
}

// ─── validate ─────────────────────────────────────────────────────────────────

pub fn validate(file: PathBuf, json: bool) -> i32 {
    let mut doc = match VdfDocument::open(&file) {
        Ok(d) => d,
        Err(e) => {
            if json {
                println!(
                    "{}",
                    serde_json::json!({"file": file.display().to_string(), "valid": false, "openError": e.to_string()})
                );
            } else {
                eprintln!("error: {}: {e}", file.display());
            }
            return 1;
        }
    };
    let report = vdf_core::validate::validate(&mut doc);
    if json {
        println!("{}", report.to_json());
        return if report.valid { 0 } else { 1 };
    }
    say(&format!(
        "validating {} — {} pass · {} warn · {} fail",
        file.display(),
        report.passed.to_string().green(),
        report.warnings.to_string().yellow(),
        report.failures.to_string().red(),
    ));
    for c in &report.checks {
        let icon = match c.status {
            vdf_core::validate::Status::Pass => "✓".green(),
            vdf_core::validate::Status::Warn => "⚠".yellow(),
            vdf_core::validate::Status::Fail => "✗".red(),
        };
        println!("  {icon} {:<18} {}", c.name, c.detail.dimmed());
    }
    if report.valid {
        println!("  {}", "VALID — this is a well-formed VDF 1.0 file".green().bold());
        0
    } else {
        println!("  {}", "INVALID — see failed checks above".red().bold());
        1
    }
}

// ─── view ─────────────────────────────────────────────────────────────────────

pub fn view(file: PathBuf, output: Option<PathBuf>, single: Option<PathBuf>, no_open: bool) -> i32 {
    let mut doc = match VdfDocument::open(&file) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("error: {}: {e}", file.display());
            return 1;
        }
    };
    let title = if doc.manifest.title.is_empty() {
        file.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default()
    } else {
        doc.manifest.title.clone()
    };
    let doc_src = match doc.read_document() {
        Ok(b) => String::from_utf8_lossy(&b).to_string(),
        Err(e) => {
            eprintln!("error: cannot read entry document: {e}");
            return 1;
        }
    };

    // Single portable HTML file
    if let Some(out_path) = single {
        let mut assets = Vec::new();
        for name in doc.entry_names() {
            if name.starts_with("assets/") && !name.ends_with('/') {
                if let Ok(data) = doc.read_entry(&name) {
                    assets.push((name, data));
                }
            }
        }
        let html = vdf_core::viewer::generate_viewer_html(&ViewerInput {
            title: &title,
            doc_src: &doc_src,
            assets: &assets,
            single_file: true,
        });
        if let Err(e) = std::fs::write(&out_path, html) {
            eprintln!("error: cannot write {}: {e}", out_path.display());
            return 1;
        }
        let size = std::fs::metadata(&out_path).map(|m| m.len()).unwrap_or(0);
        say(&format!(
            "single-file viewer → {} ({}) — open it in any browser",
            out_path.display(),
            human_bytes(size)
        ));
        if !no_open {
            open_in_browser(&out_path);
        }
        return 0;
    }

    // Directory viewer
    let outdir = output.unwrap_or_else(|| {
        let stem = file.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| "doc".into());
        std::env::temp_dir().join(format!("vdf-view-{}-{}", stem, std::process::id()))
    });
    if let Err(e) = doc.extract_to(&outdir) {
        eprintln!("error: extract failed: {e}");
        return 1;
    }
    // always place a fresh engine copy next to the viewer
    if let Err(e) = std::fs::write(outdir.join("zolto.bundle.js"), vdf_core::engine::ZOLTO_BUNDLE) {
        eprintln!("error: cannot write engine: {e}");
        return 1;
    }
    // Directory viewer: pass font names (empty bytes — dir mode references
    // files by relative path) so the viewer injects @font-face rules.
    let mut font_names = Vec::new();
    for name in doc.entry_names() {
        if name.starts_with("assets/fonts/") && !name.ends_with('/') {
            font_names.push((name, Vec::new()));
        }
    }
    let html = vdf_core::viewer::generate_viewer_html(&ViewerInput {
        title: &title,
        doc_src: &doc_src,
        assets: &font_names,
        single_file: false,
    });
    let index = outdir.join("index.html");
    if let Err(e) = std::fs::write(&index, html) {
        eprintln!("error: cannot write {}: {e}", index.display());
        return 1;
    }
    say(&format!("viewer ready → {}", index.display()));
    if !no_open {
        open_in_browser(&index);
    } else {
        println!("  (open {} in a browser)", index.display());
    }
    0
}

fn open_in_browser(path: &Path) {
    #[cfg(target_os = "macos")]
    let ok = std::process::Command::new("open").arg(path).spawn().is_ok();
    #[cfg(target_os = "windows")]
    let ok = std::process::Command::new("explorer").arg(path).spawn().is_ok();
    #[cfg(all(unix, not(target_os = "macos"), not(target_os = "android")))]
    let ok = std::process::Command::new("xdg-open").arg(path).spawn().is_ok();
    #[cfg(target_os = "android")]
    let ok = { let _ = path; false };
    if !ok {
        println!("  (open {} in a browser)", path.display());
    }
}
