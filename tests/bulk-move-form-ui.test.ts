import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 3 plan 4 Task 6: the ย้ายที่ตั้งหลายรายการ page, its form and its table. Sources read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(dashboard)/asset-management/bulk-move/page.tsx"
const FORM = "src/components/asset-operations/bulk-move-form.tsx"
const TABLE = "src/components/asset-operations/bulk-move-table.tsx"
const messagesOf = (locale: string) => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Record<string, Record<string, string | undefined>>
const FIRST = '{ q: "", locationId: null, categoryId: null, page: 1 }'

test("ย้ายที่ตั้งหลายรายการ page: asset:edit first, then the active rooms and categories and the first page through the list reader, never the master lists (group 3 spec §10.3; P4-R12)", () => {
  const page = read(PAGE)
  const permission = page.indexOf('await requirePagePermission(locale, "asset", "edit")')
  assert.ok(permission > 0 && permission < page.indexOf("readBulkMovePageOptions(db)"))
  assert.ok(page.includes("const db = prisma as unknown as BulkMoveListDb"))
  assert.ok(page.includes(`const [options, firstPage] = await Promise.all([readBulkMovePageOptions(db), readBulkMoveListPage(db, ${FIRST})])`))
  assert.ok(page.includes("<BulkMoveForm rooms={options.rooms} categories={options.categories} initialPage={firstPage} />"))
  assert.doesNotMatch(page, /getAssetOperationMasterOptions|searchParams/)
  assert.ok(read(FORM).includes(`const FIRST_QUERY: BulkMoveListInput = ${FIRST}`), "the form starts from the query the page read")
})

