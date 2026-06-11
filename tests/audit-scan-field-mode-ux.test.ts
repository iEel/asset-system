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

test("audit scan hides normal camera status and only surfaces camera issues", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.doesNotMatch(form, /t\("cameraStatus"\)/)
  assert.doesNotMatch(form, /t\("cameraReady"\)/)
  assert.doesNotMatch(form, /t\("cameraRunning"\)/)
  assert.match(form, /shouldShowCameraPanel/)
  assert.match(form, /shouldShowCameraUtilities/)
  assert.match(form, /cameraErrorText \|\| cameraReadiness === "unavailable"/)
  assert.match(form, /t\("cameraHelp"\)/)
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

test("audit scan layout keeps progress metrics in one place", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(form, /showMobileQuickActionBar/)
  assert.doesNotMatch(form, /AuditCompactMetric/)
  assert.doesNotMatch(form, /AuditMetric label=\{t\("pendingQueue"\)\}/)
  assert.doesNotMatch(form, /AuditMetric label=\{t\("scannedQueue"\)\}/)
  assert.match(form, /t\("photoQueue"\)/)
  assert.match(form, /rounded-full border border-border bg-background px-2 py-1/)
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

test("audit scan phase 1 shows readable result semantics and recent scans", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(form, /type AuditRecentScan/)
  assert.match(form, /MAX_RECENT_AUDIT_SCANS = 8/)
  assert.match(form, /function pushRecentScan\(/)
  assert.match(form, /setRecentScans\(\(current\) => \[/)
  assert.match(form, /ScanResultPanel feedback=\{scanFeedback\} recentScans=\{recentScans\}/)
  assert.match(form, /function ScanResultPanel/)
  assert.match(form, /function getScanFeedbackMeta/)
  assert.match(form, /t\("feedbackStatusFound"\)/)
  assert.match(form, /t\("recentScansTitle"\)/)
  assert.match(form, /t\("recentScansHelp"\)/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.recentScansTitle, "string")
    assert.equal(typeof messages.auditScan.recentScansHelp, "string")
    assert.equal(typeof messages.auditScan.feedbackStatusFound, "string")
    assert.equal(typeof messages.auditScan.feedbackStatusSaved, "string")
    assert.equal(typeof messages.auditScan.feedbackStatusMismatch, "string")
    assert.equal(typeof messages.auditScan.feedbackStatusOutOfScope, "string")
    assert.equal(typeof messages.auditScan.feedbackStatusUnknownAsset, "string")
    assert.equal(typeof messages.auditScan.feedbackStatusFoundLater, "string")
    assert.equal(typeof messages.auditScan.feedbackStatusOfflineQueued, "string")
  }
})

test("audit scan phase 1 compacts fast mode and combines result with recent scans", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(form, /function FastModeToggle/)
  assert.match(form, /fastModeCompactHelp/)
  assert.match(form, /detailModeCompactHelp/)
  assert.match(form, /ScanResultPanel feedback=\{scanFeedback\} recentScans=\{recentScans\}/)
  assert.match(form, /const previousScans = recentScans\.slice\(1, 6\)/)
  assert.doesNotMatch(form, /<ScanFeedbackCard feedback=\{scanFeedback\}/)
  assert.doesNotMatch(form, /<RecentScanList recentScans=\{recentScans\}/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.fastModeCompactHelp, "string")
    assert.equal(typeof messages.auditScan.detailModeCompactHelp, "string")
    assert.equal(typeof messages.auditScan.fastModeOn, "string")
    assert.equal(typeof messages.auditScan.detailModeOn, "string")
  }
})

test("audit scan phase 2 emphasizes scan entry and exposes pending queue access", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(form, /const pendingItems = useMemo/)
  assert.match(form, /pendingItems\.slice\(0, 8\)/)
  assert.match(form, /function PendingQueuePanel/)
  assert.match(form, /pendingQueueQuickAction/)
  assert.match(form, /scanEntryTitle/)
  assert.match(form, /scanEntryHelp/)
  assert.match(form, /!selectedItem && !scanFeedback/)
  assert.match(form, /border-primary\/30 bg-primary\/5/)
  assert.match(form, /selectPendingQueueItem/)
  assert.match(form, /pendingHref=\{`\/\$\{locale\}\/audit\/rounds\/\$\{roundId\}\/pending`\}/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.scanEntryTitle, "string")
    assert.equal(typeof messages.auditScan.scanEntryHelp, "string")
    assert.equal(typeof messages.auditScan.pendingQueueQuickAction, "string")
    assert.equal(typeof messages.auditScan.pendingQueuePanelTitle, "string")
    assert.equal(typeof messages.auditScan.pendingQueuePanelHelp, "string")
    assert.equal(typeof messages.auditScan.pendingQueueOpenFull, "string")
    assert.equal(typeof messages.auditScan.pendingQueueSelect, "string")
  }
})

test("audit scan flashlight is a progressive camera enhancement", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const scanner = readFileSync("src/lib/asset-qr-scanner.ts", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(scanner, /type NativeCodeTorchController/)
  assert.match(scanner, /torch\?: NativeCodeTorchController/)
  assert.match(scanner, /function createNativeCodeTorchController/)
  assert.match(scanner, /capabilities\.torch/)
  assert.match(scanner, /applyConstraints\(\{ advanced: \[\{ torch: enabled \}/)
  assert.match(scanner, /torchController\?\.setEnabled\(false\)/)

  assert.match(form, /Flashlight/)
  assert.match(form, /FlashlightOff/)
  assert.match(form, /torchAvailable/)
  assert.match(form, /torchEnabled/)
  assert.match(form, /function resetTorchState/)
  assert.match(form, /async function toggleTorch/)
  assert.match(form, /aria-pressed=\{torchEnabled\}/)
  assert.match(form, /t\(torchEnabled \? "torchOff" : "torchOn"\)/)
  assert.match(form, /t\("torchUnsupported"\)/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.torchOn, "string")
    assert.equal(typeof messages.auditScan.torchOff, "string")
    assert.equal(typeof messages.auditScan.torchUnsupported, "string")
  }
})
