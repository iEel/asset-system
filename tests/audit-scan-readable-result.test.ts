import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the camera hands the decoded text to the workspace, which matches it against the round", () => {
  const camera = read("src/components/audit/audit-scan-camera.tsx")
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")

  assert.match(camera, /onScanSuccess: \(decodedText\) => onDecodedRef\.current\(decodedText\.trim\(\)\)/)
  assert.match(workspace, /<AuditScanCamera onDecoded=\{handleDecoded\}/)
  assert.match(workspace, /extractAssetLookupCandidatesFromScanValue\(text\)/)
})

test("audit QR scan uses the native-resolution decoder and locks after a read", () => {
  const camera = read("src/components/audit/audit-scan-camera.tsx")

  assert.match(camera, /startNativeAssetQrScanner/)
  assert.match(camera, /readerId: "audit-qr-reader"/)
  assert.match(camera, /stopAfterSuccess: true/)
  assert.match(camera, /AuditQrScannerOverlay/)
  for (const name of ["audit-scan-camera.tsx", "audit-scan-workspace.tsx", "audit-scan-search.tsx"]) {
    assert.doesNotMatch(read(`src/components/audit/${name}`), /new Html5Qrcode\("audit-qr-reader"\)/, name)
  }
})
