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

test("audit scan uses a larger mobile QR camera target", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(form, /relative isolate aspect-square sm:aspect-\[4\/3\]/)
  assert.match(form, /id="audit-qr-reader"/)
  assert.match(form, /function AuditQrScannerOverlay/)
  assert.match(form, /aspect-square h-\[78%\] max-h-72 sm:max-h-80/)
  assert.doesNotMatch(form, /aspect-\[4\/3\] min-h-0/)
  assert.doesNotMatch(form, /aspect-square h-\[66%\] max-h-56/)
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


test("audit scan mobile action bar prioritizes matched save as the full-width primary action", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(form, /showMobileQuickActionBar/)
  assert.match(form, /grid max-w-6xl grid-cols-3/)
  assert.match(form, /const mobileMatchedActionClassName = "[^"]*col-span-3/)
  assert.match(form, /className=\{mobileMatchedActionClassName\}/)
  assert.match(form, /onClick=\{openMismatchDetails\}[\s\S]*className="[^"]*border-warning/)
  assert.match(form, /onClick=\{handleChangeAuditTarget\}/)
  assert.match(form, /t\("changeTargetAction"\)/)
  assert.doesNotMatch(form, /onClick=\{scrollToAuditPhotoEvidence\}/)
})
test("audit scan locks the scanned target and pauses the QR scanner before saving", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(form, /const scanTargetLocked = Boolean\(selectedItem \|\| outOfScopeAsset\)/)
  assert.match(form, /targetLockedBadge/)
  assert.match(form, /void stopScanner\(\)[\s\S]*void selectScannedAsset\(decodedText, "qr"\)/)
  assert.match(form, /stopAfterSuccess: true/)
  assert.doesNotMatch(form, /stopAfterSuccess: false/)
  assert.doesNotMatch(form, /source === "qr" && !continuousScan/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.targetLockedBadge, "string")
    assert.equal(typeof messages.auditScan.targetLockedHelp, "string")
  }
})

test("audit scan mobile resolver removes the evidence-scroll action", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  const barStart = form.indexOf("aria-label={t(\"mobileActionBar\")}")
  const barEnd = form.indexOf("</div>\n      ) : null}", barStart)
  assert.ok(barStart > -1, "mobile action bar should exist")
  assert.ok(barEnd > barStart, "mobile action bar block should be readable")
  const bar = form.slice(barStart, barEnd)

  assert.match(bar, /onClick=\{handleQuickMatchedScan\}/)
  assert.match(bar, /onClick=\{openMismatchDetails\}/)
  assert.match(bar, /onClick=\{handleChangeAuditTarget\}/)
  assert.match(bar, /t\("changeTargetAction"\)/)
  assert.doesNotMatch(bar, /scrollToAuditPhotoEvidence/)
  assert.doesNotMatch(bar, /captureEvidenceAction/)
  assert.doesNotMatch(form, /function scrollToAuditPhotoEvidence/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.changeTargetAction, "string")
  }
})

test("audit scan mismatch flow embeds required evidence instead of using a scroll shortcut", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(form, /const shouldShowAuditPhotoEvidence = Boolean\(outOfScopeAsset \|\| isDetailedScanVisible \|\| queuedAuditPhotos\.length > 0\)/)
  assert.match(form, /const evidenceRequirementSatisfied = !requiresMismatchPhoto \|\| queuedAuditPhotos\.length > 0/)
  assert.match(form, /t\("auditPhotoRequiredCounter", \{ count: queuedAuditPhotos\.length \}\)/)
  assert.match(form, /!evidenceRequirementSatisfied[\s\S]*border-warning\/40 bg-warning\/10/)
  assert.match(form, /disabled=\{saving \|\| !selectedItem \|\| \(fastMode && !showDetailedFields\) \|\| !evidenceRequirementSatisfied\}/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.auditPhotoRequiredCounter, "string")
    assert.equal(typeof messages.auditScan.auditPhotoRequirementMet, "string")
  }
})

