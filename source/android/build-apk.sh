#!/bin/bash
# Build the VDF Viewer APK entirely from the command line.
# Requires: JDK (javac/keytool), Android SDK build-tools 34 + platform android-34,
#           dist/android-jni/<abi>/libvdf.so (from scripts/crossbuild.sh)
set -eu

TC=/home/z/my-project/.toolchains
SDK=$TC/android-sdk
BT=$SDK/build-tools/35.0.0
AJAR=$SDK/platforms/android-34/android.jar
JAVAC=$TC/jdk/bin/javac
JAVA=$TC/jdk/bin/java
KEYTOOL=$TC/jdk/bin/keytool
SRC=/home/z/my-project/android
JNI=/home/z/my-project/dist/android-jni
OUT=/home/z/my-project/dist/android
BUILD=$OUT/apk-build

rm -rf "$BUILD"
mkdir -p "$BUILD"/{classes,dex,gen}

echo "── aapt2: compile resources + link (generates R.java)"
"$BT/aapt2" compile --dir "$SRC/app/res" -o "$BUILD/res.zip"
"$BT/aapt2" link \
  -o "$BUILD/base.apk" \
  --manifest "$SRC/app/AndroidManifest.xml" \
  -I "$AJAR" \
  --java "$BUILD/gen" \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code 1 --version-name 1.0.0 \
  --auto-add-overlay \
  "$BUILD/res.zip"

echo "── javac: compile app + library + generated R"
find "$SRC/app/java" "$SRC/library/java" "$BUILD/gen" -name '*.java' > "$BUILD/sources.txt"
"$JAVAC" --release 11 -nowarn \
  -classpath "$AJAR" \
  -d "$BUILD/classes" \
  @"$BUILD/sources.txt"

echo "── d8: dex"
"$TC/jdk/bin/jar" cf "$BUILD/classes-input.jar" -C "$BUILD/classes" .
"$BT/d8" --release --min-api 24 \
  --lib "$AJAR" \
  --output "$BUILD/dex" \
  "$BUILD/classes-input.jar"

echo "── assemble APK payload"
cp "$BUILD/base.apk" "$BUILD/unsigned.apk"
cd "$BUILD"
mkdir -p jni assets
for abi in arm64-v8a armeabi-v7a x86_64 x86; do
  mkdir -p "jni/$abi"
  cp "$JNI/$abi/libvdf.so" "jni/$abi/libvdf.so"
done
cp "$SRC/app/assets/"* assets/
zip -q -j unsigned.apk dex/classes.dex          # classes.dex at apk root
zip -q -r unsigned.apk jni assets               # native libs must be STORED? (align handles it)

echo "── zipalign + sign (debug key)"
"$BT/zipalign" -f 4 unsigned.apk aligned.apk
if [ ! -f "$OUT/debug.keystore" ]; then
  "$KEYTOOL" -genkeypair -keystore "$OUT/debug.keystore" -storepass vdfdebug \
    -keypass vdfdebug -alias vdf -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=VDF Viewer Debug,O=Vacter,C=US" >/dev/null 2>&1
fi
"$BT/apksigner" sign --ks "$OUT/debug.keystore" --ks-pass pass:vdfdebug \
  --key-pass pass:vdfdebug --out "$OUT/vdf-viewer.apk" aligned.apk
"$BT/apksigner" verify --print-certs "$OUT/vdf-viewer.apk" | head -3

ls -la "$OUT/vdf-viewer.apk"
echo "APK_OK: $OUT/vdf-viewer.apk"
