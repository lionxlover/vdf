#!/bin/bash
# Cross-compile vdf CLI for every target + Android JNI libraries.
# Resumable: targets whose artifact already exists in dist/ are skipped,
# so this script can be re-run (or crash-looped) until everything is built.
set -u
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$PATH"
VDF=/home/z/my-project/vdf
DIST=/home/z/my-project/dist
NDK=/home/z/my-project/.toolchains/android-ndk-r27c/toolchains/llvm/prebuilt/linux-x86_64/bin
LLVMMINGW=$(ls -d /home/z/my-project/.toolchains/llvm-mingw-*/bin | head -1)
mkdir -p "$DIST/binaries" "$DIST/android-jni"
cd "$VDF"

BUILD_LOG=/home/z/my-project/logs/crossbuild.log
touch "$BUILD_LOG"

have() { [ -f "$1" ]; }

build_cli() { # $1=target  $2=outdir name  $3=binname
  local target=$1 name=$2 bin=$3
  if have "$DIST/binaries/$name/$bin"; then echo "SKIP $name (already built)" | tee -a "$BUILD_LOG"; return 0; fi
  echo "=== $name ($target) ===" | tee -a "$BUILD_LOG"
  if cargo zigbuild --release --target "$target" -p vdf-cli >>"$BUILD_LOG" 2>&1; then
    mkdir -p "$DIST/binaries/$name"
    cp "target/$target/release/$bin" "$DIST/binaries/$name/$bin"
    echo "OK  $name -> $(file -b "$DIST/binaries/$name/$bin" | cut -c1-72)" | tee -a "$BUILD_LOG"
  else
    echo "FAIL $name — see $BUILD_LOG" | tee -a "$BUILD_LOG"
  fi
}

# --- Linux (musl static via zig) ---
build_cli x86_64-unknown-linux-musl      linux-x86_64   vdf
build_cli aarch64-unknown-linux-musl     linux-aarch64  vdf
build_cli armv7-unknown-linux-musleabihf linux-armv7    vdf

# --- macOS ---
build_cli x86_64-apple-darwin            macos-x86_64   vdf
build_cli aarch64-apple-darwin           macos-aarch64  vdf

# --- Windows ---
build_cli x86_64-pc-windows-gnu          windows-x86_64 vdf.exe

# --- Windows ARM64 (llvm-mingw) ---
if have "$DIST/binaries/windows-aarch64/vdf.exe"; then
  echo "SKIP windows-aarch64 (already built)" | tee -a "$BUILD_LOG"
else
  echo "=== windows-aarch64 (aarch64-pc-windows-gnullvm) ===" | tee -a "$BUILD_LOG"
  if CARGO_TARGET_AARCH64_PC_WINDOWS_GNULLVM_LINKER="$LLVMMINGW/aarch64-w64-mingw32-clang" \
     cargo zigbuild --release --target aarch64-pc-windows-gnullvm -p vdf-cli >>"$BUILD_LOG" 2>&1; then
    mkdir -p "$DIST/binaries/windows-aarch64"
    cp target/aarch64-pc-windows-gnullvm/release/vdf.exe "$DIST/binaries/windows-aarch64/vdf.exe"
    echo "OK  windows-aarch64" | tee -a "$BUILD_LOG"
  else
    echo "FAIL windows-aarch64 — see $BUILD_LOG" | tee -a "$BUILD_LOG"
  fi
fi

# --- Android CLI (NDK, bionic) ---
export CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER="$NDK/aarch64-linux-android24-clang"
export CARGO_TARGET_ARMV7_LINUX_ANDROIDEABI_LINKER="$NDK/armv7a-linux-androideabi24-clang"
export CARGO_TARGET_X86_64_LINUX_ANDROID_LINKER="$NDK/x86_64-linux-android24-clang"
export CARGO_TARGET_I686_LINUX_ANDROID_LINKER="$NDK/i686-linux-android24-clang"

for t in aarch64-linux-android:android-aarch64 \
         armv7-linux-androideabi:android-armv7 \
         x86_64-linux-android:android-x86_64 \
         i686-linux-android:android-x86; do
  target=${t%%:*}; name=${t##*:}
  if have "$DIST/binaries/$name/vdf"; then echo "SKIP $name (already built)" | tee -a "$BUILD_LOG"; continue; fi
  echo "=== $name ($target) ===" | tee -a "$BUILD_LOG"
  if cargo build --release --target "$target" -p vdf-cli >>"$BUILD_LOG" 2>&1; then
    mkdir -p "$DIST/binaries/$name"
    cp "target/$target/release/vdf" "$DIST/binaries/$name/vdf"
    echo "OK  $name" | tee -a "$BUILD_LOG"
  else
    echo "FAIL $name — see $BUILD_LOG" | tee -a "$BUILD_LOG"
  fi
done

# --- Android JNI .so (vdf-jni cdylib) ---
jni() { # $1=target $2=abi
  if have "$DIST/android-jni/$2/libvdf.so"; then echo "SKIP jni-$2 (already built)" | tee -a "$BUILD_LOG"; return 0; fi
  echo "=== jni $2 ===" | tee -a "$BUILD_LOG"
  if cargo build --release --target "$1" -p vdf-jni >>"$BUILD_LOG" 2>&1; then
    mkdir -p "$DIST/android-jni/$2"
    cp "target/$1/release/libvdf_jni.so" "$DIST/android-jni/$2/libvdf.so"
    echo "OK  jni-$2 ($(stat -c%s "$DIST/android-jni/$2/libvdf.so") bytes)" | tee -a "$BUILD_LOG"
  else
    echo "FAIL jni-$2 — see $BUILD_LOG" | tee -a "$BUILD_LOG"
  fi
}
jni aarch64-linux-android   arm64-v8a
jni armv7-linux-androideabi armeabi-v7a
jni x86_64-linux-android    x86_64
jni i686-linux-android      x86

# --- completion check ---
MISSING=0
for pair in linux-x86_64/vdf linux-aarch64/vdf linux-armv7/vdf macos-x86_64/vdf macos-aarch64/vdf \
            windows-x86_64/vdf.exe windows-aarch64/vdf.exe android-aarch64/vdf android-armv7/vdf \
            android-x86_64/vdf android-x86/vdf; do
  have "$DIST/binaries/$pair" || MISSING=1
done
for abi in arm64-v8a armeabi-v7a x86_64 x86; do
  have "$DIST/android-jni/$abi/libvdf.so" || MISSING=1
done
if [ "$MISSING" = 0 ]; then
  echo "ALL_CROSS_BUILDS_DONE" | tee -a "$BUILD_LOG"
else
  echo "INCOMPLETE — rerun this script to resume" | tee -a "$BUILD_LOG"
fi