test("audit scan compacts the sticky progress header after an asset is selected", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(form, /const compactProgressHeader = Boolean\(selectedItem \|\| outOfScopeAsset\)/)
  assert.match(form, /compactProgressHeader \? "mb-3/)
  assert.match(form, /compactProgressHeader \? \(/)
  assert.match(form, /processedCount\.toLocaleString\("th-TH"\)/)
  assert.match(form, /items\.length\.toLocaleString\("th-TH"\)/)
  assert.match(form, /pendingCount\.toLocaleString\("th-TH"\)/)
  assert.match(form, /queuedAuditPhotos\.length\.toLocaleString\("th-TH"\)/)
  assert.match(form, /!compactProgressHeader \? \(/)
})
test("audit scan phase 1 shows readable result semantics and recent scans", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(form, /type AuditRecentScan/)
  assert.match(form, /assetId\?: string/)
  assert.match(form, /assetTag\?: string/)
  assert.match(form, /MAX_RECENT_AUDIT_SCANS = 8/)
  assert.match(form, /function pushRecentScan\(/)
  assert.match(form, /setRecentScans\(\(current\) => \[/)
  assert.match(form, /ScanResultPanel feedback=\{scanFeedback\} t=\{t\}/)
  assert.match(form, /<RecentScansPanel[\s\S]*recentScans=\{recentScans\}[\s\S]*onEditScan=\{editRecentScan\}/)
  assert.match(form, /function ScanResultPanel/)
  assert.match(form, /function RecentScansPanel/)
  assert.match(form, /function editRecentScan\(/)
  assert.match(form, /function formatLastAuditResult\(/)
  assert.match(form, /function getScanFeedbackMeta/)
  assert.match(form, /t\("recentScansEdit"\)/)
  assert.match(form, /t\("lastResultWithAsset"/)
  assert.match(form, /t\("feedbackStatusFound"\)/)
  assert.match(form, /t\("recentScansTitle"\)/)
  assert.match(form, /t\("recentScansHelp"\)/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.recentScansTitle, "string")
    assert.equal(typeof messages.auditScan.recentScansHelp, "string")
    assert.equal(typeof messages.auditScan.recentScansEdit, "string")
    assert.equal(typeof messages.auditScan.lastResultWithAsset, "string")
    assert.equal(typeof messages.auditScan.feedbackStatusFound, "string")
    assert.equal(typeof messages.auditScan.feedbackStatusSaved, "string")
    assert.equal(typeof messages.auditScan.feedbackStatusMismatch, "string")
    assert.equal(typeof messages.auditScan.feedbackStatusOutOfScope, "string")
    assert.equal(typeof messages.auditScan.feedbackStatusUnknownAsset, "string")
    assert.equal(typeof messages.auditScan.feedbackStatusFoundLater, "string")
    assert.equal(typeof messages.auditScan.feedbackStatusOfflineQueued, "string")
  }
})
test("audit scan recent scans are seeded from persisted scan history", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx", "utf8")
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(page, /AUDIT_SCAN_HISTORY_LIMIT = 8/)
  assert.match(page, /prisma\.auditScanHistory\.findMany/)
  assert.match(page, /orderBy: \{ scannedAt: "desc" \}/)
  assert.match(page, /take: AUDIT_SCAN_HISTORY_LIMIT/)
  assert.match(page, /auditItem: \{ select: \{ auditResult: true \} \}/)
  assert.match(page, /asset: \{ select: \{ id: true, assetTag: true, name: true \} \}/)
  assert.match(page, /buildInitialRecentScanRows\(scanHistory\)/)
  assert.match(page, /initialRecentScans=\{initialRecentScans\}/)

  assert.match(form, /initialRecentScans = \[\]/)
  assert.match(form, /const \[recentScans, setRecentScans\] = useState<AuditRecentScan\[\]>\(\(\) => initialRecentScans\.slice\(0, MAX_RECENT_AUDIT_SCANS\)\)/)
})

test("audit scan keeps rear-camera fast defaults and locks QR results without exposing mode switches", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(form, /stopAfterSuccess: true/)
  assert.match(form, /void stopScanner\(\)[\s\S]*void selectScannedAsset\(decodedText, "qr"\)/)
  assert.match(form, /const fastMode = true/)
  assert.match(form, /resolvePreferredCameraSelection\(availableCameras, requestedCameraId\)/)
  assert.match(form, /getFallbackCameraAfterEnvironmentFailure\(cameraSelection, availableCameras\)/)
  assert.doesNotMatch(form, /function AuditScanOptionStrip/)
  assert.doesNotMatch(form, /function ScanOptionToggle/)
  assert.doesNotMatch(form, /setContinuousScan/)
  assert.doesNotMatch(form, /setFastMode/)
  assert.doesNotMatch(form, /role="switch"/)
  assert.doesNotMatch(form, /aria-checked=\{checked\}/)
  assert.doesNotMatch(form, /aria-label=\{t\("scanOptions"\)\}/)
  assert.doesNotMatch(form, /t\("fastMode"\)/)
  assert.doesNotMatch(form, /t\("continuousScan"\)/)
  assert.doesNotMatch(form, /t\("cameraDevice"\)/)
  assert.doesNotMatch(form, /t\("cameraRear"\)/)
  assert.doesNotMatch(form, /selectedCameraId/)
  assert.doesNotMatch(form, /handleCameraChange/)
  assert.match(form, /ScanResultPanel feedback=\{scanFeedback\} t=\{t\}/)
  assert.match(form, /<RecentScansPanel[\s\S]*recentScans=\{recentScans\}[\s\S]*onEditScan=\{editRecentScan\}/)
  assert.doesNotMatch(form, /<ScanFeedbackCard feedback=\{scanFeedback\}/)
  assert.match(form, /id="audit-recent-scans-list"[\s\S]*recentScans\.map/)
  assert.doesNotMatch(form, /<RecentScanList recentScans=\{recentScans\}/)
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
  assert.match(form, /scanReturnHref/)
  assert.match(form, /appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{roundId\}\/scan`, backHref\)/)
  assert.match(form, /pendingListHref/)
  assert.match(form, /appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{roundId\}\/pending`, scanReturnHref\)/)
  assert.match(form, /pendingHref=\{pendingListHref\}/)

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

test("audit scan pending queue and recent scans are collapsible", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(form, /pendingQueueExpanded/)
  assert.match(form, /setPendingQueueExpanded/)
  assert.match(form, /aria-controls="audit-pending-queue-panel"/)
  assert.match(form, /aria-expanded=\{showPendingQueue\}/)
  assert.match(form, /expanded=\{pendingQueueExpanded\}/)
  assert.match(form, /recentScansExpanded/)
  assert.match(form, /setRecentScansExpanded/)
  assert.match(form, /aria-expanded=\{recentScansExpanded\}/)
  assert.match(form, /t\(recentScansExpanded \? "recentScansCollapse" : "recentScansExpand"\)/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.pendingQueueExpand, "string")
    assert.equal(typeof messages.auditScan.pendingQueueCollapse, "string")
    assert.equal(typeof messages.auditScan.recentScansExpand, "string")
    assert.equal(typeof messages.auditScan.recentScansCollapse, "string")
  }
})
test("audit scan recent scans collapse hides every scan row", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const panelStart = form.indexOf("function RecentScansPanel")
  const rowStart = form.indexOf("function RecentScanCompactRow")
  assert.ok(panelStart > -1, "RecentScansPanel should exist")
  assert.ok(rowStart > panelStart, "RecentScanCompactRow should follow RecentScansPanel")
  const panel = form.slice(panelStart, rowStart)

  assert.doesNotMatch(panel, /const visibleScans = recentScans\.slice\(0, 3\)/)
  assert.doesNotMatch(panel, /const olderScans = recentScans\.slice\(3\)/)
  assert.match(panel, /id="audit-recent-scans-list"[\s\S]*hidden=\{!recentScansExpanded\}[\s\S]*recentScans\.map/)
  assert.match(panel, /t\(recentScansExpanded \? "recentScansCollapse" : "recentScansExpand"\)/)
})

test("audit scan mobile-first field workflow compacts scan setup and moves list work into searchable panels", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(form, /const \[assetPickerExpanded, setAssetPickerExpanded\]/)
  assert.match(form, /const \[assetPickerQuery, setAssetPickerQuery\]/)
  assert.match(form, /const filteredAssetPickerItems = useMemo/)
  assert.match(form, /function AssetFallbackPicker/)
  assert.match(form, /items=\{filteredAssetPickerItems\}/)
  assert.match(form, /onSelect=\{selectAssetFromFallback\}/)
  assert.doesNotMatch(form, /<Select label=\{t\("asset"\)\}/)

  assert.match(form, /function buildPendingQueueContext/)
  assert.match(form, /contextRows=\{buildPendingQueueContext/)
  assert.match(form, /pendingQueueLocation/)
  assert.match(form, /pendingQueueCustodian/)
  assert.match(form, /pendingQueueDepartment/)

  assert.match(form, /function RecentScansPanel/)
  assert.match(form, /<RecentScansPanel[\s\S]*recentScans=\{recentScans\}[\s\S]*onEditScan=\{editRecentScan\}/)
  assert.doesNotMatch(form, /ScanResultPanel feedback=\{scanFeedback\} recentScans=\{recentScans\}/)

  assert.match(form, /scanEntryPanelClass/)
  assert.match(form, /grid grid-cols-2 gap-2 lg:w-\[15rem\]/)
  assert.match(form, /min-h-10/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.assetPickerTitle, "string")
    assert.equal(typeof messages.auditScan.assetPickerHelp, "string")
    assert.equal(typeof messages.auditScan.assetPickerSearch, "string")
    assert.equal(typeof messages.auditScan.assetPickerExpand, "string")
    assert.equal(typeof messages.auditScan.assetPickerCollapse, "string")
    assert.equal(typeof messages.auditScan.assetPickerEmpty, "string")
    assert.equal(typeof messages.auditScan.pendingQueueLocation, "string")
    assert.equal(typeof messages.auditScan.pendingQueueCustodian, "string")
    assert.equal(typeof messages.auditScan.pendingQueueDepartment, "string")
  }
})

test("audit scan initial mobile state prioritizes scanning before fallback and notes", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(form, /const showFallbackPicker = assetPickerExpanded/)
  assert.match(form, /showFallbackPicker \? \(\s*<AssetFallbackPicker/)
  assert.match(form, /const shouldShowRemarkField = Boolean\(selectedItem \|\| outOfScopeAsset\)/)
  assert.match(form, /shouldShowRemarkField && \(/)
  assert.match(form, /border-primary bg-primary text-white/)
  assert.match(form, /assetPickerExpanded \? setAssetPickerExpanded\(false\) : setAssetPickerExpanded\(true\)/)
  assert.doesNotMatch(form, /<AssetFallbackPicker[\s\S]*?\/>\s*\n\s*\{selectedItem && \(/)
})

test("audit scan manual entry supports partial suggestions without changing QR exact lookup", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(form, /const manualScanSuggestions = useMemo/)
  assert.match(form, /scanSource !== "manual"/)
  assert.match(form, /query\.length < 2/)
  assert.match(form, /exactScanMatchCandidates\.some\(\(candidate\) => assetLookup\.has\(candidate\)\)/)
  assert.match(form, /function buildManualScanSuggestions/)
  assert.match(form, /function ManualScanSuggestionList/)
  assert.match(form, /function handleManualScanAction/)
  assert.match(form, /manualScanSuggestions\.length === 1/)
  assert.match(form, /manualScanSuggestions\.length > 1/)
  assert.match(form, /onSelect=\{selectManualScanSuggestion\}/)
  assert.match(form, /setScanSource\("manual"\)/)
  assert.match(form, /selectScannedAsset\(decodedText, "qr"\)/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.manualSuggestionTitle, "string")
    assert.equal(typeof messages.auditScan.manualSuggestionHelp, "string")
    assert.equal(typeof messages.auditScan.manualSuggestionSelect, "string")
    assert.equal(typeof messages.auditScan.manualSuggestionPickOne, "string")
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

test("audit scan exposes 1x, 2x and 3x zoom controls in the existing camera panel", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(form, /zoomAvailable/)
  assert.match(form, /zoomLevels/)
  assert.match(form, /zoomLevel/)
  assert.match(form, /function resetZoomState/)
  assert.match(form, /setZoomLevels\(\[\]\)/)
  assert.match(form, /function syncZoomState\(scanner: NativeAssetQrScannerRuntime \| null\)/)
  assert.match(form, /setZoomLevels\(available && zoom \? zoom\.getSupportedLevels\(\) : \[\]\)/)
  assert.match(form, /async function setScannerZoom\(level: number\)/)
  assert.match(form, /qrReaderRef\.current\?\.zoom/)
  assert.match(form, /zoomLevels\.map\(\(level\) =>/)
  assert.doesNotMatch(form, /\[2, 3\]\.map\(\(level\) =>/)
  assert.match(form, /aria-label=\{t\("zoomCamera", \{ level \}\)\}/)
  assert.match(form, /t\("zoomUnsupported"\)/)
  assert.doesNotMatch(form, /function AuditScanOptionStrip/)
  assert.doesNotMatch(form, /role="switch"/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.zoomCamera, "string")
    assert.equal(typeof messages.auditScan.zoomUnsupported, "string")
  }
})

test("audit scan edit result reloads saved actual values and records correction context", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx", "utf8")
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")
  const route = readFileSync("src/app/api/audit-rounds/[id]/scan/route.ts", "utf8")
  const validation = readFileSync("src/lib/validations/audit.ts", "utf8")
  const offlineQueue = readFileSync("src/lib/audit-offline-queue.ts", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(page, /actualDepartmentId: item\.actualDepartmentId/)
  assert.match(page, /actualLocationId: item\.actualLocationId/)
  assert.match(page, /actualCustodianId: item\.actualCustodianId/)
  assert.match(page, /actualConditionId: item\.actualConditionId/)

  assert.match(form, /actualDepartmentId: string \| null/)
  assert.match(form, /actualLocationId: string \| null/)
  assert.match(form, /editingScanResult/)
  assert.match(form, /getEditableAuditValues/)
  assert.match(form, /selectInRoundAuditItem\(targetItem, \{ mode: "edit" \}\)/)
  assert.match(form, /resultCorrection: Boolean\(editingScanResult\)/)
  assert.match(form, /t\("editSavedResultTitle"\)/)
  assert.match(form, /t\("editSavedResultHelp"/)
  assert.match(form, /t\("editSavedResultCancel"\)/)

  assert.match(validation, /resultCorrection: z\.boolean\(\)\.default\(false\)/)
  assert.match(route, /input\.resultCorrection \? "scan_result_corrected" : "scan"/)
  assert.match(route, /resultCorrection: input\.resultCorrection/)
  assert.match(offlineQueue, /resultCorrection: boolean/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.editSavedResultTitle, "string")
    assert.equal(typeof messages.auditScan.editSavedResultHelp, "string")
    assert.equal(typeof messages.auditScan.editSavedResultCancel, "string")
  }
})

test("audit scan page supports deep linking into saved-result edit mode", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx", "utf8")
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.match(page, /assetId\?: string \| string\[\]/)
  assert.match(page, /mode\?: string \| string\[\]/)
  assert.match(page, /resolveAuditScanInitialMode/)
  assert.match(page, /initialAssetId=\{resolveFirstSearchParam\(rawSearchParams\.assetId\)\}/)
  assert.match(page, /initialMode=\{resolveAuditScanInitialMode\(rawSearchParams\.mode\)\}/)

  assert.match(form, /initialAssetId/)
  assert.match(form, /initialMode = "scan"/)
  assert.match(form, /const initialSelectedItem = initialAssetId/)
  assert.match(form, /createInitialAuditScanValues/)
  assert.match(form, /const initialEditItem = initialMode === "edit" \? initialSelectedItem : null/)
  assert.match(form, /useState\(\(\) => initialSelectedItem \? getReadableAuditScanValue\(initialSelectedItem\) : ""\)/)
  assert.match(form, /useState\(\(\) => Boolean\(initialEditItem\)\)/)
  assert.match(form, /useState<\{ assetId: string; label: string; auditResult: string \| null \} \| null>\(\(\) =>/)
})
