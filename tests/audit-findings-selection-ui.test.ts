import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 2 plan 4 Task 5 (spec §10 "Several at once", decision 5, bugs 17-18): ticks in the findings table, one shared
// reason to reject, a result report in the bar, a refresh after every batch. Sources read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const BATCH = "src/components/audit/audit-findings-batch-actions.tsx"
const PAGE = "src/app/[locale]/(dashboard)/audit/findings/page.tsx"

test("the selection: a provider of the page's tickable rows; only rows still tickable count; nothing changes while a batch runs; the last result is its own tab and filter's, and another tab or filter forgets it (P4-R34)", () => {
  const source = read(BATCH)
  assert.match(source, /^"use client"$/m)
  assert.match(source, /^export function AuditFindingsSelectionProvider\(\{ filterKey, findings, children \}: \{ filterKey: string; findings: readonly AuditFindingSelectable\[\]; children: ReactNode \}\) \{$/m)
  assert.match(source, /^type StoredBatchReport = \{ filterKey: string; report: BatchReport; focused: boolean \}$/m)
  assert.match(source, /const stored = reportStore\.stored\?\.filterKey === filterKey \? reportStore\.stored : null\n\s+const report = stored\?\.report \?\? null/, "the result is kept above the page, for its own tab and filter (P4-R34)")
  assert.match(source, /const setReport = \(next: BatchReport \| null\) => setStored\(next \? \{ filterKey, report: next, focused: false \} : null\)/)
  assert.match(source, /useEffect\(\(\) => \{\n\s+setStored\(\(current\) => \(current && current\.filterKey !== filterKey \? null : current\)\)\n\s+\}, \[setStored, filterKey\]\)/, "another tab or filter forgets the result, so coming back shows none; the same filterKey keeps it through the redirect to the last page (P4-R34)")
  assert.match(source, /const selectedIds = useMemo\(\(\) => tickableIds\.filter\(\(id\) => selected\.has\(id\)\), \[tickableIds, selected\]\)/)
  assert.match(source, /function toggle\(id: string\) \{\n\s+if \(runningRef\.current\) return\n\s+setReport\(null\)\n\s+setSelected\(\(current\) => toggleAuditFindingSelection\(current, id\)\)/)
  assert.match(source, /function toggleAll\(\) \{\n\s+if \(runningRef\.current\) return\n\s+setReport\(null\)\n\s+setSelected\(\(current\) => toggleAllAuditFindings\(current, tickableIds\)\)/)
  assert.doesNotMatch(source, /AuditFindingsBatchActions|<ChoiceCard|<ContentPanel|selectAllPending|batchNeedsSelection/, "today's batch panel is gone")
})

test("ticks: native checkboxes in a 44px label that the row's click ignores; the header tick shows the mixed state and owns its input; no ref travels in the context", () => {
  const source = read(BATCH)
  assert.match(source, /<label data-no-row-click className="flex min-h-11 w-11 cursor-pointer items-center justify-center">\n\s+<input\n\s+type="checkbox"\n\s+checked=\{selection\.isSelected\(findingId\)\}\n\s+onChange=\{\(\) => selection\.toggle\(findingId\)\}\n\s+disabled=\{selection\.running !== null\}\n\s+aria-label=\{t\("selectFinding", \{ name: `\$\{finding\.code\} \$\{finding\.topic\}` \}\)\}\n\s+className=\{checkboxVariants\(\)\}/)
  // react-hooks/refs (npm run lint): a ref in the context makes every read of it a ref read during render.
  const context = source.slice(source.indexOf("type SelectionContextValue = {"), source.indexOf("const AuditFindingsSelectionContext"))
  assert.ok(context.length > 0)
  assert.doesNotMatch(context, /RefObject|Ref\??:/, "no ref travels in the context: each component owns its element")
  assert.match(source, /const ref = useRef<HTMLInputElement \| null>\(null\)\n\s+useEffect\(\(\) => \{\n\s+if \(ref\.current\) ref\.current\.indeterminate = state === "some"\n\s+\}, \[state\]\)/, "the header tick owns its input")
  assert.match(source, /useEffect\(\(\) => \{\n\s+if \(selectAllFocusRequest > 0\) ref\.current\?\.focus\(\)\n\s+\}, \[selectAllFocusRequest\]\)/)
  assert.match(source, /function dismissReport\(\) \{\n\s+setReport\(null\)\n\s+if \(tickableIds\.length > 0\) setSelectAllFocusRequest\(\(count\) => count \+ 1\)\n\s+else document\.getElementById\("main"\)\?\.focus\(\)\n\s+\}/, "closing the result asks the header tick for focus as state, or focuses main when no row is left to tick")
  assert.match(source, /checked=\{state === "all"\}\n\s+onChange=\{selection\.toggleAll\}/)
  assert.match(source, /aria-label=\{t\("selectAllOnPage"\)\}/)
  assert.match(source, /if \(selection\.tickableIds\.length === 0\) return <span className="sr-only">\{t\("selectColumn"\)\}<\/span>/, "the head cell never stays empty")
})

test("decision 5: one shared reason, required to reject and checked before any request, in Task 4's words; approving takes an optional remark in the same one dialog (P4-R25, P4-R27)", () => {
  const source = read(BATCH)
  assert.match(source, /const FIELD_IDS = \{\n  reviewRemark: "audit-batch-review-remark",\n\} as const/)
  assert.match(source, /check\("reviewRemark", values\.action === "reject" \? \(required\(values\.reviewRemark\) \?\? maxLength\(values\.reviewRemark, 4000\)\) : maxLength\(values\.reviewRemark, 4000\)\)/)
  assert.match(source, /function confirm\(action: BatchAction, reviewRemark: string\) \{\n\s+fieldErrors\.setErrors\(validate\(\{ action, reviewRemark \}\)\)\n\s+if \(focusFirstError\(\)\) return\n\s+setDialogAction\(null\)\n\s+void selection\.run\(action, reviewRemark\)/)
  assert.match(source, /inputId=\{FIELD_IDS\.reviewRemark\}\n\s+required=\{dialogAction === "reject"\}\n\s+error=\{fieldErrors\.errors\.reviewRemark === "required" \? t\("reviewReasonRequired"\) : fieldErrors\.message\("reviewRemark"\)\}\n\s+onValueChange=\{\(\) => fieldErrors\.clear\("reviewRemark"\)\}/)
  assert.doesNotMatch(source, /\btoast\b|useApiError/, "the bar reports the result; no toast")
})

test("bugs 17-18: the runner over every ticked finding, one guard against a second run, a refresh whatever answered", () => {
  const source = read(BATCH)
  assert.match(source, /const result = await runAuditFindingBatchReview\(ids, \{ action, reviewRemark \}, sendReview, setProgress\)/)
  assert.match(source, /if \(runningRef\.current \|\| selectedIds\.length === 0\) return\n\s+runningRef\.current = true/)
  assert.match(source, /\} finally \{\n\s+runningRef\.current = false\n\s+setRunning\(null\)\n\s+\/\/ [^\n]*\n\s+router\.refresh\(\)\n\s+\}/)
  assert.match(source, /body: JSON\.stringify\(body\),/)
  assert.doesNotMatch(source, /confirmConflict/, "a batch never confirms a conflict (spec §10)")
})

test("the bar: the count, ล้าง, reject then approve N; progress then the result in Task 4's words; each failure with its reason and the panel link for a 409; the result takes focus once", () => {
  const source = read(BATCH)
  assert.match(source, /<DesktopSelectionBar\n\s+label=\{t\("selectionBarLabel"\)\}\n\s+countLabel=\{count > 0 \? t\("selectedCount", \{ count: countText \}\) : null\}\n\s+clearLabel=\{t\("clearSelection"\)\}\n\s+onClear=\{selection\.clear\}\n\s+clearDisabled=\{selection\.running !== null\}/)
  assert.ok(source.indexOf('{t("rejectSelected")}') < source.indexOf('{t("approveSelected", { count: countText })}'), "the primary last")
  assert.match(source, /\? t\("batchRunning", \{ done: formatCount\(selection\.progress\), total: countText \}\)/)
  assert.match(source, /t\("reviewResultSummary", \{ succeeded: formatCount\(selection\.report\.succeeded\), failed: formatCount\(selection\.report\.failed\.length\) \}\)/)
  assert.match(source, /<span className="tag">\{failure\.code\}<\/span> \{failure\.topic\}: \{t\(`reviewFailure_\$\{failure\.reason\}`\)\}/)
  assert.match(source, /\{failure\.reason === "assetChanged" \? \([\s\S]*?<Link href=\{failure\.panelHref\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>\{t\("batchOpenInPanel"\)\}<\/Link>/)
  assert.match(source, /const dismissRef = useRef<HTMLButtonElement \| null>\(null\)\n\s+useEffect\(\(\) => \{\n\s+if \(!reportNeedsFocus && document\.activeElement !== document\.body\) return\n\s+dismissRef\.current\?\.focus\(\)\n\s+reportFocused\(\)\n\s+\}, \[reportNeedsFocus, reportFocused\]\)/, "the result takes focus once, when it first shows: the buttons it came from are gone; a later mount (another page, the redirect) takes it again only when focus fell to the body (P4-R34)")
  assert.match(source, /reportNeedsFocus: stored !== null && !stored\.focused,/)
  assert.match(source, /<Button ref=\{dismissRef\} variant="outline" size="sm" onClick=\{dismissReport\}>/)
})

test("the page: one provider per selectionKey around the list pane, the ticks in a first column for audit:approve, the bar under the table (P4-R20, P4-R26)", () => {
  const page = read(PAGE)
  assert.match(page, /^import \{\n  AuditFindingSelectAllTick,\n  AuditFindingSelectTick,\n  AuditFindingsSelectionBar,\n  AuditFindingsSelectionProvider,\n  type AuditFindingSelectable,\n\} from "@\/components\/audit\/audit-findings-batch-actions"$/m)
  assert.match(page, /const selectableFindings: AuditFindingSelectable\[\] = canApprove\n\s+\? rows\n\s+\.filter\(\(row\) => row\.reviewable\)\n\s+\.map\(\(row\) => \(\{ id: row\.id, code: row\.asset\?\.assetTag \?\? row\.auditRound\.auditNo, topic: topicLabel\(row\.findingType\), panelHref: findingHref\(row\.id\) \}\)\)\n\s+: \[\]/)
  assert.match(page, /<AuditFindingsSelectionProvider key=\{selectionKey\} filterKey=\{filterKey\} findings=\{selectableFindings\}>/)
  assert.match(page, /const filterKey = `\$\{status\}:\$\{searchText\}:\$\{roundId \?\? ""\}:\$\{findingType \?\? ""\}`/)
  assert.match(read("src/app/[locale]/(dashboard)/audit/findings/layout.tsx"), /<AuditFindingsBatchReportProvider>\{children\}<\/AuditFindingsBatchReportProvider>/, "the result survives the redirect to the last page (P4-R34)")
  const table = page.slice(page.indexOf("<DataTable framed={false}"), page.indexOf("</DataTable>"))
  assert.match(table, /^<DataTable framed=\{false\} layout="fixed" minWidth=\{520\} /, "the tick comes out of the auto column: the table still fits beside the panel at 1280 (P4-R36)")
  assert.match(table, /<colgroup>\s*\{canApprove \? <col className="w-11" \/> : null\}\s*<col className="w-24" \/>/)
  assert.match(table, /\{canApprove \? \(\n\s+<DataTableHead className="p-0 first:pl-0 md:first:pl-0">\n\s+<AuditFindingSelectAllTick \/>\n\s+<\/DataTableHead>\n\s+\) : null\}/)
  assert.match(table, /\{canApprove \? \(\n\s+<DataTableCell className="p-0 first:pl-0 md:first:pl-0">\n\s+<AuditFindingSelectTick findingId=\{row\.id\} \/>\n\s+<\/DataTableCell>\n\s+\) : null\}/, "the first column's gutter cleared, so the 44px label fills its column (P4-R36)")
  assert.match(table, /<TableEmptyRow colSpan=\{canApprove \? 5 : 4\} /)
  assert.equal(page.match(/<AuditFindingSelectAllTick \/>/g)?.length, 1)
  assert.equal(page.match(/<AuditFindingSelectTick findingId=\{row\.id\} \/>/g)?.length, 1, "the desktop row only: the phone cards take no ticks (P4-R26)")
  assert.match(page, /\{canApprove \? <AuditFindingsSelectionBar \/> : null\}/)
  assert.ok(page.indexOf("<AuditFindingsSelectionBar />") > page.indexOf("<Pagination"), "under the table and its pager")
  assert.doesNotMatch(page, /AuditFindingsBatchActions|batchReviewFindings|canTickAuditFinding/)
  assert.doesNotMatch(page.match(/const selectionKey = [^\n]+/)?.[0] ?? "", /finding\b(?!Type)/, "opening a row in the panel keeps the ticks")
})

test("the bar's words, Thai and English (glossary: รายการไม่ตรง, พิจารณา); the result and the reasons are Task 4's", () => {
  const th = JSON.parse(read("messages/th.json")).auditFinding
  const en = JSON.parse(read("messages/en.json")).auditFinding
  const words: Record<string, [string, string]> = {
    selectedCount: ["{count} รายการที่เลือก", "{count} selected"],
    clearSelection: ["ล้าง", "Clear"],
    selectionBarLabel: ["รายการที่เลือก", "Selected discrepancies"],
    selectAllOnPage: ["เลือกทุกรายการที่พิจารณาได้ในหน้านี้", "Select every discrepancy you can decide on this page"],
    rejectSelected: ["ปฏิเสธที่เลือก", "Reject Selected"],
    approveSelected: ["อนุมัติที่เลือก {count} รายการ", "Approve {count} selected"],
    batchApproveTitle: ["อนุมัติ {count} รายการที่เลือก", "Approve {count} selected discrepancies"],
    batchApproveConfirm: ["อนุมัติ {count} รายการ", "Approve {count}"],
    batchRejectReason: ["เหตุผล", "Reason"],
    batchApproveRemark: ["หมายเหตุ (ไม่บังคับ)", "Remark (optional)"],
    batchResultDismiss: ["ปิดผลการพิจารณา", "Close the result"],
    // Task 4's, read as they are.
    reviewResultSummary: ["สำเร็จ {succeeded} · ไม่สำเร็จ {failed}", "{succeeded} done · {failed} not done"],
    reviewFailure_alreadyDecided: ["มีการพิจารณารายการนี้แล้ว", "Already decided"],
    reviewReasonRequired: ["กรุณาระบุเหตุผลการปฏิเสธ", "Enter a reason to reject."],
  }
  for (const [key, [thai, english]] of Object.entries(words)) {
    assert.equal(th[key], thai, key)
    assert.equal(en[key], english, key)
  }
  for (const reason of ["assetChanged", "alreadyDecided", "ownFinding", "reasonRequired", "roundReadOnly", "notFound", "failed"]) {
    assert.equal(typeof th[`reviewFailure_${reason}`], "string", reason)
    assert.equal(th[`batchFailed_${reason}`], undefined, `one word per reason: Task 4's (${reason})`)
  }
  assert.equal(th.batchResult, undefined, "one result line: Task 4's reviewResultSummary")
  for (const gone of ["batchReview", "batchReviewHelp", "selectAllPending", "batchReviewRemark", "batchReviewSuccess", "batchNeedsSelection"]) {
    assert.equal(th[gone], undefined, gone)
    assert.equal(en[gone], undefined, gone)
  }
})
