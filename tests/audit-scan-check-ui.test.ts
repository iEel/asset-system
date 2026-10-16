import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const form = () => read("src/components/audit/audit-scan-check-form.tsx")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditScan

test("the sheet starts from the shared defaults and counts mismatches with the server rules", () => {
  const source = form()
  assert.match(source, /buildCheckDefaults\(\{ mode: target\.openedMode, item: target\.item, room \}\)/)
  assert.match(source, /buildCheckDefaults\(\{ mode: "out_of_scope", master: lookupMasterValues\(target\.asset\), room \}\)/)
  assert.match(source, /const diff = diffCheckValues\(values, expected, ownershipType\)/)
  assert.match(source, /requiresCheckPhoto\(mode, diff\)/)
})

test("one save button names the result, and a missing photo blocks it with a reason", () => {
  const source = form()
  for (const key of ["saveAllMatch", "saveMismatch", "saveEditAllMatch", "saveEditMismatch", "saveOutOfScope"]) {
    assert.match(source, new RegExp(`t\\("${key}"`), key)
  }
  assert.match(source, /busy=\{saving\}/)
  assert.match(source, /disabled=\{disabled \|\| missingPhoto\}/)
  assert.doesNotMatch(source, /disabled=\{saving \|\| disabled \|\| missingPhoto\}/)
  assert.match(source, /variant=\{diff\.length === 0 \? "default" : "warning"\}/)
  assert.doesNotMatch(source, /dataMatches|dataMismatch|quickMatched/)
})

test("an item someone else checked while the sheet was open says so before saving", () => {
  const source = form()
  assert.match(source, /target\.openedMode === "scan" && liveItem && isAuditItemChecked\(liveItem\)/)
  assert.match(source, /t\("sheetStatusJustChecked", \{ name: liveItem\.scannedByName \?\? "-" \}\)/)
})

test("choosing a custodian fills that person's department unless the department was changed by hand", () => {
  const source = form()
  assert.match(source, /departmentTouched \? null : suggestDepartmentForCustodian\(options\.employees, next\)/)
  assert.match(source, /setDepartmentTouched\(true\)/)
})

test("the immediate-correction box only appears for approvers with a location or custodian mismatch, under the save button", () => {
  const source = form()
  assert.match(source, /canApplyCorrections && mode !== "out_of_scope" && diff\.some\(\(field\) => field === "location" \|\| field === "custodian"\)/)
  assert.ok(source.indexOf("{saveLabel}") < source.indexOf('t("applyAuditCorrections")'), "checkbox sits under the save button (spec 3.5)")
})

test("the save and not-this-item buttons sit in a pinned action bar below the scrolling fields (D1)", () => {
  const source = form()
  assert.match(source, /<div data-audit-check-form className="flex min-h-0 flex-1 flex-col">/)
  assert.match(source, /<div ref=\{bodyRef\} data-audit-check-body className="min-h-0 flex-1 scroll-py-3 space-y-3 overflow-y-auto px-4 py-3">/)
  assert.match(source, /<div data-audit-check-actions className="shrink-0 space-y-2 border-t border-border px-4 py-3">/)
  const body = source.indexOf("data-audit-check-body")
  const actions = source.indexOf("data-audit-check-actions")
  for (const marker of ["<AuditScanCheckField", "<AuditComponentPanel", 't("addNotePhoto")']) {
    const at = source.indexOf(marker)
    assert.ok(body < at && at < actions, `${marker} scrolls with the fields`)
  }
  for (const marker of ["{missingPhoto ? (", "{saveLabel}", 't("notThisOne")', 't("applyAuditCorrections")']) {
    assert.ok(source.indexOf(marker) > actions, `${marker} is pinned with the buttons`)
  }
  assert.ok(source.indexOf("{saveLabel}") < source.indexOf('t("notThisOne")'), "save stays first in the Tab order")
  assert.match(source, /<div className="flex items-stretch gap-2">/)
  assert.match(source, /className="min-h-12 min-w-0 flex-1 whitespace-normal py-2 text-base md:h-auto md:min-h-10"/)
})

