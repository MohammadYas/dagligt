#!/usr/bin/env bash
# Bygger en USIGNERET .ipa til SideStore.
# Kraever macOS med Xcode. Koer fra projektets rod.
set -euo pipefail

CONFIG="Release"
OUT="$PWD/build"

echo "==> Installerer JS-afhaengigheder"
# npm ci er hurtigst og mest praecis, men laasefilen falder ud af sync
# hver gang en pakke installeres enkeltvis. Byg maa ikke falde paa det.
npm ci || npm install --no-audit --no-fund

echo "==> Genererer native iOS-projekt"
npx expo prebuild --platform ios --clean

echo "==> CocoaPods"
cd ios
pod install --repo-update
cd ..

# Appens navn kan aendre sig, saa scheme laeses fra det genererede projekt.
WS=$(ls -d ios/*.xcworkspace | head -1)
SCHEME=$(basename "$WS" .xcworkspace)
echo "==> workspace: $WS"
echo "==> scheme:    $SCHEME"

echo "==> Arkiverer uden signering"
rm -rf "$OUT"
mkdir -p "$OUT"
xcodebuild archive \
  -workspace "$WS" \
  -scheme "$SCHEME" \
  -configuration "$CONFIG" \
  -destination 'generic/platform=iOS' \
  -archivePath "$OUT/app.xcarchive" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  DEVELOPMENT_TEAM="" \
  ONLY_ACTIVE_ARCH=NO

echo "==> Pakker Payload til .ipa"
APP_PATH=$(ls -d "$OUT/app.xcarchive/Products/Applications/"*.app | head -1)
if [ ! -d "$APP_PATH" ]; then
  echo "FEJL: fandt ingen .app i arkivet" >&2
  ls -R "$OUT/app.xcarchive/Products" >&2 || true
  exit 1
fi
echo "==> app: $APP_PATH"

rm -rf "$OUT/Payload"
mkdir -p "$OUT/Payload"
cp -R "$APP_PATH" "$OUT/Payload/"

# SideStore signerer selv. Rester af signering fra Xcode skal vaek.
find "$OUT/Payload" -name _CodeSignature -type d -prune -exec rm -rf {} +

cd "$OUT"
rm -f app.ipa
zip -qry app.ipa Payload
rm -rf Payload
cd ..

echo "==> Faerdig"
ls -lh "$OUT/app.ipa"
