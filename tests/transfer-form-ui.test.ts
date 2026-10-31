import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// โอนย้าย's page and form (group 3 spec §9, §5, §13; plan 3 Task 6): source pins, in the style of checkin-form-rules.test.ts.
// The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const FORM = "src/components/asset-operations/transfer-form.tsx"
const PAGE = "src/app/[locale]/(dashboard)/asset-management/transfer/page.tsx"
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Record<string, Record<string, string>>
const has = (source: string, parts: string[]) => { for (const part of parts) assert.ok(source.includes(part), part) }
const count = (source: string, text: string) => source.split(text).length - 1
function at(source: string, text: string, from = 0) {
  const index = source.indexOf(text, from)
  assert.ok(index >= 0, text)
  return index
}
// Each text found after the previous one.
function inOrder(source: string, parts: string[]) {
  let from = 0
  for (const part of parts) from = at(source, part, from) + part.length
}

test("the page: the masters with the employees' own department and the rooms' branch, the preselect with its detail, after the permission (spec §9, P3-R9)", () => {
  const page = read(PAGE)
  has(page, [
    'await requirePagePermission(locale, "asset", "edit")',
    "const [options, initialAsset] = await Promise.all([",
    "getAssetOperationMasterOptions({ employeeDepartment: true, locationBranch: true }),",
    'getAssetOperationPreselect("transfer", filters.assetId, { detail: true }),',
    "employees={options.employees}",
    "departments={options.departments}",
    "locations={options.locations}",
    "initialAsset={initialAsset}",
    "returnTo={filters.returnTo ? normalizeAssetReturnTo(locale, filters.returnTo) : undefined}",
  ])
  assert.ok(at(page, "await requirePagePermission(") < at(page, "await Promise.all(["))
  assert.doesNotMatch(page, /employeeDetail|conditionsFor|canCreateRepair|hasPermission|maintenance/)
})

