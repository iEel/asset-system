import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("asset QR scanner uses square mobile preview and QR-only formats", () => {
  const source = readFileSync("src/components/ui/scanner-text-input.tsx", "utf8")

  assert.match(source, /scanMode === "asset-qr"[\s\S]+aspect-square/)
  assert.match(source, /scanMode === "asset-qr"[\s\S]+aspectRatio: 1/)
  assert.match(source, /scanMode === "asset-qr"[\s\S]+return \[formats\.QR_CODE\]/)
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
