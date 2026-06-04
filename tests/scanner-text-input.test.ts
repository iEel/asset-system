import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("asset QR scanner uses square mobile preview and QR-only formats", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")

  assert.match(source, /scanMode === "asset-qr"[\s\S]+aspect-square/)
  assert.match(source, /scanMode === "asset-qr"[\s\S]+aspectRatio: 1/)
  assert.match(source, /scanMode === "asset-qr"[\s\S]+return \[formats\.QR_CODE\]/)
})

test("asset QR scanner decodes the full square viewfinder without CSS cropping", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")

  assert.match(source, /if \(scanMode === "asset-qr"\) \{\s+return \{ fps: 15, aspectRatio: 1 \}\s+\}/)
  assert.doesNotMatch(source, /qrbox: getResponsiveSquareQrBox/)
  assert.match(source, /scanMode === "asset-qr"\s+\?\s+"h-full w-full \[&_video\]:!h-full \[&_video\]:!w-full \[&_video\]:!object-fill"/)
})

test("asset QR scanner renders its own square overlay instead of the library rectangle", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")

  assert.match(source, /scanMode === "asset-qr" \? <QrScannerOverlay \/> : null/)
  assert.match(source, /function QrScannerOverlay\(\)/)
  assert.doesNotMatch(source, /\[&_#qr-shaded-region\]:!hidden/)
  assert.match(source, /aspect-square w-\[56%\] max-w-56/)
  assert.match(source, /boxShadow: "0 0 0 9999px rgba\(15, 23, 42, 0\.42\)"/)
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
