#!/usr/bin/env bash
# Bygger en USIGNERET development-client .ipa.
# Samme app som release, men henter JS live fra Metro paa din PC,
# saa kode kan aendres uden at bygge igen.
set -euo pipefail

CONFIG="Debug"
OUT="$PWD/build"

echo "==> Installerer JS-afhaengigheder"
npm ci

echo "==> Genererer native iOS-projekt"
npx expo prebuild --platform ios --clean

echo "==> CocoaPods"
cd ios
pod install --repo-update
cd ..

WS=$(ls -d ios/*.xcworkspace | head -1)
SCHEME=$(basename "$WS" .xcworkspace)
echo "==> workspace: $WS"
echo "==> scheme:    $SCHEME"

echo "==> Arkiverer uden signering"
# Rydder kun mit eget arkiv. build/app.ipa fra release-bygget skal blive.
mkdir -p "$OUT"
rm -rf "$OUT/dev.xcarchive"
xcodebuild archive \
  -workspace "$WS" \
  -scheme "$SCHEME" \
  -configuration "$CONFIG" \
  -destination 'generic/platform=iOS' \
  -archivePath "$OUT/dev.xcarchive" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  DEVELOPMENT_TEAM="" \
  ONLY_ACTIVE_ARCH=NO

echo "==> Pakker Payload til .ipa"
APP_PATH=$(ls -d "$OUT/dev.xcarchive/Products/Applications/"*.app | head -1)
if [ ! -d "$APP_PATH" ]; then
  echo "FEJL: fandt ingen .app i arkivet" >&2
  ls -R "$OUT/dev.xcarchive/Products" >&2 || true
  exit 1
fi

rm -rf "$OUT/Payload"
mkdir -p "$OUT/Payload"
cp -R "$APP_PATH" "$OUT/Payload/"
find "$OUT/Payload" -name _CodeSignature -type d -prune -exec rm -rf {} +

cd "$OUT"
rm -f dev.ipa
zip -qry dev.ipa Payload
rm -rf Payload
cd ..

echo "==> Faerdig"
ls -lh "$OUT/dev.ipa"
