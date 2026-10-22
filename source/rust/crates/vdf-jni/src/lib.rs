//! JNI bindings for VDF — used by `com.vacter.vdf.Vdf` on Android.
//!
//! Exposed natives:
//!   String  nativeVersion()
//!   String  nativeInfo(String path)          // JSON: manifest + trailer
//!   String  nativeValidate(String path)      // JSON: check report
//!   String[] nativeExtract(String path, String destDir)
//!   boolean nativeBuild(String projectDir, String outFile, String title, String author)
//!
//! All functions never panic across the FFI boundary (panic = abort in release
//! builds would kill the host app); errors are reported as null / error JSON.

#![allow(non_snake_case)]

use jni::objects::{JClass, JObject, JString};
use jni::sys::{jboolean, jstring};
use jni::JNIEnv;
use std::path::PathBuf;

thread_local! {
    static LAST_ERROR: std::cell::RefCell<Option<String>> = const { std::cell::RefCell::new(None) };
}

fn set_error(msg: String) {
    LAST_ERROR.with(|e| *e.borrow_mut() = Some(msg));
}

/// `String` → Java `jstring`.
fn to_jstring(env: &mut JNIEnv, s: &str) -> jstring {
    env.new_string(s)
        .map(|j| j.into_raw())
        .unwrap_or(std::ptr::null_mut())
}

/// Java `jstring` → Rust `String`.
fn from_jstring(env: &mut JNIEnv, s: JString) -> Option<String> {
    env.get_string(&s).ok().map(|j| j.to_string_lossy().into_owned())
}

/// Catch panics so they never cross FFI.
fn guard<T>(env: &mut JNIEnv, f: impl FnOnce(&mut JNIEnv) -> Option<T> + std::panic::UnwindSafe) -> Option<T> {
    match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| f(env))) {
        Ok(v) => v,
        Err(_) => {
            set_error("internal panic".into());
            None
        }
    }
}

// ─── nativeVersion() ──────────────────────────────────────────────────────────

#[no_mangle]
pub extern "system" fn Java_com_vacter_vdf_Vdf_nativeVersion(
    env: JNIEnv, _class: JClass,
) -> jstring {
    let mut env = env;
    let v = format!(
        "vdf {} · zolto {} · format VDF-1.0",
        vdf_core::VERSION,
        vdf_core::engine::ZOLTO_VERSION
    );
    to_jstring(&mut env, &v)
}

// ─── nativeInfo(String path) ─────────────────────────────────────────────────

#[no_mangle]
pub extern "system" fn Java_com_vacter_vdf_Vdf_nativeInfo(
    env: JNIEnv, _class: JClass, path: JString,
) -> jstring {
    let mut env = env;
    let out = guard(&mut env, |env| {
        let path = from_jstring(env, path)?;
        let mut doc = vdf_core::VdfDocument::open(&path).ok()?;
        let (raw, packed) = doc.sizes();
        let j = serde_json::json!({
            "path": path,
            "title": doc.manifest.title,
            "author": doc.manifest.author,
            "entry": doc.manifest.entry,
            "created": doc.manifest.created,
            "modified": doc.manifest.modified,
            "generator": doc.manifest.generator,
            "hasRuntime": doc.trailer.has_runtime(),
            "assets": doc.manifest.assets,
            "entries": doc.entry_names(),
            "rawBytes": raw,
            "packedBytes": packed,
        });
        Some(serde_json::to_string(&j).unwrap())
    });
    match out {
        Some(s) => to_jstring(&mut env, &s),
        None => std::ptr::null_mut(),
    }
}

// ─── nativeValidate(String path) ─────────────────────────────────────────────

#[no_mangle]
pub extern "system" fn Java_com_vacter_vdf_Vdf_nativeValidate(
    env: JNIEnv, _class: JClass, path: JString,
) -> jstring {
    let mut env = env;
    let out = guard(&mut env, |env| {
        let path = from_jstring(env, path)?;
        let mut doc = vdf_core::VdfDocument::open(&path).ok()?;
        let report = vdf_core::validate::validate(&mut doc);
        Some(report.to_json())
    });
    match out {
        Some(s) => to_jstring(&mut env, &s),
        None => std::ptr::null_mut(),
    }
}

