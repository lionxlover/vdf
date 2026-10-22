package com.vacter.vdf;

/**
 * VDF (Vacter Document File) — Android bridge to the native Rust core.
 *
 * The native library ({@code libvdf.so}) is built from the open-source Rust
 * workspace (crates/vdf-jni) and shipped for arm64-v8a, armeabi-v7a, x86_64
 * and x86.
 *
 * <pre>
 * // unpack a .vdf and read its manifest
 * String info = Vdf.info("/sdcard/Download/report.vdf");          // JSON
 * String[] files = Vdf.extract("/sdcard/Download/report.vdf", outDir);
 * boolean ok = Vdf.validate("/sdcard/Download/report.vdf");
 * </pre>
 */
public final class Vdf {

    static {
        System.loadLibrary("vdf");
    }

    private Vdf() {}

    // ── raw JNI surface ────────────────────────────────────────────────────

    public static native String nativeVersion();
    public static native String nativeInfo(String path);
    public static native String nativeValidate(String path);
    public static native String[] nativeExtract(String path, String destDir);
    public static native boolean nativeBuild(String projectDir, String outFile,
                                              String title, String author);

    // ── friendly wrappers ──────────────────────────────────────────────────

    /** Tool + engine + format versions, one string. */
    public static String version() { return nativeVersion(); }

    /**
     * Manifest + trailer + entry list of a .vdf file as JSON.
     * Returns {@code null} when the file cannot be opened as VDF.
     */
    public static String info(String path) { return nativeInfo(path); }

    /**
     * Unpack a .vdf into {@code destDir}; returns the extracted
     * archive-relative paths (or {@code null} on failure).
     */
    public static String[] extract(String path, String destDir) {
        return nativeExtract(path, destDir);
    }

    /**
     * Structural validation (mimetype position, CRC-32 checksums, path
     * safety, entry presence). Returns the JSON report; never throws.
     */
    public static String validate(String path) { return nativeValidate(path); }

    /**
     * Convenience validity check.
     */
    public static boolean isValid(String path) {
        try {
            String json = nativeValidate(path);
            return json != null && json.contains("\"valid\":true");
        } catch (Throwable t) {
            return false;
        }
    }

    /**
     * Pack a project directory ({@code document.zl} + {@code assets/} +
     * optional {@code vdf.toml}) into a .vdf file.
     */
    public static boolean build(String projectDir, String outFile, String title, String author) {
        return nativeBuild(projectDir, outFile, title, author);
    }
}
