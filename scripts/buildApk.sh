#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ADEV="/data/user/0/ai.antigem/files/usr/share/antigem-android/adev"

if [ ! -d "$ROOT_DIR/out" ]; then
  echo "Missing out/ directory. Run pnpm build first." >&2
  exit 1
fi

VERSION="$(node -p "require('$ROOT_DIR/package.json').version")"
APK_OUT="dist/Opal-v${VERSION}.apk"
export APK_OUT

mkdir -p "$ROOT_DIR/dist"

echo "Generating Opal launcher icons..."
python3 "$ROOT_DIR/scripts/generateAndroidIcons.py"

echo "Preparing Android assets from out/..."
rm -rf "$ROOT_DIR/android/build" "$ROOT_DIR/android/assets"
mkdir -p "$ROOT_DIR/android/build/gen" "$ROOT_DIR/android/build/classes" "$ROOT_DIR/android/build/dex" "$ROOT_DIR/android/assets"
cp -a "$ROOT_DIR/out" "$ROOT_DIR/android/assets/www"
rm -f "$ROOT_DIR/android/assets/www/sw.js"

BUILD_CMD=$(cat <<EOF
set -euo pipefail
APK_OUT="${APK_OUT}"
ANDROID_JAR="\$ANDROID_HOME/platforms/android-35/android.jar"
BT="\$ANDROID_HOME/build-tools/34.0.0"

AAPT2="\$BT/aapt2"
if "\$AAPT2" version >/dev/null 2>&1; then
  AAPT2_CMD=("\$AAPT2")
elif command -v qemu-x86_64-static >/dev/null 2>&1 && [ -d /usr/x86_64-linux-gnu ]; then
  AAPT2_CMD=(qemu-x86_64-static -L /usr/x86_64-linux-gnu "\$AAPT2")
else
  echo "No runnable aapt2 found in container." >&2
  exit 1
fi

"\${AAPT2_CMD[@]}" compile --dir android/res -o android/build/res.zip
"\${AAPT2_CMD[@]}" link \
  -I "\$ANDROID_JAR" \
  --manifest android/AndroidManifest.xml \
  --java android/build/gen \
  -A android/assets \
  -o android/build/unaligned.apk \
  android/build/res.zip

JAVA_FILES=\$(find android/src android/build/gen -name '*.java')
javac -source 8 -target 8 -Xlint:-options -encoding UTF-8 -bootclasspath "\$ANDROID_JAR" -d android/build/classes \$JAVA_FILES

CLASS_FILES=\$(find android/build/classes -name '*.class')
"\$BT/d8" --min-api 26 --lib "\$ANDROID_JAR" --output android/build/dex \$CLASS_FILES

python3 - <<'PY'
import glob, os, struct, zipfile

unaligned = "android/build/unaligned.apk"
aligned = "android/build/aligned.apk"

with zipfile.ZipFile(unaligned, "a", compression=zipfile.ZIP_DEFLATED) as zf:
    for dex in sorted(glob.glob("android/build/dex/classes*.dex")):
        zf.write(dex, os.path.basename(dex))

# 4-byte align all uncompressed (ZIP_STORED) entries per Android APK specification
with zipfile.ZipFile(unaligned, "r") as zin, zipfile.ZipFile(aligned, "w") as zout:
    for info in zin.infolist():
        data = zin.read(info.filename)
        new_info = zipfile.ZipInfo(info.filename, date_time=info.date_time)
        new_info.compress_type = info.compress_type
        new_info.external_attr = info.external_attr
        new_info.create_system = 3
        fn_len = len(info.filename.encode("utf-8"))
        offset = zout.fp.tell()
        if info.compress_type == zipfile.ZIP_STORED:
            align = 4096 if info.filename.endswith(".so") else 4
            rem = (offset + 30 + fn_len) % align
            pad = (align - rem) % align
            new_info.extra = b"\x00" * pad
        zout.writestr(new_info, data, compress_type=info.compress_type)

with zipfile.ZipFile(aligned, "r") as zchk, open(aligned, "rb") as raw:
    for info in zchk.infolist():
        if info.compress_type == zipfile.ZIP_STORED:
            raw.seek(info.header_offset)
            sig, _, _, _, _, _, _, _, _, fn_len, ex_len = struct.unpack("<IHHHHHIIIHH", raw.read(30))
            assert sig == 0x04034B50, f"Bad LFH for {info.filename}"
            data_offset = info.header_offset + 30 + fn_len + ex_len
            align = 4096 if info.filename.endswith(".so") else 4
            assert data_offset % align == 0, f"Misaligned {info.filename}: offset={data_offset}"
print("Verified 4-byte APK alignment on all uncompressed entries.")
PY

KEYSTORE="android/opal-release.keystore"
if [ ! -f "\$KEYSTORE" ]; then
  keytool -genkeypair -v \
    -keystore "\$KEYSTORE" \
    -storepass opalrelease \
    -alias opalrelease \
    -keypass opalrelease \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -dname "CN=Opal,O=OfflineStudy,C=JP" >/dev/null 2>&1
fi

"\$BT/apksigner" sign \
  --ks "\$KEYSTORE" \
  --ks-pass pass:opalrelease \
  --ks-key-alias opalrelease \
  --key-pass pass:opalrelease \
  --out "\$APK_OUT" \
  android/build/aligned.apk

"\$BT/apksigner" verify --verbose "\$APK_OUT"
ls -lh "\$APK_OUT"
EOF
)

cd "$ROOT_DIR"
bash "$ADEV" "$BUILD_CMD"