// ─── nativeExtract(String path, String destDir) -> String[] ──────────────────

#[no_mangle]
pub extern "system" fn Java_com_vacter_vdf_Vdf_nativeExtract(
    env: JNIEnv, _class: JClass, path: JString, dest_dir: JString,
) -> jni::sys::jobjectArray {
    let mut env = env;
    let out: Option<Vec<String>> = guard(&mut env, |env| {
        let path = from_jstring(env, path)?;
        let dest = from_jstring(env, dest_dir)?;
        let mut doc = vdf_core::VdfDocument::open(&path).ok()?;
        let dest = PathBuf::from(&dest);
        let files = doc.extract_to(&dest).ok()?;
        let base = dest.canonicalize().unwrap_or(dest);
        Some(
            files
                .iter()
                .map(|f| {
                    f.strip_prefix(&base)
                        .map(|p| p.to_string_lossy().replace('\\', "/"))
                        .unwrap_or_else(|_| f.to_string_lossy().to_string())
                })
                .collect(),
        )
    });
    match out {
        Some(rels) => {
            let arr = match env.new_object_array(
                rels.len() as i32,
                "java/lang/String",
                JObject::null(),
            ) {
                Ok(a) => a,
                Err(_) => return std::ptr::null_mut(),
            };
            for (i, rel) in rels.iter().enumerate() {
                if let Ok(js) = env.new_string(rel) {
                    let _ = env.set_object_array_element(&arr, i as i32, js);
                }
            }
            arr.into_raw()
        }
        None => std::ptr::null_mut(),
    }
}

// ─── nativeBuild(String dir, String outFile, String title, String author) ────

#[no_mangle]
pub extern "system" fn Java_com_vacter_vdf_Vdf_nativeBuild(
    env: JNIEnv, _class: JClass, project_dir: JString, out_file: JString,
    title: JString, author: JString,
) -> jboolean {
    let mut env = env;
    let ok = guard(&mut env, |env| {
        let dir = from_jstring(env, project_dir)?;
        let out = from_jstring(env, out_file)?;
        let title = from_jstring(env, title).unwrap_or_default();
        let author = from_jstring(env, author).unwrap_or_default();

        // minimal inline project resolution (mirrors vdf-cli logic)
        let dir = PathBuf::from(&dir);
        let mut manifest = vdf_core::Manifest::new("document.zl");
        // read vdf.toml if present (very small subset parser to avoid a toml dep)
        if let Ok(text) = std::fs::read_to_string(dir.join("vdf.toml")) {
            for line in text.lines() {
                let line = line.trim();
                if let Some(v) = line.strip_prefix("entry") {
                    let v = v.trim_start().strip_prefix('=').unwrap_or(v).trim();
                    let v = v.trim_matches('"');
                    if !v.is_empty() { manifest.entry = v.to_string(); }
                } else if let Some(v) = line.strip_prefix("title") {
                    let v = v.trim_start().strip_prefix('=').unwrap_or(v).trim();
                    let v = v.trim_matches('"');
                    if !v.is_empty() { manifest.title = v.to_string(); }
                } else if let Some(v) = line.strip_prefix("author") {
                    let v = v.trim_start().strip_prefix('=').unwrap_or(v).trim();
                    let v = v.trim_matches('"');
                    if !v.is_empty() { manifest.author = v.to_string(); }
                }
            }
        }
        if !title.is_empty() { manifest.title = title; }
        if !author.is_empty() { manifest.author = author; }
        if manifest.title.is_empty() {
            manifest.title = "Untitled VDF".to_string();
        }
        vdf_core::writer::build_from_dir(&dir, &mut manifest, false)
            .ok()
            .and_then(|bytes| std::fs::write(&out, bytes).ok())
            .map(|_| true)
    });
    match ok {
        Some(true) => 1,
        _ => 0,
    }
}

// ─── JNI_OnLoad: report JNI 1.6 compatibility ────────────────────────────────

#[no_mangle]
pub extern "system" fn JNI_OnLoad(_vm: jni::JavaVM, _env: *mut std::ffi::c_void) -> jni::sys::jint {
    jni::sys::JNI_VERSION_1_6
}
