#!/bin/bash
# Build vdf-android.aar — the VDF library for Android apps.
# Contents: classes.jar (com.vacter.vdf.Vdf), jni/<abi>/libvdf.so, binary manifest.
set -eu

TC=/home/z/my-project/.toolchains
SDK=$TC/android-sdk
BT=$SDK/build-tools/34.0.0
AJAR=$SDK/platforms/android-34/android.jar
JAVAC=$TC/jdk/bin/javac
SRC=/home/z/my-project/android
JNI=/home/z/my-project/dist/android-jni
OUT=/home/z/my-project/dist/android
BUILD=$OUT/aar-build

rm -rf "$BUILD"
mkdir -p "$BUILD"/{classes,manifest}

echo "── compile binary AndroidManifest (library)"
"$BT/aapt2" link \
  -o "$BUILD/manifest/link.apk" \
  --manifest "$SRC/library/AndroidManifest.xml" \
  -I "$AJAR" \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code 1 --version-name 1.0.0
cd "$BUILD/manifest" && unzip -q -o link.apk AndroidManifest.xml

echo "── javac: library classes"
"$JAVAC" --release 11 -nowarn -classpath "$AJAR" \
  -d "$BUILD/classes" \
  $(find "$SRC/library/java" -name '*.java')

echo "── classes.jar"
"$TC/jdk/bin/jar" cf "$BUILD/classes.jar" -C "$BUILD/classes" .

echo "── assemble aar"
cd "$BUILD"
rm -f vdf-android.aar
zip -q -j vdf-android.aar manifest/AndroidManifest.xml
zip -q vdf-android.aar classes.jar
echo -n "" > R.txt
zip -q -j vdf-android.aar R.txt
for abi in arm64-v8a armeabi-v7a x86_64 x86; do
  mkdir -p "jni/$abi"
  cp "$JNI/$abi/libvdf.so" "jni/$abi/libvdf.so"
done
zip -q -r vdf-android.aar jni
# metadata AGP can use
cat > proguard.txt <<'EOF'
-keep class com.vacter.vdf.Vdf { *; }
EOF
zip -q -j vdf-android.aar proguard.txt

cp vdf-android.aar "$OUT/vdf-android.aar"
unzip -l "$OUT/vdf-android.aar"
echo "AAR_OK: $OUT/vdf-android.aar"
