//! Generates the standalone HTML viewer for `vdf view`.
//!
//! Two modes:
//! * **directory** — writes `zolto.bundle.js` next to the HTML and keeps
//!   `assets/**` as relative paths (default).
//! * **single-file** — inlines the engine *and* every asset as a `data:` URI,
//!   producing one portable `.html` that renders anywhere.

use crate::engine::ZOLTO_BUNDLE;

/// The VDF logo (inline SVG, gradient document + V monogram).
pub const LOGO_SVG: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B3DF5"/><stop offset="1" stop-color="#00C2D1"/></linearGradient></defs><rect x="96" y="32" width="320" height="448" rx="40" fill="url(#g)"/><path d="M296 40l112 112h-76c-20 0-36-16-36-36V40z" fill="#0B0620" opacity=".22"/><path d="M170 196l71 178 71-178" fill="none" stroke="#fff" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/><path d="M158 412h196" stroke="#fff" stroke-width="26" stroke-linecap="round" opacity=".92"/></svg>"##;

fn favicon_data_uri() -> String {
    use base64_compat::b64;
    format!("data:image/svg+xml;base64,{}", b64(LOGO_SVG.as_bytes()))
}

/// Minimal base64 (standard alphabet, padded) — avoids a dependency.
mod base64_compat {
    const T: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    pub fn b64(data: &[u8]) -> String {
        let mut out = String::with_capacity(data.len().div_ceil(3) * 4);
        for chunk in data.chunks(3) {
            let b = [chunk[0], *chunk.get(1).unwrap_or(&0), *chunk.get(2).unwrap_or(&0)];
            let n = (u32::from(b[0]) << 16) | (u32::from(b[1]) << 8) | u32::from(b[2]);
            out.push(T[(n >> 18) as usize & 63] as char);
            out.push(T[(n >> 12) as usize & 63] as char);
            out.push(if chunk.len() > 1 { T[(n >> 6) as usize & 63] as char } else { '=' });
            out.push(if chunk.len() > 2 { T[n as usize & 63] as char } else { '=' });
        }
        out
    }
}

/// Guess a MIME type for data-URIs from an asset name.
pub fn mime_for(name: &str) -> &'static str {
    let ext = name.rsplit('.').next().unwrap_or("").to_ascii_lowercase();
    match ext.as_str() {
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "avif" => "image/avif",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "woff2" => "font/woff2",
        "woff" => "font/woff",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "ogg" => "audio/ogg",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "pdf" => "application/pdf",
        "json" => "application/json",
        "css" => "text/css",
        "js" | "mjs" => "text/javascript",
        "txt" | "md" | "zl" => "text/plain;charset=utf-8",
        _ => "application/octet-stream",
    }
}

pub struct ViewerInput<'a> {
    pub title: &'a str,
    pub doc_src: &'a str,
    /// `(archive-relative name, bytes)` — used in single-file mode (inline)
    /// and for `assets/fonts/*` auto web-font injection in both modes.
    pub assets: &'a [(String, Vec<u8>)],
    pub single_file: bool,
}

