import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("audit scan separates found, out-of-scope, unknown, and found-later results", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(form, /status: "found" \| "mismatch" \| "out_of_scope" \| "unknown_asset" \| "saved" \| "found_later"/)
  assert.match(form, /status: "out_of_scope"/)
  assert.match(form, /status: "unknown_asset"/)
  assert.match(form, /payload\.resolvedNotFoundFinding \? "found_later"/)
  assert.doesNotMatch(form, /status: "not_in_round"/)
})

test("audit scan keeps Mark Not Found out of the scanned-asset primary actions", () => {
  const scanForm = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const pendingPage = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx", "utf8")

  assert.doesNotMatch(scanForm, /AuditMarkNotFoundButton/)
  assert.doesNotMatch(scanForm, /markNotFound/)
  assert.match(pendingPage, /AuditMarkNotFoundButton/)
})

test("audit scan primary actions use field-audit wording instead of not-found language", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(th.auditScan.dataMatches, /บันทึกพบตรง/)
  assert.match(th.auditScan.dataMismatch, /Finding|ข้อมูลไม่ตรง/)
  assert.match(th.auditScan.captureEvidenceAction, /ถ่ายรูปหลักฐาน/)
  assert.match(th.auditScan.manualScanAction, /กรอกเอง|ใช้รหัส/)
  assert.match(th.auditScan.feedbackUnknownAssetTitle, /ไม่พบ.*ระบบ/)
  assert.match(th.auditScan.feedbackOutOfScopeTitle, /นอก Scope/)

  assert.match(en.auditScan.dataMatches, /Save matched/)
  assert.match(en.auditScan.dataMismatch, /finding|mismatch/i)
  assert.match(en.auditScan.captureEvidenceAction, /evidence/i)
  assert.match(en.auditScan.manualScanAction, /manual|code/i)
  assert.match(en.auditScan.feedbackUnknownAssetTitle, /Unknown asset/)
  assert.match(en.auditScan.feedbackOutOfScopeTitle, /Out of scope/)
})
