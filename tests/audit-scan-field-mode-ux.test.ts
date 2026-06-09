import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("audit scan shows system data before the matched or mismatch decision", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(form, /systemDataRows/)
  assert.match(form, /buildSystemDataRows\(/)
  assert.match(form, /t\("systemDataTitle"\)/)
  assert.match(form, /t\("systemDataHelp"\)/)
  assert.match(form, /t\("expectedLocation"\)/)
  assert.match(form, /t\("expectedCustodian"\)/)
  assert.match(form, /t\("expectedDepartment"\)/)
  assert.match(form, /t\("expectedCondition"\)/)
})

test("audit scan fast mode uses clear data-matched and data-mismatch actions", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(form, /t\("auditDecisionTitle"\)/)
  assert.match(form, /t\("auditDecisionHelp"\)/)
  assert.match(form, /t\("dataMatches"\)/)
  assert.match(form, /t\("dataMismatch"\)/)
  assert.match(form, /setShowDetailedFields\(true\)/)
  assert.doesNotMatch(form, /t\("quickMatched"\)/)
  assert.doesNotMatch(form, /t\("openDetailedScan"\)/)
})

test("audit scan scan-code actions align with the scan input", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(form, /lg:grid-cols-\[minmax\(0,1fr\)_auto\]/)
  assert.match(form, /lg:w-\[15rem\] lg:pt-\[1\.625rem\]/)
  assert.match(form, /inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap/)
  assert.match(form, /focus-visible:ring-2 focus-visible:ring-primary/)
  assert.doesNotMatch(form, /md:flex-row md:items-end/)
})

test("audit scan requires photo evidence before saving mismatched data", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(form, /requiresMismatchPhoto/)
  assert.match(form, /queuedAuditPhotos\.length === 0/)
  assert.match(form, /toast\.error\(t\("auditPhotoRequiredForMismatch"\)\)/)
  assert.match(form, /t\("auditPhotoOptionalForMatch"\)/)
  assert.match(form, /t\("auditPhotoRequiredForMismatch"\)/)
})

test("audit scan photo evidence supports free-form multi-photo capture", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const dropzone = readFileSync("src/components/ui/file-dropzone.tsx", "utf8")

  assert.match(form, /generalAuditPhotoLabel = t\("generalAuditPhotoLabel"\)/)
  assert.match(form, /auditPhotoTagOptions/)
  assert.match(form, /onFilesChange=\{queueAuditPhotoFiles\}/)
  assert.match(form, /multiple/)
  assert.match(dropzone, /multiple\?: boolean/)
  assert.match(dropzone, /onFilesChange\?: \(files: File\[\]\) => void/)
  assert.match(dropzone, /Array\.from\(event\.target\.files/)
})

test("audit scan camera readiness renders a stable hydration fallback", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(form, /useState<CameraReadiness>\("checking"\)/)
  assert.doesNotMatch(form, /useState<CameraReadiness>\(\(\) =>\s*isCameraAccessSupported/)
  assert.match(form, /window\.setTimeout\(\(\) => \{\s*setCameraReadiness\(isCameraAccessSupported\(\) \? "ready" : "unavailable"\)/)
  assert.match(form, /window\.clearTimeout\(timer\)/)
})

test("audit scan field-mode UX copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.systemDataTitle, "string")
    assert.equal(typeof messages.auditScan.systemDataHelp, "string")
    assert.equal(typeof messages.auditScan.auditDecisionTitle, "string")
    assert.equal(typeof messages.auditScan.auditDecisionHelp, "string")
    assert.equal(typeof messages.auditScan.dataMatches, "string")
    assert.equal(typeof messages.auditScan.dataMismatch, "string")
    assert.equal(typeof messages.auditScan.actualDataTitle, "string")
    assert.equal(typeof messages.auditScan.auditPhotoOptionalForMatch, "string")
    assert.equal(typeof messages.auditScan.auditPhotoRequiredForMismatch, "string")
    assert.equal(typeof messages.auditScan.generalAuditPhotoLabel, "string")
    assert.equal(typeof messages.auditScan.auditPhotoTagHint, "string")
    assert.match(messages.auditScan.auditPhotoOptionalForMatch, /หลายรูป|multiple/)
    assert.match(messages.auditScan.auditPhotoRequiredForMismatch, /หลายรูป|multiple/)
    assert.match(messages.auditScan.dropAuditPhotoHint, /หลายรูป|multiple/)
  }
})

test("audit scan mobile layout uses compact progress and post-scan actions", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(form, /showMobileQuickActionBar/)
  assert.match(form, /AuditCompactMetric/)
  assert.match(form, /md:hidden/)
  assert.match(form, /fixed inset-x-0 bottom-0/)
  assert.match(form, /aria-label=\{t\("mobileActionBar"\)\}/)
  assert.match(form, /scrollToAuditScanInput/)
  assert.match(form, /id="audit-scan-input-panel"/)
  assert.match(form, /selectedItem \? \(showMobileQuickActionBar \? "hidden md:flex" : "flex"\) : "hidden md:flex"/)

  assert.equal(typeof th.auditScan.mobileActionBar, "string")
  assert.match(th.auditScan.continueOrManualAction, /สแกนต่อ|กรอกเอง/)
  assert.equal(typeof en.auditScan.mobileActionBar, "string")
  assert.match(en.auditScan.continueOrManualAction, /scan|manual/i)
})
