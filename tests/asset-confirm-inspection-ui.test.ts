import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// ยืนยันผลตรวจ plan 5 task 2: the asset detail page's notice for an asset stuck Under Inspection. With a round it links
// that round's confirm page (its tab and the way back); without one, the one-step dialog for a person with asset:edit.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"
const NOTICE = "src/components/assets/detail/asset-inspection-notice.tsx"
const DIALOG = "src/components/assets/asset-confirm-inspection-dialog.tsx"
const OVERVIEW = "src/components/assets/detail/asset-overview.tsx"

test("the page hides the Ready-only correction for Under Inspection and reads the asset's round (plan 5 task 2)", () => {
  const source = read(PAGE)
  assert.match(source, /const isUnderInspection = asset\.status\.name === INSPECTION_STATUS_NAME/)
  // Final review decision A: the old entry only as the escape hatch the status-correction route also allows.
  assert.match(source, /const statusCorrection =\s*canEditAsset && readyStatus && \(!isUnderInspection \|\| inspectionCorrectionEscape\) && canCorrectAssetStatus\(asset\.status\)/)
  assert.match(source, /canEditAsset \? inspectionCorrectionEscapeAllowed\(prisma, asset\.id\) : Promise\.resolve\(false\)/)
  assert.match(source, /findAssetInspectionRound\(prisma, asset\.id\)/)
  // Final review decision D: the round link only with audit:view; without it the round number as plain text.
  assert.match(source, /round: inspectionRound && canViewAudit\s*\?/)
  assert.match(source, /roundText: inspectionRound && !canViewAudit \? tInspection\("roundText", \{ auditNo: inspectionRound\.auditNo \}\) : null/)
  // Final review H: only the holder and location lists, not the whole asset form's options.
  assert.match(source, /getAssetCustodyOptions\(\)/)
  assert.doesNotMatch(source, /getAssetFormOptions/)
  assert.match(source, /loadOpenHandoverCounts\(prisma, \[asset\.id\]\)/)
  // The link: the round's confirm page on the asset's tab, with this page as the way back.
  assert.match(source, /appendOperationalReturnTo\(\s*`\/\$\{locale\}\/audit\/rounds\/\$\{inspectionRound\.roundId\}\/confirm\?tab=\$\{inspectionRound\.tab\}`,\s*currentAssetDetailHref,?\s*\)/)
  // The dialog only for asset:edit; without it the notice has no action.
  assert.match(source, /!inspectionRound && canEditAsset/)
  assert.match(source, /inspection=\{inspectionNotice\}/)
})

test("the overview places the notice first, where its notices sit (plan 5 task 2)", () => {
  const overview = read(OVERVIEW)
  assert.match(overview, /\{inspection \? <AssetInspectionNotice \{\.\.\.inspection\} \/> : null\}/)
  assert.ok(overview.indexOf("<AssetInspectionNotice") < overview.indexOf('data-slot="asset-data-gaps"'), "the notice sits above the data gaps")
  const notice = read(NOTICE)
  assert.doesNotMatch(notice, /^"use client"/, "the wrapper is server-safe")
  assert.match(notice, /<Notice\b[^>]*tone="warning"/)
  assert.match(notice, /<Link href=\{round\.href\}/)
  assert.match(notice, /<AssetConfirmInspectionDialog \{\.\.\.dialog\} \/>/)
  assert.match(notice, /\{roundText \?\? undefined\}/)
})

test("the dialog posts to the asset's confirm route, locks the holder and location under an open handover and checks In Use client-side (plan 5 task 2)", () => {
  assert.ok(existsSync(DIALOG))
  const source = read(DIALOG)
  assert.match(source, /^"use client"/)
  assert.match(source, /fetch\(`\/api\/assets\/\$\{assetId\}\/confirm-inspection`/)
  assert.match(source, /busy=\{busy\}/)
  assert.match(source, /<Button type="submit" busy=\{busy\}>/)
  // The locked fields point at the one handoverLocked line.
  assert.match(source, /id=\{HANDOVER_LOCKED_ID\}[^>]*>\s*\{labels\.handoverLocked\}/)
  assert.equal(source.match(/aria-describedby=\{HANDOVER_LOCKED_ID\}/g)?.length, 3, "status, holder and location")
  // With a clear handover the server writes the rule's target: the dialog sends In Use, the holder and the location as they are.
  assert.match(source, /handover === "clear"\s*\?\s*\{ statusName: "In Use", custodianId: currentCustodian\?\.id \?\? null, locationId: currentLocation\.id \}/)
  // An unclear handover: the reason, no submit.
  assert.match(source, /handover === "unclear" \? null : \(\s*<Button type="submit"/)
  assert.match(source, /\{labels\.handoverUnclear\}/)
  // Client-side: In Use needs a holder.
  assert.match(source, /statusName === "In Use" && !values\.custodianId\) errors\.custodianId = "inUseNeedsHolder"/)
  assert.match(source, /labels\.inUseNeedsHolder/)
  assert.match(source, /fieldErrors\.applyServer\(payload\) && focusFirstError\(\)/)
  assert.match(source, /router\.refresh\(\)/)
  assert.match(source, /toast\.success\(labels\.success\)/)
  assert.match(source, /<SearchableSelect\b/)
  assert.match(source, /<NativeSelect\b/)
  // Final review F: the form-level error is announced, and focus after a confirm goes to the page heading (the refresh
  // removes the notice and its trigger).
  assert.match(source, /<p role="alert" className="text-sm text-danger"><ApiErrorText error=\{error\} \/><\/p>/)
  assert.match(source, /heading\.tabIndex = -1\s*returnFocusRef\.current = heading/)
  assert.match(source, /returnFocusRef=\{returnFocusRef\}/)
})

test("the notice's messages, Thai and English (plan 5 task 2)", () => {
  const th = JSON.parse(read("messages/th.json")).assetInspectionNotice
  const en = JSON.parse(read("messages/en.json")).assetInspectionNotice
  assert.equal(th.title, "ครุภัณฑ์นี้ค้างสถานะอยู่ระหว่างตรวจสอบ")
  assert.equal(th.roundLink, "ยืนยันผลตรวจในรอบ {auditNo}")
  assert.equal(th.button, "ยืนยันผลตรวจ")
  assert.equal(th.dialogTitle, "ยืนยันผลตรวจ {assetTag}")
  assert.equal(th.handoverLocked, "มีใบส่งมอบหรือใบยืมเปิดอยู่ สถานะ ผู้ถือครอง และที่ตั้งเป็นไปตามใบนั้น")
  assert.equal(en.handoverLocked, "An open handover sets the status, holder and location")
  // The unclear handover's way out is this page's status correction (final review decision A).
  assert.equal(th.handoverUnclear, "ใบส่งมอบหรือใบยืมไม่ชัด ใช้แก้ไขสถานะของหน้านี้แทน")
  assert.equal(th.roundText, "รอยืนยันผลตรวจในรอบ {auditNo}")
  assert.equal(th.inUseNeedsHolder, "ใช้งานอยู่ต้องมีผู้ถือครอง")
  assert.equal(en.title, "This asset is still under inspection")
  assert.equal(en.roundLink, "Confirm in round {auditNo}")
  assert.equal(en.errorFallback, "Could not confirm. Try again.")
  assert.deepEqual(Object.keys(th).sort(), Object.keys(en).sort())
  assert.equal(Object.keys(th).length, 17)
})
