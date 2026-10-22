//! Embedded Zolto runtime.
//!
//! The full Zolto engine (https://github.com/uxle/Zolto, MIT) is bundled at
//! build time into a single classic-script file (~390 KB minified) so that
//! `vdf view` works fully offline and `.vdf` archives can optionally embed a
//! renderer (`vdf build --runtime`) that any host application can use.

/// The single-file Zolto engine bundle (IIFE, exposes `window.Zolto`).
pub const ZOLTO_BUNDLE: &[u8] = include_bytes!("../engine/zolto.bundle.js");

/// Zolto's MIT license text, embedded for attribution.
pub const ZOLTO_LICENSE: &[u8] = include_bytes!("../engine/ZOLTO-LICENSE");

/// Version of the vendored Zolto engine.
pub const ZOLTO_VERSION: &str = "15.0.0";

/// Files written into the `runtime/` folder when `--runtime` is enabled.
pub const RUNTIME_FILES: &[(&str, &[u8])] = &[
    ("runtime/zolto.bundle.js", ZOLTO_BUNDLE),
    ("runtime/ZOLTO-LICENSE", ZOLTO_LICENSE),
    (
        "runtime/README.txt",
        b"Zolto runtime embedded by VDF (Vacter Document File).\n\
          \n\
          Load `zolto.bundle.js` as a classic <script>; it exposes `window.Zolto`\n\
          with `parse`, `render`, `compile` and `initZoltoInteractivity`.\n\
          Render the entry document (see `manifest.json` -> `entry`) with:\n\
          \n\
            Zolto.initZoltoInteractivity(document);\n\
            el.innerHTML = Zolto.compile(zlSource);\n\
          \n\
          Engine: https://github.com/uxle/Zolto (MIT)\n",
    ),
];