test("the form: the form wraps the frame with no summary column on the phone; three sections; the card with its lead, photo, rows, checklist, warnings and footnote; the footer; the review after the form (spec §5, §9.1-§9.3, P3-R12, P3-R19)", () => {
  const form = read(FORM)
  has(form, [
    'const TRANSFER_FORM_ID = "transfer-form"',
    "<form onSubmit={handleSubmit} noValidate id={TRANSFER_FORM_ID}>",
    'import { appendReturnTo, getOperationCancelHref } from "@/lib/asset-return-navigation"',
    "const cancelHref = getOperationCancelHref(locale, returnTo)",
    "summary={<OperationSummaryCard",
    'title={tOperation("summaryTitle")}',
    'nowLabel={tOperation("summaryNow")}',
    'nextLabel={tOperation("summaryNext")}',
    "lead={transferLead}",
    "rows={summaryRows}",
    "checklist={checklist}",
    "warnings={summaryWarnings}",
    'footnote={t("summaryFootnote")}',
    "photo={values.asset ? <AssetThumbnail photo={values.asset.photo} assetTag={values.asset.assetTag} assetName={values.asset.name} size={64} /> : undefined}",
    "assetLabel={values.asset ? assetOperationRowLabel(values.asset) : undefined}",
    "const summaryRows = buildTransferSummaryRows(transferChoice, transferWords)",
    "const checklist = buildTransferChecklist(transferChoice, values.reason, transferWords)",
    "const transferLead = buildTransferLead(transferChoice, transferWords)",
    "const footerLine = buildTransferFooterLine(transferChoice, transferWords)",
    "cancelHref,",
    'cancelLabel: tCommon("cancel"),',
    'submitLabel: tOperation("reviewAndSave"),',
    "busy: saving || readingForSubmit,",
    "formId: TRANSFER_FORM_ID,",
    "pickedBody={(row) => <TransferAssetCard row={row} />}",
    "function TransferAssetCard({ row }: { row: AssetOperationSearchRow }) {",
    "<StatusBadge label={row.statusLabel} tone={getAssetStateTone(row.detail?.statusName)} />",
    "<AssetThumbnail photo={row.photo} assetTag={row.assetTag} assetName={row.name} size={44} />",
    'title={t("reviewTitle")}',
    'confirmLabel={t("reviewConfirm")}',
    "items={reviewItems}",
    "onConfirm={() => void submitTransfer()}",
    'toast.success(t("success"))',
    "const transferWords: TransferWords = {",
    'formerHolder: (name) => tAll("checkin.returnByFormer", { name }),',
    'departmentChooseAssetFirst: t("departmentChooseAssetFirst"),',
    'inUse: t("inUseStatus"),',
    'statusUnchanged: t("statusUnchanged"),',
    'summaryComponentsMove: (count) => t("summaryComponentsMove", { count }),',
    'summaryComponentsOutstanding: (count) => tAll("checkout.summaryComponentsOutstanding", { count }),',
    'checkAsset: t("asset"),',
    'checkReason: t("sectionReason"),',
    'nextStatus: t("reviewNextStatus"),',
    'componentsMove: (count, list) => t("componentsMove", { count, list }),',
    'componentsStaying: (list) => t("componentsStaying", { list }),',
    'componentsOutstanding: (count, list) => t("componentsOutstanding", { count, list }),',
    'outstandingLine: { with: (holder) => tAll("checkout.outstandingWith", { holder }), since: (documentNo) => tAll("checkout.outstandingSince", { documentNo }) },',
  ])
  assert.doesNotMatch(form, /nowPending|\bpending: |statusKept: |leadKept: |currentMark"\)|"detailReadFailed"\)|t\("summaryComponentsOutstanding"/)
  assert.match(form, /<OperationFormFrame\n\s+title=\{t\("title"\)\}\n\s+description=\{t\("description"\)\}\n\s+summaryOnPhone=\{false\}\n\s+summary=\{<OperationSummaryCard\n/)
  assert.ok(at(form, "<form onSubmit=") < at(form, "<OperationFormFrame"))
  assert.ok(at(form, "</OperationFormFrame>") < at(form, "</form>"))
  assert.ok(at(form, "</form>") < at(form, "<OperationReviewDialog"))
  inOrder(form, [
    "<FormSection number={1}",
    'id="transfer-asset"',
    "<FormSection number={2}",
    "data-transfer-table",
    "data-transfer-components",
    "<FormSection number={3}",
    "data-transfer-reason-chips",
    'id="transfer-reason"',
    "<Textarea",
  ])
  assert.doesNotMatch(form, /<PageHeader\b|<ContentPanel\b|<StickyFormFooter\b|phoneSteps|tCommon\("save"\)|<Save\b|pickBlocked|canCreateRepair|<table\b|<thead\b|<tr\b|<Segmented\b|<ChoiceChip\b|from "next\/link"/)
})

test("section 1 and 2: the asset card, the components with their own handover and the outstanding ones in section 1; the heads, three rows with a ตอนนี้ cell, an arrow and a picker with a hidden label and the current value marked; the department follows the holder; the travelling line (spec §9.1, §9.2, §9.4, P3-R5, P3-R11, P3-R14, P3-R17)", () => {
  const form = read(FORM)
  has(form, [
    'const TRANSFER_ROW_CLASSES = "grid min-w-0 gap-1.5 lg:grid-cols-[8rem_minmax(0,1fr)_1rem_minmax(0,1fr)] lg:items-start lg:gap-3"',
    '<div data-transfer-table className="grid gap-4 lg:gap-3">',
    '<div aria-hidden="true" className={cn(TRANSFER_ROW_CLASSES, "text-meta text-muted-foreground max-lg:hidden")}>',
    '<span>{t("columnItem")}</span>',
    '<span>{t("columnNow")}</span>',
    '<span>{t("columnTarget")}</span>',
    "const nowCells = transferNowCells(transferChoice, transferWords)",
    "const lockText = transferDepartmentLockText(transferChoice, transferWords)",
    '<SearchableSelect id="transfer-to-location" label={t("toLocation")} labelVisuallyHidden value={values.toLocationId} options={locations} currentValue={values.asset?.currentLocationId} currentMark={tOperation("summaryNow")} placeholder={t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} error={fieldErrors.message("toLocationId")} onChange={(value) => setField("toLocationId", value)} />',
    '<SearchableSelect id="transfer-to-custodian" label={t("toCustodian")} labelVisuallyHidden value={values.toCustodianId} options={employees} currentValue={values.asset?.detail?.holderId ?? undefined} currentMark={tOperation("summaryNow")} placeholder={t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} error={fieldErrors.message("toCustodianId")} onChange={(value) => setField("toCustodianId", value)} />',
    '<SearchableSelect id="transfer-to-department" label={t("toDepartment")} labelVisuallyHidden value={transferChange.departmentLocked ? "" : values.toDepartmentId} options={departments} currentValue={values.asset?.detail?.departmentId ?? undefined} currentMark={tOperation("summaryNow")} disabled={transferChange.departmentLocked} placeholder={lockText ?? t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} error={fieldErrors.message("toDepartmentId")} onChange={(value) => setField("toDepartmentId", value)} />',
    "const componentLines = transferComponentLines(transferChoice, transferWords)",
    '{componentLines.staying ? <Notice tone="info" data-transfer-staying>{componentLines.staying}</Notice> : null}',
    '{componentLines.outstanding ? <Notice tone="warning" role="status" data-transfer-outstanding>{componentLines.outstanding}</Notice> : null}',
    '{componentLines.travelling ? <p data-transfer-components className="text-sm text-muted-foreground">{componentLines.travelling}</p> : null}',
  ])
  assert.doesNotMatch(form, /checkoutComponents|checkoutOutstandingComponents|checkoutOutstandingLines/)
  const row = (key: string, label: string, id: string) => new RegExp(
    `<div data-transfer-row="${key}" className=\\{TRANSFER_ROW_CLASSES\\}>\\n\\s+` +
    `<span className="text-sm font-medium text-foreground lg:pt-2">\\{tOperation\\("${label}"\\)\\}</span>\\n\\s+` +
    `<p data-transfer-now className="min-w-0 break-words text-sm text-foreground lg:pt-2"><span className="text-muted-foreground lg:sr-only">\\{t\\("columnNow"\\)\\}: </span>\\{nowCells\\.${key}\\}</p>\\n\\s+` +
    `<ArrowRight aria-hidden="true" className="size-4 text-muted-foreground max-lg:hidden lg:mt-2\\.5" />\\n\\s+` +
    `<SearchableSelect id="${id}" `,
  )
  assert.match(form, row("location", "summaryLocation", "transfer-to-location"))
  assert.match(form, row("holder", "summaryHolder", "transfer-to-custodian"))
  assert.match(form, row("department", "summaryDepartment", "transfer-to-department"))
  assert.equal(count(form, "data-transfer-row="), 3)
  assert.equal(count(form, "<p data-transfer-now "), 3)
  assert.equal(count(form, "<ArrowRight "), 3)
  assert.ok(at(form, 'data-transfer-row="location"') < at(form, 'data-transfer-row="holder"'))
  assert.ok(at(form, 'data-transfer-row="holder"') < at(form, 'data-transfer-row="department"'))
  inOrder(form, ["<FormSection number={1}", "data-transfer-staying", "data-transfer-outstanding", "<FormSection number={2}"])
  assert.match(form, /\{initialAsset\?\.eligible && values\.asset\?\.id === initialAsset\.id \? \(\n\s+<FormContextBanner label=\{t\("asset"\)\} value=\{assetOperationRowLabel\(initialAsset\)\} \/>/)
  assert.doesNotMatch(form, /md:col-span-2/)
})

test("one change set: the picker's context, validate(), the payload and the review read getTransferFormChange; a holder the department follows drops a picked department, and clearing the holder brings nothing back; the review's status is T5's last line (P3-R4, P3-R5, P3-R18, P3-R21, Review Focus 3; Y2, Y9)", () => {
  const form = read(FORM)
  assert.match(form, /const transferChoice: TransferFormChoice = \{\n\s+row: values\.asset,\n\s+detail: assetDetail,\n\s+destinations: \{ toLocationId: values\.toLocationId, toCustodianId: values\.toCustodianId, toDepartmentId: values\.toDepartmentId \},\n\s+employees,\n\s+departments,\n\s+locations,\n\s+\}\n\s+const transferChange = getTransferFormChange\(transferChoice\)\n/)
  has(form, [
    "context={{ assignCustodian: Boolean(transferChange.destinations.toCustodianId) }}",
    "body: JSON.stringify({ ...transferChange.destinations, reason: values.reason, remark: values.remark }),",
    'check("toLocationId", hasTransferChange(change.destinations) ? null : "transferDestinationRequired")',
    "const transferReviewDetails = buildTransferReviewDetails(transferChoice, transferWords)",
    'details: [...transferReviewDetails, { key: "reason", label: t("reason"), value: values.reason }],',
    'evidenceLabel: t("reviewNoEvidence"),',
  ])
  assert.doesNotMatch(form, /values\.to(?:Location|Custodian|Department)Id \|\| null|destinationLabels:|nextStatusLabel:|values\.toCustodianId \? t\("inUseStatus"\)|statusNext|key: "nextStatus"/)
  const setField = form.slice(at(form, "function setField(field: string, value: string) {"), at(form, "function setAsset("))
  has(setField, [
    'if (field === "toLocationId" || field === "toCustodianId" || field === "toDepartmentId") fieldErrors.clear("toLocationId")',
    'if (field !== "toLocationId" && field in FIELD_IDS) fieldErrors.clear(field as TransferField)',
    'const dropsDepartment = field === "toCustodianId" && value !== "" && getTransferFormChange({ ...transferChoice, destinations: { ...transferChoice.destinations, toCustodianId: value } }).departmentSource !== "free"',
    'if (dropsDepartment) fieldErrors.clear("toDepartmentId")',
    'setValues((current) => ({ ...current, [field]: value, ...(dropsDepartment ? { toDepartmentId: "" } : {}) }))',
    'if (field === "toCustodianId" && value && values.asset) void recheckAssetForCustodian(values.asset.id)',
  ])
  assert.equal(count(form, 'toDepartmentId: ""'), 2, "the initial value and the drop: nothing puts a cleared department back")
})

test("the detail: read at the pick and again on submit with the holder the save sends; a failed read keeps the review shut with ลองอีกครั้ง; a late answer is dropped; the two 409s close the review, read again and toast (P3-R15, Review Focus 5)", () => {
  const form = read(FORM)
  has(form, [
    'const [assetDetail, setAssetDetail] = useState<CheckoutDetailState>(initialAsset && !initialAsset.detail ? "failed" : "ready")',
    "const assetIdRef = useRef(initialAsset?.id ?? null)",
    "const [readingForSubmit, setReadingForSubmit] = useState(false)",
    "async function loadAssetDetail(assetId: string, assignCustodian: boolean): Promise<AssetOperationSearchRow | null> {",
    'const response = await fetch(buildAssetOperationSearchHref({ mode: "transfer", id: assetId, detail: true, assignCustodian })).catch(() => null)',
    "if (assetIdRef.current !== assetId) return null",
    "setValues((current) => ({ ...current, asset: withCheckoutAssetDetail(current.asset, answered) }))",
    'setAssetDetail(answered ? "ready" : "failed")',
    "assetIdRef.current = asset?.id ?? null",
    'setAssetDetail(asset && !asset.detail ? "loading" : "ready")',
    "if (asset && !asset.detail) void loadAssetDetail(asset.id, Boolean(values.toCustodianId))",
    'const detailFailedNotice = values.asset && assetDetail === "failed" ? (',
    '<span>{tAll("checkout.detailReadFailed")}</span>',
    '{tCommon("tryAgain")}',
    "onClick={() => values.asset && void loadAssetDetail(values.asset.id, Boolean(transferChange.destinations.toCustodianId))}",
    "const summaryWarnings = [...transferWarningLines(transferChoice, transferWords), ...(detailFailedNotice ? [detailFailedNotice] : [])]",
  ])
  const submit = form.slice(at(form, "async function handleSubmit("), at(form, "const detailFailedNotice ="))
  inOrder(submit, [
    "if (readingForSubmit) return",
    "fieldErrors.setErrors(validate(values, transferChange))",
    "if (focusFirstError()) return",
    "if (!values.asset) return",
    "setReadingForSubmit(true)",
    "const answered = await loadAssetDetail(values.asset.id, Boolean(transferChange.destinations.toCustodianId)).finally(() => setReadingForSubmit(false))",
    "if (!answered) return",
    'fieldErrors.setErrors(validate({ ...values, asset: answered }, getTransferFormChange({ ...transferChoice, row: answered, detail: "ready" })))',
    "if (focusFirstError()) return",
    "setReviewOpen(true)",
  ])
  assert.equal(count(submit, "setReviewOpen(true)"), 1)
  const start = at(form, "async function submitTransfer(")
  const save = form.slice(start, at(form, "\n  return (\n", start))
  inOrder(save, [
    "if (fieldErrors.applyServer(payload) && focusFirstError()) return",
    'if (payload?.code === "ASSET_TRANSFER_DEPARTMENT_LOCKED" || payload?.code === "ASSET_CHANGED_DURING_OPERATION") {',
    "setReviewOpen(false)",
    "if (values.asset) await loadAssetDetail(values.asset.id, Boolean(transferChange.destinations.toCustodianId))",
    'throw new Error(payload?.code ?? payload?.error ?? tCommon("error"))',
  ])
  assert.ok(save.includes("apiError.toast(error)"))
})

test("section 3: the reason chips write their word at the start and focus the text; อื่น ๆ only focuses; the reason field and หมายเหตุ as before (spec §9.3, §9.4, P3-R16)", () => {
  const form = read(FORM)
  has(form, [
    'const chipWords: TransferChipWords = { branch: t("reasonChipBranch"), user: t("reasonChipUser"), restructure: t("reasonChipRestructure") }',
    "const pressedChip = pressedTransferReasonChip(values.reason, chipWords)",
    'const TRANSFER_CHIP_PRESSED_CLASSES = "border-primary bg-primary-soft font-semibold text-primary-hover hover:bg-primary-soft"',
    '<div role="group" aria-label={t("reason")} aria-describedby="transfer-reason-chips-hint" data-transfer-reason-chips className="grid gap-2">',
    "{TRANSFER_REASON_CHIPS.map((chip) => (",
    '{pressedChip === chip ? <Check aria-hidden="true" /> : null}',
    '<span className="lg:hidden">{t("reasonChipRestructureShort")}</span>',
    '<span className="max-lg:hidden">{chipWords.restructure}</span>',
    'chip === "other" ? t("reasonChipOther") : chipWords[chip]',
    '<p id="transfer-reason-chips-hint" className="text-meta text-muted-foreground">{t("reasonChipHint")}</p>',
    'if (chip !== "other") setField("reason", applyTransferReasonChip(values.reason, chip, chipWords))',
    "const input = document.getElementById(FIELD_IDS.reason)",
    "if (!(input instanceof HTMLInputElement)) return",
    "focusField(input)",
    "input.setSelectionRange(input.value.length, input.value.length)",
    '<Textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={4} className="min-h-28" />',
  ])
  assert.match(form, /<Button\n\s+key=\{chip\}\n\s+variant="outline"\n\s+size="sm"\n\s+aria-pressed=\{pressedChip === chip\}\n\s+data-transfer-reason-chip=\{chip\}\n\s+className=\{cn\(pressedChip === chip && TRANSFER_CHIP_PRESSED_CLASSES\)\}\n\s+onClick=\{\(\) => chooseReasonChip\(chip\)\}\n\s+>/)
  const group = form.slice(at(form, "data-transfer-reason-chips"), at(form, '<Field label={t("reason")} id="transfer-reason"'))
  assert.ok(group.length > 0)
  assert.doesNotMatch(group, /<Input\b|id="transfer-reason"/)
  assert.doesNotMatch(form, /\.slice\(0, 500\)|\.substring\(0, 500\)/)
})

test("the phone: the footer's line is the lead, and the card's warnings show above the bar below lg only (spec §9.4, P3-R12, P3-R13, P3-R23)", () => {
  const form = read(FORM)
  has(form, ['const isDesktop = useMediaQuery("(min-width: 64rem)")'])
  assert.match(form, /description: \(\n\s+<>\n\s+<span data-transfer-footer="desktop" className="max-lg:hidden">\{footerLine\}<\/span>\n\s+<span data-transfer-footer="phone" className="lg:hidden">\{transferLead \?\? footerLine\}<\/span>\n\s+<\/>\n\s+\),/)
  assert.match(form, /\{!isDesktop && summaryWarnings\.length > 0 \? \(\n\s+<div data-transfer-phone-warnings className="grid gap-2 lg:hidden">\n\s+\{summaryWarnings\.map\(\(warning, index\) => \(\n\s+<Notice key=\{index\} tone="warning">[\s\S]*?\) : null\}\n\s+<\/OperationFormFrame>/)
  assert.equal(count(form, "isDesktop"), 2, "the media query serves only the warnings block")
})

const WORDS: Record<string, { th: string; en: string }> = {
  "transfer.description": { th: "เปลี่ยนที่ตั้ง ผู้ถือครอง หรือแผนกของทรัพย์สิน 1 รายการ เลือกเปลี่ยนเฉพาะสิ่งที่ต้องการ", en: "Change the location, holder or department of one asset. Change only what you need." },
  "transfer.sectionAsset": { th: "ทรัพย์สิน", en: "Asset" },
  "transfer.sectionChanges": { th: "เปลี่ยนอะไร", en: "What changes" },
  "transfer.sectionChangesHint": { th: "เลือกอย่างน้อย 1 อย่าง", en: "Choose at least one" },
  "transfer.sectionReason": { th: "เหตุผล", en: "Reason" },
  "transfer.columnItem": { th: "รายการ", en: "Item" },
  "transfer.columnNow": { th: "ตอนนี้", en: "Now" },
  "transfer.columnTarget": { th: "ปลายทาง", en: "Destination" },
  "transfer.followsHolder": { th: "ตามผู้ถือครอง: {department}", en: "Follows the holder: {department}" },
  "transfer.departmentChooseAssetFirst": { th: "เลือกทรัพย์สินก่อน", en: "Choose the asset first" },
  "transfer.componentsMove": { th: "ส่วนควบ {count} รายการ ({list}) ย้ายตามไปด้วย", en: "{count, plural, one {# component ({list}) moves with it} other {# components ({list}) move with it}}" },
  "transfer.componentsStaying": { th: "ส่วนควบที่มีใบส่งมอบของตัวเองไม่ย้ายตาม: {list}", en: "Components with their own handover do not move: {list}" },
  "transfer.componentsOutstanding": { th: "ส่วนควบค้างคืน {count} รายการ ไม่ย้ายตาม: {list}", en: "{count, plural, one {# outstanding component does not move: {list}} other {# outstanding components do not move: {list}}}" },
  "transfer.reasonChipBranch": { th: "ย้ายสาขา", en: "Branch move" },
  "transfer.reasonChipUser": { th: "เปลี่ยนผู้ใช้งาน", en: "New user" },
  "transfer.reasonChipRestructure": { th: "ปรับโครงสร้างแผนก", en: "Department restructure" },
  "transfer.reasonChipRestructureShort": { th: "ปรับโครงสร้าง", en: "Restructure" },
  "transfer.reasonChipOther": { th: "อื่น ๆ", en: "Other" },
  "transfer.reasonChipHint": { th: "กดปุ่มเพื่อเติมข้อความตั้งต้น แล้วแก้ต่อได้", en: "Press a button to start the text, then edit it" },
  "transfer.summaryLead": { th: "เปลี่ยน {count} อย่าง: {list}", en: "{count, plural, one {# change} other {# changes}}: {list}" },
  "transfer.summaryHolderDepartmentKept": { th: "ผู้ถือครองและแผนกคงเดิม", en: "Holder and department unchanged" },
  "transfer.summaryComponentsMove": { th: "ย้ายตาม {count} รายการ", en: "{count, plural, one {# moves with it} other {# move with it}}" },
  "transfer.summaryCrossBranch": { th: "ย้ายไปสาขาอื่น รหัสทรัพย์สินยังเป็นของ {branch} ตามเดิม", en: "Moving to another branch: the asset code stays with {branch}" },
  "transfer.summaryFootnote": { th: "เลขเอกสารโอนย้ายออกให้หลังบันทึก แล้วเปิดเอกสารให้พิมพ์ทันที", en: "The transfer document number is issued on saving, and the document opens for printing." },
  "transfer.footerDescription": { th: "โอนย้าย {tag}: {changes}", en: "Transfer {tag}: {changes}" },
  "transfer.footerIncomplete": { th: "เลือกทรัพย์สินและสิ่งที่จะเปลี่ยน", en: "Choose the asset and what changes" },
  "transfer.checkChange": { th: "เปลี่ยนอย่างน้อย 1 อย่าง", en: "At least one change" },
}

test("the words: the new transfer keys in Thai and English, and none of the keys the rulings reuse instead (spec §9, §13; Y1, Y6, Y7)", () => {
  assert.equal(Object.keys(WORDS).length, 27)
  for (const locale of ["th", "en"] as const) {
    const all = messages(locale)
    for (const [key, value] of Object.entries(WORDS)) {
      const [ns, name] = key.split(".")
      assert.equal(all[ns][name], value[locale], `${locale}.${key}`)
    }
    assert.equal(all.transfer.nowPending, undefined)
    assert.equal(all.transfer.summaryComponentsOutstanding, undefined)
    assert.equal(all.transfer.detailReadFailed, undefined)
    assert.equal(all.assetOperation.currentMark, undefined)
  }
})
