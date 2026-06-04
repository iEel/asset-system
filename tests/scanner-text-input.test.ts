import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("asset QR scanner uses an undistorted camera preview and QR-only formats", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")

  assert.match(source, /scanMode === "asset-qr"[\s\S]+aspect-\[4\/3\]/)
  assert.match(source, /scanMode === "asset-qr"[\s\S]+aspectRatio: 1\.333/)
  assert.match(source, /scanMode === "asset-qr"[\s\S]+return \[formats\.QR_CODE\]/)
})

test("asset QR scanner decodes the full viewfinder without CSS distortion", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")

  assert.match(source, /return \{ fps: 15, aspectRatio: 1\.333, videoConstraints: buildAssetQrVideoConstraints\(cameraSelection\) \}/)
  assert.doesNotMatch(source, /qrbox: getResponsiveSquareQrBox/)
  assert.match(source, /scanMode === "asset-qr"\s+\?\s+"w-full \[&_video\]:!h-auto \[&_video\]:!w-full"/)
  assert.doesNotMatch(source, /\[&_video\]:!object-fill/)
})

test("asset QR scanner requests focus-friendly camera constraints and tuning", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")

  assert.match(source, /function buildAssetQrVideoConstraints/)
  assert.match(source, /width: \{ ideal: 1280 \}/)
  assert.match(source, /height: \{ ideal: 960 \}/)
  assert.match(source, /focusMode: "continuous"/)
  assert.match(source, /exposureMode: "continuous"/)
  assert.match(source, /await tuneAssetQrCamera\(scanner, scanMode\)/)
  assert.match(source, /zoomFeature\(\)/)
})

test("asset QR scanner renders its own square overlay instead of the library rectangle", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")

  assert.match(source, /scanMode === "asset-qr" \? <QrScannerOverlay \/> : null/)
  assert.match(source, /function QrScannerOverlay\(\)/)
  assert.doesNotMatch(source, /\[&_#qr-shaded-region\]:!hidden/)
  assert.match(source, /aspect-square h-\[66%\] max-h-56/)
  assert.match(source, /boxShadow: "0 0 0 9999px rgba\(15, 23, 42, 0\.42\)"/)
})

test("asset QR help tells users to frame the QR code instead of the whole label", () => {
  const thMessages = readFileSync("messages/th.json", "utf8")
  const enMessages = readFileSync("messages/en.json", "utf8")

  assert.match(thMessages, /เล็งเฉพาะ QR Code/)
  assert.match(thMessages, /ไม่ต้องใส่ทั้ง Label/)
  assert.match(enMessages, /Center only the QR code/)
  assert.match(enMessages, /not the whole label/)
})

test("serial scanner keeps barcode-capable formats separate from asset QR mode", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")

  assert.match(source, /formats\.CODE_128/)
  assert.match(source, /formats\.DATA_MATRIX/)
  assert.match(source, /return \{ fps: 10, qrbox: getResponsiveQrBox, aspectRatio: 1\.333 \}/)
})

test("scanner can trigger a scan success callback after stopping the camera", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")

  assert.match(source, /onScanSuccess\?: \(value: string\) => void/)
  assert.match(source, /stopScanner\(\)\.finally\(\(\) => \{[\s\S]+onScanSuccess\?\.\(normalizedText\)/)
})
