import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("audit QR scan keeps raw QR value separate from readable scan input", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(form, /setLastDecodedText\(decodedText\)/)
  assert.match(form, /setScanText\(getReadableAuditScanValue\(matchedItem\)\)/)
  assert.match(form, /function getReadableAuditScanValue\(item: AuditScanItem\)/)
  assert.match(form, /return assetTag \|\| item\.label/)
})

test("audit QR scan uses native-resolution asset QR decoder and locks after a read", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(form, /startNativeAssetQrScanner/)
  assert.match(form, /readerId: "audit-qr-reader"/)
  assert.match(form, /stopAfterSuccess: true/)
  assert.doesNotMatch(form, /new Html5Qrcode\("audit-qr-reader"\)/)
  assert.match(form, /AuditQrScannerOverlay/)
})

test("audit scan readable result copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.equal(typeof th.auditScan.scanInputHelp, "string")
  assert.equal(typeof en.auditScan.scanInputHelp, "string")
  assert.match(th.auditScan.lastDecoded, /QR/)
  assert.match(en.auditScan.lastDecoded, /QR/)
})