const TEMPLATE: &str = r#"<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE_HTML__</title>
<link rel="icon" href="__FAVI__">
<style>
__FONTS_CSS__
:root{--vdf-ink:#171a23;--vdf-muted:#69707f;--vdf-accent:#5b3df5;--vdf-line:#e6e8ee}
*{box-sizing:border-box}
body{margin:0;background:#f3f4f7;color:var(--vdf-ink);font:16px/1.7 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
.vdf-top{position:sticky;top:0;z-index:9;display:flex;align-items:center;gap:10px;padding:10px 20px;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--vdf-line);font-size:13px;color:var(--vdf-muted)}
.vdf-top img{height:22px;width:22px;display:block}
.vdf-top .t{font-weight:600;color:var(--vdf-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60vw}
.vdf-top .fill{flex:1}
.vdf-pill{font-size:11px;font-weight:600;padding:5px 10px;border-radius:999px;background:linear-gradient(135deg,#5b3df5,#00c2d1);color:#fff;letter-spacing:.4px}
main.doc{max-width:880px;margin:0 auto;padding:40px 28px 96px;background:#fff;min-height:calc(100vh - 44px);box-shadow:0 1px 30px rgba(23,26,35,.05)}
img{max-width:100%;height:auto}
@media print{.vdf-top{display:none}body{background:#fff}main.doc{box-shadow:none;max-width:none;padding:0}}
__FONT_STACK__
</style>
</head>
<body>
<header class="vdf-top">
  <img src="__FAVI__" alt="VDF">
  <span class="t">__TITLE_HTML__</span>
  <span class="fill"></span>
  <span class="vdf-pill">VDF 1.0</span>
</header>
<main class="doc" id="vdf-doc"></main>
__ENGINE_SCRIPT__
<script>
(function () {
  var Z = window.Zolto;
  var docEl = document.getElementById('vdf-doc');
  if (!Z) {
    docEl.innerHTML = '<p style="color:#b00">Zolto engine failed to load.</p>';
    return;
  }
  var src = __DOC_JSON__;
  var ASSETS = __ASSET_JSON__;
  try {
    var out = Z.parse(src);
    docEl.innerHTML = Z.compile(src);
    if (out.errors && out.errors.length) console.warn('Zolto diagnostics:', out.errors);
    if (ASSETS && Object.keys(ASSETS).length) {
      docEl.querySelectorAll('[src]').forEach(function (el) {
        var v = el.getAttribute('src');
        if (v && ASSETS[v]) el.setAttribute('src', ASSETS[v]);
      });
      docEl.querySelectorAll('[href]').forEach(function (el) {
        var v = el.getAttribute('href');
        if (v && ASSETS[v]) el.setAttribute('href', ASSETS[v]);
      });
    }
    if (typeof Z.initZoltoInteractivity === 'function') {
      try { Z.initZoltoInteractivity(document); } catch (e) { console.warn(e); }
    }
  } catch (e) {
    docEl.innerHTML = '<pre style="white-space:pre-wrap;background:#fdecea;color:#8a1111;padding:14px;border-radius:8px">Render error: ' +
      String((e && e.message) || e).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</pre>';
  }
})();
</script>
</body>
</html>"#;

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// Build `@font-face` rules for any `assets/fonts/**` entries.
/// In single-file mode the font is inlined as a data URI; otherwise it is
/// referenced by its (relative) archive path.
fn fonts_css(assets: &[(String, Vec<u8>)], single_file: bool) -> (String, Vec<String>) {
    let mut css = String::new();
    let mut families = Vec::new();
    let mut n = 0usize;
    for (name, data) in assets {
        if !name.starts_with("assets/fonts/") {
            continue;
        }
        let ext = name.rsplit('.').next().unwrap_or("").to_ascii_lowercase();
        let format = match ext.as_str() {
            "woff2" => "woff2",
            "woff" => "woff",
            "ttf" => "truetype",
            "otf" => "opentype",
            _ => continue,
        };
        n += 1;
        let family = format!("VdfFont{n}");
        let src = if single_file {
            format!("data:{};base64,{}", mime_for(name), crate::viewer::base64_compat::b64(data))
        } else {
            name.clone()
        };
        let weight = if name.to_ascii_lowercase().contains("bold") { "bold" } else { "normal" };
        css.push_str(&format!(
            "@font-face{{font-family:'{family}';src:url('{src}') format('{format}');font-weight:{weight};font-display:swap;}}\n"
        ));
        families.push(family);
    }
    (css, families)
}

/// Render the complete viewer HTML.
pub fn generate_viewer_html(input: &ViewerInput) -> String {
    let favi = favicon_data_uri();
    let (font_css, font_families) = fonts_css(input.assets, input.single_file);
    let font_stack = if font_families.is_empty() {
        String::new()
    } else {
        format!("body{{font-family:{},ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif}}", font_families.join(","))
    };
    let engine_script = if input.single_file {
        format!("<script>\n{}\n</script>", String::from_utf8_lossy(ZOLTO_BUNDLE))
    } else {
        "<script src=\"zolto.bundle.js\"></script>".to_string()
    };
    let assets_json = if input.single_file {
        let mut m = serde_json::Map::new();
        for (name, data) in input.assets {
            let uri = format!(
                "data:{};base64,{}",
                mime_for(name),
                crate::viewer::base64_compat::b64(data)
            );
            m.insert(name.clone(), serde_json::Value::String(uri));
        }
        serde_json::to_string(&serde_json::Value::Object(m)).unwrap_or_else(|_| "{}".into())
    } else {
        "{}".to_string()
    };

    TEMPLATE
        .replace("__TITLE_HTML__", &escape_html(input.title))
        .replace("__FAVI__", &favi)
        .replace("__FONTS_CSS__", &font_css)
        .replace("__FONT_STACK__", &font_stack)
        .replace("__ENGINE_SCRIPT__", &engine_script)
        .replace(
            "__DOC_JSON__",
            &serde_json::to_string(input.doc_src).unwrap_or_else(|_| "\"\"".into()),
        )
        .replace("__ASSET_JSON__", &assets_json)
}