test("ย้ายที่ตั้งหลายรายการ: the filters are a search region before the save form: the words, the room as it is now, the category and the count (group 3 spec §10.1, §11; P4-R11, P4-R13, P4-R21)", () => {
  const form = read(FORM)
  const start = form.indexOf('<div role="search"')
  assert.ok(start > 0 && start < form.indexOf("<form onSubmit={handleSubmit} noValidate"))
  const filters = form.slice(start, form.indexOf("<form onSubmit={handleSubmit} noValidate"))
  assert.match(filters, /^<div role="search" aria-label=\{t\("searchLabel"\)\} data-bulk-move-filters /)
  assert.match(filters, /<Field label=\{t\("searchLabel"\)\} id="bulk-move-search">\n\s+<SearchField value=\{searchText\} [^\n]*maxLength=\{assetOperationSearchMaxChars\}/)
  // Its × clears the words and the query at once, back to page 1, with no 300 ms wait, and keeps the focus in the box (plan 4 leftover).
  assert.match(filters, /<SearchField value=\{searchText\} [^\n]*onClear=\{clearSearch\} clearLabel=\{t\("clearSearch"\)\}/)
  const clear = form.slice(form.indexOf("function clearSearch()"), form.indexOf("function clearSearch()") + 400)
  assert.match(clear, /^function clearSearch\(\) \{\n\s+setSearchText\(""\)\n\s+setQuery\(\(current\) => \(current\.q === "" \? current : \{ \.\.\.current, q: "", page: 1 \}\)\)\n\s+document\.getElementById\("bulk-move-search"\)\?\.focus\(\)\n\s+\}/)
  const room = filters.match(/<SearchableSelect id="bulk-move-filter-location" [^\n]*/)?.[0] ?? ""
  assert.match(room, /label=\{t\("filterLocation"\)\} value=\{query\.locationId \?\? ""\} options=\{rooms\} placeholder=\{t\("filterAll"\)\}/)
  assert.doesNotMatch(room, /\brequired\b/, "not required, so its × clears to ทั้งหมด")
  assert.match(filters, /<FilterSelect id="bulk-move-filter-category" label=\{t\("filterCategory"\)\} allLabel=\{t\("filterAll"\)\} /)
  // Not common.searchSelectResultCount: its en is an ICU plural, and formatCount's "1,234" reads "NaN results" (Z8).
  assert.ok(filters.includes('t("foundCount", { count: formatCount(list.page.total) })'))
  assert.doesNotMatch(form, /searchSelectResultCount/)
  assert.match(form, /function changeFilter\(patch: Partial<Pick<BulkMoveListInput, "locationId" \| "categoryId">>\) \{\n\s+setQuery\(\(current\) => \(\{ \.\.\.current, \.\.\.patch, page: 1 \}\)\)/)
  assert.doesNotMatch(read(TABLE), /highlight/i, "no highlight in the table (P4-R11)")
})

test("ย้ายที่ตั้งหลายรายการ: the list is fetched 300 ms after the last keystroke, an older answer is dropped, a failure keeps the rows and the ticks with ลองอีกครั้ง, and nothing is fetched below md (group 3 spec §10.3, §10.4; P4-R12, P4-R19)", () => {
  const form = read(FORM)
  assert.match(form, /^const bulkMoveSearchDebounceMs = 300$/m)
  assert.ok(form.includes('if (text !== "" && !isAssetOperationSearchReady(text)) return'))
  assert.ok(form.includes('const isDesktop = useMediaQuery("(min-width: 48rem)")'))
  for (const line of [
    "if (!isDesktop) return",
    "const response = await fetch(href, { signal: controller.signal })",
    "if (controller.signal.aborted) return",
    "setSelection((current) => refreshBulkMoveSelection(current, answer.rows))",
    "return () => controller.abort()",
    "const listFailed = failedHref === href",
  ]) assert.ok(form.includes(line), line)
  // ลองอีกครั้ง clears the failed state first: the spinner shows, and a second failure re-mounts the alert (final review ui-3).
  assert.match(form, /<Notice tone="warning" role="alert" data-bulk-move-list-failed action=\{<Button variant="outline" size="sm" onClick=\{\(\) => \{ setFailedHref\(null\); setAttempt\(\(count\) => count \+ 1\) \}\}>\{tCommon\("tryAgain"\)\}<\/Button>\}>\n\s+\{t\("listFailed"\)\}/)
  assert.ok(form.includes("<BulkMoveTable listPage={list.page} "), "the last rows stay on screen while a request fails")
})

test("ย้ายที่ตั้งหลายรายการ: a row shows the tag, the name with its status, what travels or whose component it is, the room, the holder or ไม่มี; a locked box says why (group 3 spec §10.1; P4-R1, P4-R2, P4-R9, P4-R10, P4-R22)", () => {
  const table = read(TABLE)
  assert.match(table, /<DataTable caption=\{t\("tableCaption"\)\}/)
  // Look step: at 1024 the table scrolls sideways instead of squeezing its columns, and the bar's button sits on the
  // fields' line (the filter panel's and the batch form's items-end).
  assert.ok(table.includes('<DataTable caption={t("tableCaption")} footer={footer} minWidth={960} scrollHint={tCommon("tableScrollHint")} aria-busy={loading || undefined}>'))
  assert.ok(read(FORM).includes('<div className="flex flex-wrap items-end gap-3">'))
  assert.ok(table.includes('<TableEmptyRow colSpan={6}>{tAll("asset.noResultsTitle")}</TableEmptyRow>'))
  assert.ok(table.includes("<StatusBadge label={row.statusLabel} tone={getAssetStateTone(row.statusName)} />"))
  assert.ok(table.includes('row.travellingComponents.length > 0 ? <p data-bulk-move-follow className="text-meta text-muted-foreground">{t("componentsFollow", { count: row.travellingComponents.length })}</p> : null'))
  assert.ok(table.includes('row.componentOf ? <p data-bulk-move-component-of className="text-meta text-muted-foreground">{t("componentOf", { tag: row.componentOf.parentTag })}</p> : null'))
  assert.ok(table.includes('!row.eligible && row.reasonKey ? <p id={`bulk-move-row-reason-${row.id}`} data-bulk-move-reason className="text-meta text-warning">{tAll(row.reasonKey)}</p> : null'))
  assert.ok(table.includes('{row.holderLabel ?? <span className="text-muted-foreground">{t("noHolder")}</span>}'))
  assert.ok(table.includes("const lock = getBulkMoveRowLock(selection, row)"))
  assert.ok(table.includes("disabled={disabled || lock !== null}"))
  assert.ok(table.includes('aria-describedby={lock === "cap" ? CAP_REASON_ID : !row.eligible && row.reasonKey ? `bulk-move-row-reason-${row.id}` : undefined}'))
  assert.ok(table.includes('aria-label={t("selectRow", { tag: row.assetTag })}'))
  assert.match(table, /^const CAP_REASON_ID = "bulk-move-cap-reason"$/m)
  assert.ok(table.includes("const pageState = getBulkMovePageState(selection, rows)"))
  assert.ok(table.includes('onChange={() => onTogglePage(pageState !== "all")}'))
  // A page whose ticked row came back refused can still be unticked; nothing tickable at the cap is disabled (Z2).
  assert.ok(table.includes('disabled={disabled || loading || (pageState === "none" && rows.every((row) => getBulkMoveRowLock(selection, row) !== null))}'))
  assert.ok(table.includes('aria-label={t("selectPage")}'))
})

test("ย้ายที่ตั้งหลายรายการ: the pager is the shared Pagination with buttons and the register's range words (group 3 spec §10.1; P4-R12, P4-R13)", () => {
  const table = read(TABLE)
  assert.match(table, /<Pagination\n\s+page=\{loading \? 1 : page\}\n\s+totalPages=\{loading \? 1 : totalPages\}\n\s+onPrevious=\{\(\) => onPage\(page - 1\)\}\n\s+onNext=\{\(\) => onPage\(page \+ 1\)\}\n/)
  assert.doesNotMatch(table, /previousHref|nextHref/)
  assert.ok(table.includes("const totalPages = Math.max(1, Math.ceil(total / pageSize))"))
  assert.ok(table.includes('range: tCommon("showingRange", { from: formatCount(from), to: formatCount(to), total: formatCount(total) }),'))
  assert.ok(table.includes('pageOf: tCommon("pageOf", { page: formatCount(page), total: formatCount(totalPages) }),'))
  assert.ok(read(FORM).includes("onPage={(page) => setQuery((current) => ({ ...current, page }))}"))
})

test("ย้ายที่ตั้งหลายรายการ: the bar inside the save form while anything is ticked: the count, ล้าง, ย้ายไป, เหตุผล, ตรวจสอบและย้าย N รายการ and the cap line, with no nav offset (group 3 spec §10.2; P4-R10, P4-R14, P4-R19)", () => {
  const form = read(FORM)
  assert.match(form, /\{selection\.size > 0 \? \(\n\s+<DesktopSelectionBar\n\s+label=\{t\("title"\)\}\n\s+countLabel=\{t\("selectedCount", \{ count: formatCount\(selection\.size\) \}\)\}\n\s+clearLabel=\{t\("clear"\)\}\n\s+onClear=\{clearSelection\}\n\s+clearDisabled=\{saving\}\n\s+className="-bottom-6"\n/)
  assert.ok(form.includes('status={selection.size >= bulkMoveMaxAssets ? t("capReached", { max: formatCount(bulkMoveMaxAssets) }) : null}'))
  assert.ok(form.includes('{t("reviewAndMove", { count: formatCount(selection.size) })}'))
  assert.ok(form.includes('<EmptyNote data-bulk-move-nothing-selected>{t("nothingSelected")}</EmptyNote>'))
  const at = (text: string) => form.indexOf(text)
  assert.ok(at("<form onSubmit={handleSubmit} noValidate") < at("<BulkMoveTable") && at("<BulkMoveTable") < at("<DesktopSelectionBar") && at("<DesktopSelectionBar") < at("</form>"), "the form is the list's column, so the bar sticks within it")
})

test("ย้ายที่ตั้งหลายรายการ: the review names every tag, the room and the reason, then the lines that apply and ผู้ถือครองและแผนกคงเดิม, then หมายเหตุ (group 3 spec §10.2; P4-R1, P4-R3, P4-R15, P4-R17)", () => {
  const form = read(FORM)
  assert.match(form, /<OperationReviewDialog\n\s+open=\{reviewOpen\}\n\s+title=\{t\("reviewTitle"\)\}\n\s+description=\{null\}\n\s+items=\{reviewItems\}\n\s+confirmLabel=\{t\("reviewConfirm"\)\}\n\s+cancelLabel=\{tCommon\("cancel"\)\}\n\s+busy=\{saving\}\n/)
  assert.ok(form.includes("const counts = room ? getBulkMoveReviewCounts(selection, room) : null"))
  const lines = [
    '{ label: t("reviewAssets"), value: t("reviewAssetsValue", { count: formatCount(counts.assets), tags: counts.tags.join(", ") }) },',
    '{ label: t("toLocation"), value: room.label },',
    '{ label: t("reason"), value: values.reason },',
    'counts.componentsFollow > 0 ? t("reviewComponents", { count: counts.componentsFollow }) : null,',
    'counts.alreadyThere > 0 ? t("reviewAlreadyThere", { count: formatCount(counts.alreadyThere) }) : null,',
    'counts.otherBranch > 0 ? t("reviewOtherBranch", { count: formatCount(counts.otherBranch) }) : null,',
    'counts.componentsAlone > 0 ? t("reviewComponentsAlone", { count: counts.componentsAlone }) : null,',
    't("reviewKept"),',
  ]
  lines.forEach((line, index) => {
    assert.ok(form.includes(line), line)
    if (index > 0) assert.ok(form.indexOf(line) > form.indexOf(lines[index - 1]), `in order: ${line}`)
  })
  const dialog = form.slice(form.indexOf("<OperationReviewDialog"), form.indexOf("</OperationReviewDialog>"))
  // The lines and หมายเหตุ in one wrapper; the dialog's own border is the only line under the items (Z6, Z19).
  assert.match(dialog, /<div className="grid gap-3">\n\s+<ul data-bulk-move-review-lines className="grid gap-1\.5 text-sm text-foreground">\n\s+\{reviewLines\.map\(\(line\) => <li key=\{line\}>\{line\}<\/li>\)\}/)
  assert.match(dialog, /<Field label=\{t\("remark"\)\} id="bulk-move-remark">\n\s+<Textarea value=\{values\.remark\} [^\n]*\/>/)
  assert.doesNotMatch(dialog.match(/<Textarea [^\n]*/)?.[0] ?? "", /maxLength|required/)
})

test("ย้ายที่ตั้งหลายรายการ: after the save the page stays: everything clears, the page is fetched again, one line says what moved; refused assets go out with one button (group 3 spec §10.2; P4-R4, P4-R8, P4-R18)", () => {
  const form = read(FORM)
  assert.ok(form.includes("body: JSON.stringify({ assetIds: [...selection.keys()], toLocationId: values.toLocationId, reason: values.reason, remark: values.remark }),"))
  assert.ok(form.includes("const answer = readBulkMoveSaveAnswer(payload)"))
  assert.ok(form.includes("setResult(answer ? { room: room.label, ...getBulkMoveResultParts(answer) } : null)"), "the result's room reads code - name (Z20)")
  assert.match(form, /if \(payload\?\.code === "ASSET_CHANGED_DURING_OPERATION"\) \{\n\s+setReviewOpen\(false\)\n\s+setAttempt\(\(count\) => count \+ 1\)\n\s+\}\n\s+throw new Error\(payload\?\.code \?\? payload\?\.error \?\? tCommon\("error"\)\)/)
  assert.match(form, /<div ref=\{resultRef\} role="status" tabIndex=\{-1\} data-bulk-move-result className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">\n\s+\{resultText \? <Notice tone="success">\{resultText\}<\/Notice> : null\}/)
  for (const line of [
    't("resultMoved", { count: formatCount(result.moved), room: result.room }),',
    'result.components > 0 ? t("resultComponents", { count: result.components }) : null,',
    'result.unchanged > 0 ? t("resultUnchanged", { count: formatCount(result.unchanged) }) : null,',
  ]) assert.ok(form.includes(line), line)
  assert.match(form, /function changeSelection\(next: BulkMoveSelection\) \{\n\s+setSelection\(next\)\n\s+setResult\(null\)\n\s+setBlocked\(\[\]\)\n\s+fieldErrors\.clear\("assetIds"\)\n\s+\}/)
  assert.ok(form.includes("const next = removeBulkMoveIds(selection, blocked.map((asset) => asset.assetId))"))
  assert.ok(form.includes('<Button variant="outline" size="md" aria-describedby="bulk-move-selection-error" onClick={removeBlocked}>'))
  assert.doesNotMatch(form, /toast\.success|router\.push|useRouter|from "sonner"/)
})

test("ย้ายที่ตั้งหลายรายการ on a phone: one header, then only a notice with a link to the register; the filters, table and bar are hidden below md (group 3 spec §10.4; P4-R19)", () => {
  const form = read(FORM)
  assert.match(form, /<Notice tone="info" title=\{t\("desktopOnlyTitle"\)\} data-bulk-move-desktop-only className="md:hidden" action=\{<Link href=\{`\/\$\{locale\}\/assets`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>\{t\("backToRegister"\)\}<\/Link>\}>\n\s+\{t\("desktopOnlyBody"\)\}/)
  assert.ok(form.includes('<div data-bulk-move-desktop className="grid min-w-0 gap-4 max-md:hidden">'))
  const at = (text: string) => form.indexOf(text)
  assert.ok(at("<PageHeader") < at("data-bulk-move-desktop-only") && at("data-bulk-move-desktop-only") < at("data-bulk-move-desktop ") && at("data-bulk-move-desktop ") < at('<div role="search"'))
})

test("ย้ายที่ตั้งหลายรายการ: the page's words and the menu's (group 3 spec §10, §13; P4-R20)", () => {
  const th = messagesOf("th")
  const en = messagesOf("en")
  assert.equal(th.nav.bulkMove, "ย้ายที่ตั้งหลายรายการ")
  const words: Record<string, string> = {
    subtitle: "เลือกทรัพย์สินที่จะย้ายไปที่ตั้งเดียวกัน ผู้ถือครองและแผนกคงเดิม", searchLabel: "ค้นหา", searchPlaceholder: "ค้นหารหัส ชื่อ หรือผู้ถือครอง",
    filterLocation: "ที่ตั้งตอนนี้", filterCategory: "หมวดหมู่", filterAll: "ทั้งหมด", foundCount: "พบ {count} รายการ", tableCaption: "ทรัพย์สินที่ย้ายได้และย้ายไม่ได้",
    colTag: "รหัส", colName: "ชื่อ", colCategory: "หมวดหมู่", colLocation: "ที่ตั้งตอนนี้", colHolder: "ผู้ถือครอง", noHolder: "ไม่มี",
    selectPage: "เลือกทั้งหมดในหน้านี้", selectRow: "เลือก {tag}", componentsFollow: "+{count, number} ส่วนควบย้ายตาม", componentOf: "ส่วนควบของ {tag}",
    capReached: "เลือกได้สูงสุด {max} รายการต่อครั้ง", nothingSelected: "ยังไม่ได้เลือกทรัพย์สิน เลือกรายการในตารางเพื่อย้าย", listFailed: "โหลดรายการไม่สำเร็จ",
    selectedCount: "{count} รายการที่เลือก", clear: "ล้าง", toLocation: "ย้ายไป", reason: "เหตุผล", reviewAndMove: "ตรวจสอบและย้าย {count} รายการ",
    reviewTitle: "ตรวจสอบก่อนย้ายที่ตั้ง", reviewConfirm: "ยืนยันย้ายที่ตั้ง", reviewAssets: "ทรัพย์สิน", reviewAssetsValue: "{count} รายการ: {tags}",
    reviewComponents: "ส่วนควบย้ายตาม {count, number} ชิ้น", reviewAlreadyThere: "อยู่ที่ตั้งนี้แล้ว {count} รายการ ไม่บันทึกการย้าย",
    reviewOtherBranch: "ย้ายไปสาขาอื่น {count} รายการ รหัสยังเป็นของสาขาเดิม", reviewComponentsAlone: "ส่วนควบที่เลือกเอง {count, number} รายการ ย้ายแยกจากเครื่องหลัก",
    reviewKept: "ผู้ถือครองและแผนกคงเดิม", resultMoved: "ย้ายแล้ว {count} รายการไป {room}", resultComponents: "ส่วนควบย้ายตาม {count, number} ชิ้น",
    resultUnchanged: "อยู่ที่ตั้งนี้แล้ว {count} รายการ", blockedAssets: "ย้ายไม่ได้ {count} รายการ: {list}", removeBlocked: "นำรายการที่ย้ายไม่ได้ออก",
    desktopOnlyTitle: "หน้านี้ใช้บนคอมพิวเตอร์", desktopOnlyBody: "ย้ายที่ตั้งหลายรายการต้องเลือกจากตาราง เปิดหน้านี้บนคอมพิวเตอร์",
    backToRegister: "ไปที่ทะเบียนทรัพย์สิน", clearSearch: "ล้างคำค้น",
  }
  for (const [key, value] of Object.entries(words)) {
    assert.equal(th.bulkMove[key], value, `th.bulkMove.${key}`)
    assert.ok(en.bulkMove[key], `en.bulkMove.${key}`)
  }
  assert.equal(en.bulkMove.clearSearch, "Clear search")
  for (const key of ["title", "selectLocation", "remark"]) assert.ok(th.bulkMove[key] && en.bulkMove[key], `${key} is kept`)
  for (const key of ["assets", "selectAssets", "success"]) for (const messages of [th, en]) assert.equal(messages.bulkMove[key], undefined, `bulkMove.${key} has no reader and is removed`)
})

// The final review of plan 4 (journeys-2, ui-1 … ui-4, tests-1).
test("ย้ายที่ตั้งหลายรายการ: a 409 that names refused assets reads the page on screen again, so a refused row shows its reason (plan 4 final review journeys-2, ui-2, tests-1; P4-R9)", () => {
  const form = read(FORM)
  assert.match(form, /if \(refused\.length > 0\) \{\n\s+setBlocked\(refused\)\n\s+fieldErrors\.setErrors\(\{ assetIds: "blocked" \}\)\n\s+setAttempt\(\(count\) => count \+ 1\)\n\s+focusFirstError\(\)\n\s+return\n\s+\}/)
})

test("ย้ายที่ตั้งหลายรายการ: focus never falls to <body> when the bar unmounts: the result line after a save, the header box after ล้าง or a นำรายการที่ย้ายไม่ได้ออก that empties the selection, once the review has closed (plan 4 final review ui-1)", () => {
  const form = read(FORM)
  const table = read(TABLE)
  assert.match(table, /^export const BULK_MOVE_SELECT_PAGE_ID = "bulk-move-select-page"$/m)
  assert.match(table, /ref=\{headerRef\}\n\s+id=\{BULK_MOVE_SELECT_PAGE_ID\}\n\s+type="checkbox"/)
  assert.ok(form.includes("const [focusRequest, setFocusRequest] = useState<BulkMoveFocusRequest | null>(null)"))
  assert.match(form, /useEffect\(\(\) => \{\n\s+if \(!focusRequest\) return\n\s+let cancelled = false\n\s+void \(async \(\) => \{\n\s+await waitForDialogToClose\(\)\n\s+if \(cancelled\) return\n/)
  assert.ok(form.includes('const target = focusRequest === "result" ? resultRef.current : box && !box.disabled ? box : document.getElementById("bulk-move-search")'))
  assert.match(form, /function clearSelection\(\) \{\n\s+changeSelection\(new Map\(\)\)\n\s+setFocusRequest\("selectPage"\)\n\s+\}/)
  assert.match(form, /const next = removeBulkMoveIds\(selection, blocked\.map\(\(asset\) => asset\.assetId\)\)\n\s+changeSelection\(next\)\n\s+if \(next\.size === 0\) setFocusRequest\("selectPage"\)/)
  assert.match(form, /setAttempt\(\(count\) => count \+ 1\)\n\s+setFocusRequest\("result"\)\n\s+\} catch/)
  assert.equal(form.match(/setFocusRequest\("/g)?.length, 3, "only the three ways the bar unmounts with focus in it")
  assert.doesNotMatch(read("src/components/ui/operation-review-dialog.tsx"), /returnFocusRef|fallbackFocusRef/, "the review's own hand-back is left as it is")
})

test("ย้ายที่ตั้งหลายรายการ: while a new query loads the table is busy and the header box and the pager wait, so the shown page never overwrites the pending query's (plan 4 final review ui-4)", () => {
  const form = read(FORM)
  const table = read(TABLE)
  assert.ok(form.includes("const listLoading = isDesktop && list.href !== href && !listFailed"))
  assert.ok(form.includes("<BulkMoveTable listPage={list.page} selection={selection} disabled={saving} loading={listLoading} "))
  assert.ok(table.includes('scrollHint={tCommon("tableScrollHint")} aria-busy={loading || undefined}>'))
  assert.match(table, /^\s+loading: boolean$/m)
})
