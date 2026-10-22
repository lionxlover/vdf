#!/bin/bash
# VDF project — build environment setup, no-root edition (all parts parallel)
BASE=/home/z/my-project
LOGS=$BASE/logs
TC=$BASE/.toolchains
mkdir -p "$LOGS" "$TC"

run_bg() {
  local name="$1"; shift
  nohup bash -c "$*" >"$LOGS/$name.log" 2>&1 &
  echo "launched $name pid=$!"
}

# --- Rust stable + all cross targets + cargo-zigbuild ---
run_bg rust 'curl -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal --no-modify-path && \
  . $HOME/.cargo/env && \
  rustup target add x86_64-unknown-linux-musl aarch64-unknown-linux-musl armv7-unknown-linux-musleabihf \
    x86_64-apple-darwin aarch64-apple-darwin x86_64-pc-windows-gnu aarch64-pc-windows-gnullvm \
    aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android && \
  cargo install --locked cargo-zigbuild && echo RUST_OK'

# --- Zig 0.13 (linker for macOS, musl, and x86_64 windows-gnu via cargo-zigbuild) ---
run_bg zig "cd $TC && \
  curl -sSLO https://ziglang.org/download/0.13.0/zig-linux-x86_64-0.13.0.tar.xz && \
  tar xf zig-linux-x86_64-0.13.0.tar.xz && rm -f zig-linux-x86_64-0.13.0.tar.xz && \
  mkdir -p \$HOME/.local/bin && ln -sf $TC/zig-linux-x86_64-0.13.0/zig \$HOME/.local/bin/zig && \
  \$HOME/.local/bin/zig version && echo ZIG_OK"

# --- llvm-mingw (linker for aarch64-pc-windows-gnullvm), latest release ---
run_bg llvmmingw "cd $TC && \
  URL=\$(curl -s https://api.github.com/repos/mstorsjo/llvm-mingw/releases/latest | grep browser_download_url | grep 'ucrt-x86_64.tar.xz' | head -1 | cut -d '\"' -f4) && \
  echo downloading \$URL && \
  curl -sSL \$URL -o llvm-mingw.tar.xz && tar xf llvm-mingw.tar.xz && rm -f llvm-mingw.tar.xz && \
  ls -d $TC/llvm-mingw* && echo LLVMMINGW_OK"

# --- Android NDK r27c ---
run_bg ndk "cd $TC && \
  curl -sSL -o ndk.zip https://dl.google.com/android/repository/android-ndk-r27c-linux.zip && \
  unzip -q ndk.zip && rm -f ndk.zip && ls -d $TC/android-ndk-r27c && echo NDK_OK"

# --- Android SDK: cmdline-tools + platform-34 + build-tools 34 (system java 21 available) ---
run_bg sdk 'mkdir -p /home/z/my-project/.toolchains/android-sdk/cmdline-tools && \
  cd /home/z/my-project/.toolchains/android-sdk/cmdline-tools && \
  curl -sSL -o ctools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip && \
  unzip -q ctools.zip && rm -f ctools.zip && mv cmdline-tools latest && \
  yes | ./latest/bin/sdkmanager --sdk_root=/home/z/my-project/.toolchains/android-sdk "platforms;android-34" "build-tools;34.0.0" >/dev/null 2>&1; \
  ls /home/z/my-project/.toolchains/android-sdk/build-tools/34.0.0/aapt2 && echo SDK_OK'

# --- Temurin JDK 21 (javac for Android app compile; system has JRE only) ---
run_bg jdk "mkdir -p $TC/jdk && cd $TC/jdk && \
  curl -sSL 'https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse' -o jdk21.tar.gz && \
  tar xzf jdk21.tar.gz --strip-components=1 && rm -f jdk21.tar.gz && \
  $TC/jdk/bin/javac -version && echo JDK_OK"

# --- python fonttools (font subsetting for sample assets) ---
run_bg fonttools 'pip3 install -q fonttools && $HOME/.venv/bin/pyftsubset --version && echo FONTTOOLS_OK'

echo "ALL_SETUP_LAUNCHED"
