#!/usr/bin/env bash
# Bygger en USIGNERET .ipa til SideStore.
# Kraever macOS med Xcode. Koer fra projektets rod.
set -euo pipefail

SCHEME="Dagligt"
CONFIG="Release"
OUT="$PWD/build"

echo "==> Installerer JS-afhaengigheder"
npm ci

echo "==> Genererer native iOS-projekt"
npx expo prebuild --platform ios --clean

echo "==> CocoaPods"
cd ios
pod install --repo-update
cd ..

echo "==> Arkiverer uden signering"
rm -rf "$OUT"
mkdir -p "$OUT"
xcodebuild archive \
  -workspace "ios/$SCHEME.xcworkspace" \
  -scheme "$SCHEME" \
  -configuration "$CONFIG" \
  -destination 'generic/platform=iOS' \
  -archivePath "$OUT/$SCHEME.xcarchive" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGN_ENTITLEMENTS="" \
  DEVELOPMENT_TEAM="" \
  ONLY_ACTIVE_ARCH=NO

echo "==> Pakker Payload til .ipa"
APP_PATH="$OUT/$SCHEME.xcarchive/Products/Applications/$SCHEME.app"
if [ ! -d "$APP_PATH" ]; then
  echo "FEJL: fandt ikke $APP_PATH" >&2
  ls -R "$OUT/$SCHEME.xcarchive/Products" >&2 || true
  exit 1
fi

rm -rf "$OUT/Payload"
mkdir -p "$OUT/Payload"
cp -R "$APP_PATH" "$OUT/Payload/"

# SideStore signerer selv. Rester af signering fra Xcode skal vaek.
rm -rf "$OUT/Payload/$SCHEME.app/_CodeSignature"

cd "$OUT"
rm -f "$SCHEME.ipa"
zip -qry "$SCHEME.ipa" Payload
rm -rf Payload
cd ..

echo "==> Faerdig: $OUT/$SCHEME.ipa"
ls -lh "$OUT/$SCHEME.ipa"