test("the panel hands its height to the form: the sheet body and the wide aside no longer scroll as one block (D1)", () => {
  const source = read("src/components/audit/audit-scan-check-panel.tsx")
  assert.doesNotMatch(source, /overflow-y-auto p-4">\{children\}/)
  assert.match(source, /<\/SheetHeader>\n\s+\{children\}\n\s+<\/SheetContent>/)
  assert.match(source, /className="sticky top-4 flex max-h-\[calc\(100dvh-7rem\)\] flex-col self-start rounded-lg border border-border bg-surface"/)
  assert.match(source, /<div className="shrink-0 border-b border-border px-4 py-3">/)
})

test("a matching field has no box; only a mismatch keeps the warning box and the system value (D1)", () => {
  const source = read("src/components/audit/audit-scan-check-field.tsx")
  assert.match(source, /className=\{mismatch \? "rounded-md border border-warning-border bg-warning-soft p-2\.5" : undefined\}/)
  assert.doesNotMatch(source, /border-border bg-surface/)
})

test("a field shows the system value when it differs and the latest register value when it moved", () => {
  const source = read("src/components/audit/audit-scan-check-field.tsx")
  assert.match(source, /<SearchableSelect/)
  assert.match(source, /t\("inSystem", \{ value: labelFor\(expectedValue\) \}\)/)
  assert.match(source, /t\("latestValue", \{ value: labelFor\(latestValue\) \}\)/)
  assert.match(source, /border-warning-border bg-warning-soft/)
})

test("the panel is a bottom sheet on phones that returns focus, and an inline aside on wide screens", () => {
  const source = read("src/components/audit/audit-scan-check-panel.tsx")
  assert.match(source, /<SheetContent\s+side="bottom"/)
  assert.match(source, /onCloseAutoFocus=\{\(event\) => \{[\s\S]*?returnFocusRef\.current/)
  assert.match(source, /<aside/)
  assert.match(source, /if \(isWide\)/)
})

test("the save button names mismatched fields with the same words as the field labels", () => {
  const source = form()
  assert.match(source, /const fields = diff\.map\(\(field\) => t\(fieldLabelKey\[field\]\)\)\.join\(", "\)/)
  assert.doesNotMatch(source, /mismatchShortKey/)
  assert.doesNotMatch(source, /wrongLocation/)
})

test("the phone sheet falls back to a list target when its return target is gone", () => {
  const source = read("src/components/audit/audit-scan-check-panel.tsx")
  assert.match(source, /onReturnFocusMissing\?: \(\) => void/)
  assert.match(source, /if \(target\?\.isConnected\) target\.focus\(\)\s*\n\s*else onReturnFocusMissing\?\.\(\)/)
})

test("the wide panel moves focus to its heading when an item opens", () => {
  const source = read("src/components/audit/audit-scan-check-panel.tsx")
  assert.match(source, /<h2 ref=\{headingRef\} tabIndex=\{-1\}/)
  assert.match(source, /useEffect\(\(\) => \{\s*\n\s*if \(isWide && open\) headingRef\.current\?\.focus\(\)\s*\n\s*\}, \[isWide, open, title\]\)/)
})

test("components keep their three actions and the missing dialog keeps its shared dialog and dropzone", () => {
  assert.match(form(), /<AuditComponentPanel/)
  const dialog = read("src/components/audit/audit-scan-component-missing-dialog.tsx")
  assert.match(dialog, /<AccessibleDialog/)
  assert.match(dialog, /<FileDropzone/)
  assert.doesNotMatch(dialog, /window\.prompt|fixed inset-0/)
})

test("check sheet copy exists in Thai and English", () => {
  const keys = ["sheetStatusPending", "sheetStatusEdit", "sheetStatusNotFound", "sheetStatusOutOfScope", "sheetStatusJustChecked", "inSystem", "latestValue", "noOptionMatch", "clearValue", "addNotePhoto", "photoType", "photoRequiredCondition", "componentsSection", "saveAllMatch", "saveMismatch", "saveEditAllMatch", "saveEditMismatch", "saveOutOfScope", "notThisOne", "checkPanelEmpty"]
  for (const locale of ["th", "en"] as const) {
    assert.deepEqual(keys.filter((key) => typeof messages(locale)[key] !== "string"), [], locale)
  }
  assert.equal(messages("th").saveMismatch, "บันทึก · ไม่ตรง {count} ข้อ ({fields})")
})

test("the phone check sheet takes its X name and header from Sheet (2C batch 3)", () => {
  const source = read("src/components/audit/audit-scan-check-panel.tsx")
  assert.doesNotMatch(source, /closeLabel=|<SheetHeader className=|tCommon/)
  assert.match(source, /<SheetContent\n\s+side="bottom"\n\s+className="max-h-\[92dvh\] gap-0 rounded-t-xl"\n\s+onCloseAutoFocus=/)
  assert.match(source, /<SheetHeader>\n\s+<SheetTitle>\{title\}<\/SheetTitle>\n\s+<SheetDescription className="truncate">\{description\}<\/SheetDescription>\n\s+<\/SheetHeader>/)
})
