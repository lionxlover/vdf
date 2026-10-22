# Installing VDF

The `vdf` CLI ships as a single self-contained binary per platform — no
runtimes, no dependencies. Linux binaries are fully static (musl).

## Linux

```sh
./install.sh                 # auto-detects arch → ~/.local/bin/vdf
sudo ./install.sh /usr/local/bin   # system-wide
```

Manual: copy `binaries/linux/<arch>/vdf` anywhere in your `PATH` and
`chmod +x` it. Works on glibc and musl distros (Alpine, NixOS, Debian,
Ubuntu, Fedora, Arch…) on x86_64, aarch64 and armv7.

## macOS

```sh
./install.sh
```

- `binaries/macos/x86_64/vdf` — Intel Macs
- `binaries/macos/aarch64/vdf` — Apple Silicon (M1/M2/M3/M4)

Both are unsigned; on first run macOS Gatekeeper may warn. To allow:

```sh
xattr -d com.apple.quarantine "$(which vdf)"   # if you downloaded via browser
```

or right-click → Open in Finder.

## Windows

```powershell
.\install.ps1                # copies vdf.exe next to your profile + adds to PATH (user)
```

- `binaries\windows\x86_64\vdf.exe` — any 64-bit Windows
- `binaries\windows\aarch64\vdf.exe` — Windows-on-ARM

Or just double-click nothing — `vdf` is a command-line tool: open
PowerShell/Terminal in the folder and run `vdf.exe`.

> Windows SmartScreen may block unsigned binaries: *Properties → Unblock*,
> or `Unblock-File .\vdf.exe`.

## Android

### Viewer app (recommended)

```sh
adb install android/vdf-viewer.apk
```

or copy the APK to your phone and tap it (allow "install unknown apps").
Once installed, `.vdf` files open from any file manager. Requires
Android 7.0+ (API 24).

### CLI in Termux

```sh
# in Termux (pkg install termux-tools first if needed)
cp binaries/android/aarch64/vdf $PREFIX/bin/vdf
chmod +x $PREFIX/bin/vdf
vdf --help
```

Pick `aarch64` for modern phones, `armv7` for 32-bit devices, `x86_64` for
emulators/Chromebooks, `x86` for old emulators.

### For app developers — the AAR

Add `android/vdf-android.aar` to your module's dependencies:

```kotlin
dependencies {
    implementation(files("libs/vdf-android.aar"))
}
```

```kotlin
val info = com.vacter.vdf.Vdf.info("/path/file.vdf")      // manifest JSON
val files = com.vacter.vdf.Vdf.extract(path, outDir)      // String[] of files
val ok = com.vacter.vdf.Vdf.isValid(path)
```

All four ABIs (arm64-v8a, armeabi-v7a, x86_64, x86) are inside the AAR.

## Browser extension

### Chrome / Edge / Brave / Opera / Vivaldi (Chromium family)

1. Open `chrome://extensions` (Edge: `edge://extensions`)
2. Enable **Developer mode** (top right)
3. **Load unpacked** → select the `browser-extension/` folder
4. Pin "VDF Viewer" → click the icon → drop a `.vdf` file

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on…** → pick `browser-extension/manifest.json`
3. Toolbar → VDF Viewer icon → drop a `.vdf` file

The extension parses everything locally — no network access, no permissions.

## Verify your download

```sh
sha256sum -c SHA256SUMS.txt        # Linux / macOS
certutil -hashfile vdf-viewer.apk SHA256   # Windows (compare manually)
```

## Building from source

```sh
cd source/rust
cargo build --release                        # native CLI
cargo test                                   # full test suite incl. cross-format checks
bash ../android/build-apk.sh                 # APK (needs Android SDK build-tools 34)
bash ../android/build-aar.sh                 # AAR
```

Cross-compiling all shipped binaries from Linux requires
[cargo-zigbuild](https://github.com/rust-cross/cargo-zigbuild) + Zig for
Linux/macOS/Windows targets, llvm-mingw for Windows ARM64, and the Android
NDK for the Android targets — see `scripts/crossbuild.sh` in the project
source tree for the exact, tested invocations.


## Web app (every device)
`web-app/` is an installable VDF Viewer for Windows, macOS, Linux, ChromeOS, Android, iPhone and iPad.
Serve the folder over HTTPS (or `python3 -m http.server` locally), open it, and use your browser's
Install / Add to Home Screen option. See `web-app/README.md`.
