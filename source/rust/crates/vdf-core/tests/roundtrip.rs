//! Round-trip and structure tests for the VDF 1.0 format.

use vdf_core::{Manifest, VdfBuilder, VdfDocument};

fn sample_manifest() -> Manifest {
    let mut m = Manifest::new("document.zl");
    m.title = "Test Doc".into();
    m.author = "Vacter".into();
    m.keywords = vec!["vdf".into(), "test".into()];
    m
}

#[test]
fn roundtrip_basic() {
    let m = sample_manifest();
    let doc_src = b"# Hello VDF\n\nSome *markdown*.\n".to_vec();
    let bytes = VdfBuilder::new(m, doc_src.clone())
        .asset("assets/logo.svg", b"<svg/>".to_vec())
        .build()
        .expect("build");

    let tmp = std::env::temp_dir().join(format!("vdf-test-{}.vdf", std::process::id()));
    std::fs::write(&tmp, &bytes).unwrap();

    let mut d = VdfDocument::open(&tmp).expect("open");
    assert_eq!(d.trailer.version, 1);
    assert!(!d.trailer.has_runtime());
    assert_eq!(d.manifest.title, "Test Doc");
    assert_eq!(d.read_document().unwrap(), doc_src);
    assert_eq!(d.read_entry("assets/logo.svg").unwrap(), b"<svg/>");

    // header/trailer framing
    let raw = std::fs::read(&tmp).unwrap();
    assert_eq!(&raw[0..9], b"%VDF-1.0\n");
    assert_eq!(&raw[raw.len() - 10..], b"%%VDF-EOF\n");

    // validation suite passes
    let mut d = VdfDocument::open(&tmp).unwrap();
    let report = vdf_core::validate::validate(&mut d);
    println!("{report:?}");
    assert!(report.valid, "validation must pass");
    std::fs::remove_file(&tmp).ok();
}

#[test]
fn roundtrip_with_runtime() {
    let m = sample_manifest();
    let bytes = VdfBuilder::new(m, b"# doc\n".to_vec())
        .runtime(true)
        .build()
        .unwrap();
    let tmp = std::env::temp_dir().join(format!("vdf-test-rt-{}.vdf", std::process::id()));
    std::fs::write(&tmp, &bytes).unwrap();

    let mut d = VdfDocument::open(&tmp).unwrap();
    assert!(d.trailer.has_runtime());
    assert!(d.manifest.has_runtime);
    let bundle = d.read_entry("runtime/zolto.bundle.js").unwrap();
    assert!(!bundle.is_empty());
    let report = vdf_core::validate::validate(&mut d);
    assert!(report.valid);
    std::fs::remove_file(&tmp).ok();
}

/// Independent check: the ZIP central directory must be locatable and the
/// entries readable by a third-party consumer (Python's zipfile).
#[test]
fn zip_payload_is_standard() {
    let m = sample_manifest();
    let bytes = VdfBuilder::new(m, b"# standard zip test\n".to_vec())
        .asset("assets/a.txt", vec![b'x'; 100_000])
        .build()
        .unwrap();
    let tmp = std::env::temp_dir().join(format!("vdf-test-zip-{}.vdf", std::process::id()));
    std::fs::write(&tmp, &bytes).unwrap();

    let py = format!(
        r##"
import json, sys, zipfile
z = zipfile.ZipFile({})
bad = z.testzip()
assert bad is None, f"crc fail: {{bad}}"
names = z.namelist()
assert names[0] == "mimetype", names
assert z.read("mimetype") == b"application/vnd.vacter.vdf"
assert z.read("document.zl") == b"# standard zip test\n"
assert len(z.read("assets/a.txt")) == 100000
info = z.getinfo("mimetype")
assert info.compress_type == 0, "mimetype must be stored"
info2 = z.getinfo("assets/a.txt")
assert info2.compress_type == 8, "assets must be deflate"
assert info2.file_size == 100000 and info2.compress_size < 1000, "must actually compress"
print("PYTHON_ZIP_OK")
"##,
        serde_json::json!(tmp.to_str().unwrap())
    );
    let out = std::process::Command::new("python3")
        .arg("-c")
        .arg(&py)
        .output()
        .expect("python3 available on test host");
    assert!(
        String::from_utf8_lossy(&out.stdout).contains("PYTHON_ZIP_OK"),
        "python zipfile check failed:\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    );

    // compression must actually shrink (super compressed)
    let mut d = VdfDocument::open(&tmp).unwrap();
    let (raw, packed) = d.sizes();
    assert!(packed < raw / 10, "expected >10x, got {raw} -> {packed}");
    std::fs::remove_file(&tmp).ok();
}

#[test]
fn detect_corruption() {
    let m = sample_manifest();
    let bytes = VdfBuilder::new(m, b"# corrupt me\n".to_vec()).build().unwrap();
    let mut corrupted = bytes.clone();
    // flip a byte inside the document payload area (after header, in zip body)
    let mid = 64 + 40;
    corrupted[mid] ^= 0xFF;

    let tmp = std::env::temp_dir().join(format!("vdf-test-corrupt-{}.vdf", std::process::id()));
    std::fs::write(&tmp, &corrupted).unwrap();
    let mut d = VdfDocument::open(&tmp).unwrap();
    let report = vdf_core::validate::validate(&mut d);
    assert!(!report.valid, "corruption must be detected");
    std::fs::remove_file(&tmp).ok();
}

#[test]
fn reject_garbage() {
    let tmp = std::env::temp_dir().join(format!("vdf-test-garbage-{}.vdf", std::process::id()));
    std::fs::write(&tmp, b"this is not a vdf file at all, just text padding padding padding!!").unwrap();
    let err = VdfDocument::open(&tmp);
    assert!(err.is_err());
    std::fs::remove_file(&tmp).ok();
}

#[test]
fn viewer_html_generation() {
    let v = vdf_core::viewer::generate_viewer_html(&vdf_core::viewer::ViewerInput {
        title: "Hello <&> World",
        doc_src: "# Hi\n\n$E=mc^2$",
        assets: &[("assets/logo.svg".to_string(), b"<svg/>".to_vec())],
        single_file: true,
    });
    assert!(v.contains("Hello &lt;&amp;&gt; World"));
    assert!(v.contains("window.Zolto") || v.contains("Zolto"));
    assert!(v.contains("data:image/svg+xml;base64,"), "single-file inlines assets");
    assert!(v.contains("# Hi\\n"), "doc source embedded as JSON");
}
