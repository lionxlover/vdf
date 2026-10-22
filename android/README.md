# Android — VDF Viewer APK & VDF Library (AAR)

Two artifacts are produced from this directory:

## vdf-viewer.apk — the viewer app

- Standalone Android app (min SDK 24 / Android 7.0+, target SDK 34)
- Opens `.vdf` files from any file manager (`ACTION_VIEW` for
  `application/vnd.vacter.vdf`, octet-stream and zip content), or via the
  in-app picker
- Bundles the Zolto engine and a sample document; renders fully offline in a
  WebView
- Native core (`libvdf.so`) for all four ABIs: arm64-v8a, armeabi-v7a,
  x86_64, x86

Install: `adb install vdf-viewer.apk` (signed with a debug key — install
"unknown apps" must be allowed when installing manually).

## vdf-android.aar — the library for your apps

Drop it into `libs/`:

```kotlin
dependencies {
    implementation(files("libs/vdf-android.aar"))
}
```

API surface (`com.vacter.vdf.Vdf`, JNI-backed, all ABIs included):

```kotlin
// metadata (manifest + trailer + entries) as JSON — null if not a VDF
val info: String? = Vdf.info("/path/doc.vdf")

// unpack into a directory; returns the archive-relative paths, or null
val files: Array<String>? = Vdf.extract("/path/doc.vdf", outDir)

// full structural validation report (JSON)
val report: String? = Vdf.validate("/path/doc.vdf")

// quick validity check
val ok: Boolean = Vdf.isValid("/path/doc.vdf")

// pack a project directory (document.zl + assets/ + optional vdf.toml)
val built: Boolean = Vdf.build(projectDir, outFile, title, author)

// version banner
println(Vdf.version())   // "vdf 1.0.0 · zolto 15.0.0 · format VDF-1.0"
```

## Building from source

Requires JDK 21, Android SDK (build-tools 34.0.0 + platforms;android-34) and
the JNI libraries from `dist/android-jni/` (produced by
`source/scripts/crossbuild.sh`):

```sh
bash build-apk.sh    # → dist/android/vdf-viewer.apk
bash build-aar.sh    # → dist/android/vdf-android.aar
```

Layout:

```
app/       viewer APK sources (AndroidManifest, MainActivity, res/, assets/)
library/   AAR sources (Vdf.java, library manifest)
```
