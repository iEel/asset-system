import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// บันทึกซ่อม (MT-New, group 5 spec §7, plan 2 Task 3). The working tree is CRLF on Windows: every read strips \r.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const FORM = "src/components/maintenance/repair-record-form.tsx"
const PAGE = "src/app/[locale]/(dashboard)/maintenance/new/page.tsx"
const CARD = "src/components/maintenance/repair-asset-card.tsx"
const HELD = "src/components/maintenance/repair-held-notice.tsx"
const SUMMARY = "src/components/maintenance/repair-create-summary.tsx"

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix]
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key))
    .sort()
}

test("Thai and English repair record copy has matching keys", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.ok(th.repairRecord, "messages/th.json needs a repairRecord namespace")
  assert.deepEqual(leafKeys(th.repairRecord), leafKeys(en.repairRecord))
})

test("the repair form sends one record built by the form rules, with no answer chosen for the user (spec §5 No default answer)", () => {
  const source = read(FORM)
  assert.match(source, /fetch\("\/api\/maintenance-tickets"/)
  assert.ok(source.includes("body: JSON.stringify(buildRepairCreatePayload(values, { planId: plan?.id ?? null, needsReporter }))"))
  // No default answer: the done question starts empty, except ซ่อมเสร็จแล้ว on the PM path; the result always starts empty.
  assert.doesNotMatch(source, /done: true,/)
  assert.ok(source.includes("done: plan ? true : null,"))
  assert.ok(source.includes("outcome: null,"))
  assert.doesNotMatch(source, /toISOString\(\)\.slice\(0, 10\)/)
  assert.doesNotMatch(source, /assignedToId|dueDate|laborCost|partsCost|warrantyClaim/)
  assert.ok(source.includes("const validate = () => validateRepairForm(values, { needsReporter, todayKey: latestTodayKey() })"))
  assert.ok(source.includes("fieldErrors.setErrors(validate())"))
})

test("the repair form localizes API error codes and links to an unfinished record", () => {
  const source = read(FORM)
  assert.match(source, /getMaintenanceErrorMessage\(payload\?\.code, tMaintenance/)
  assert.match(source, /MAINTENANCE_OPEN_RECORD_EXISTS/)
  assert.match(source, /status=in_progress/)
})

test("files picked in the form upload after the record is saved, before or after repair by the answer", () => {
  const source = read(FORM)
  const upload = read("src/components/maintenance/repair-record-upload.ts")
  assert.ok(source.includes('uploadRepairFiles(payload.id, files, values.done ? "after_repair" : "before_repair")'))
  assert.match(upload, /\/api\/maintenance-tickets\/\$\{recordId\}\/attachments/)
  assert.ok(source.includes('description={t(values.done === true ? "filesHelpDone" : "filesHelp")}'), "the hint by the answer (spec §7.4)")
})

test("the reporter picker appears only for accounts without an employee; the footnote names the signed-in employee", () => {
  const page = read(PAGE)
  const form = read(FORM)
  assert.match(page, /needsReporter=\{!user\.employeeId\}/)
  assert.match(form, /needsReporter \?/)
  assert.ok(page.includes("prisma.employee.findFirst({ where: { id: user.employeeId }, select: { fullNameTh: true } })"))
  assert.ok(form.includes('needsReporter ? t("createForm.footnotePicked") : t("createForm.footnote", { name: reporterName })'))
})

test("recording PM from a plan pre-fills the plan and its asset, with the plan's date and rhythm for the summary", () => {
  const page = read(PAGE)
  assert.match(page, /planId/)
  assert.match(page, /planState: "active"/)
  assert.ok(page.includes("nextDueDate: true, frequency: true, intervalDays: true"))
})

test("the page reads the asset facts once, the status names, the return permission and Bangkok today (G5P2-R1, R7)", () => {
  const page = read(PAGE)
  assert.ok(page.includes("loadRepairAssetFacts(prisma as unknown as RepairAssetFactsDb, assetId)"))
  assert.ok(page.includes("prisma.assetStatus.findMany({ where: { isActive: true }, select: { name: true, nameTh: true } })"))
  assert.ok(page.includes('canReturn={hasPermission(user, "asset", "edit")}'))
  assert.ok(page.includes("todayKey={getBangkokDateKey(new Date())}"))
  // The breadcrumbs and the back link go to the frame through the form.
  assert.ok(page.includes('breadcrumbs={[{ label: t("title"), href: maintenanceListCrumbHref(returnTo, `/${locale}/maintenance`) }, { label: t("createTitle") }]}'))
  assert.ok(page.includes('back={<PageBackLink href={returnTo} label={tCommon("back")} />}'))
  assert.doesNotMatch(page, /<PageHeader\b/, "the frame renders the header")
})

test("the form is the operation frame: breadcrumbs, three numbered sections, the summary card and the footer (spec §7.1)", () => {
  const source = read(FORM)
  assert.ok(source.includes('import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"'))
  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate id=\{REPAIR_FORM_ID\}>\n\s+<OperationFormFrame\n\s+title=\{t\("createTitle"\)\}\n\s+description=\{plan \? t\("pmCreateSubtitle"\) : t\("createSubtitle"\)\}\n\s+breadcrumbs=\{breadcrumbs\}\n\s+back=\{back\}\n/)
  assert.equal(source.match(/<FormSection number=\{\d\}/g)?.length, 3)
  for (const [number, key] of [[1, "sectionAsset"], [2, "sectionProgress"], [3, "sectionDetails"]] as const) {
    assert.ok(source.includes(`<FormSection number={${number}} title=`) && source.includes(`t("createForm.${key}")`), key)
  }
  assert.ok(source.includes('<span className="font-normal text-muted-foreground">{t("createForm.optional")}</span>'), "section 3 says ไม่บังคับ")
  // The summary column is its own file next to the form (the form would pass ~450 lines).
  assert.match(source, /summary=\{<RepairCreateSummary\n/)
  const summary = read(SUMMARY)
  assert.match(summary, /<OperationSummaryCard\n/)
  assert.ok(summary.includes("buildRepairCreateSummary({"))
  // "ถ้าตอบว่าซ่อมเสร็จแล้ว" (G5P2-R3) goes through the card's afterRows slot, between the rows and the checklist
  // (spec §7.5); the footnote is the plain footnote text.
  assert.match(summary, /afterRows=\{summary\.ifDone \? \(\n\s+<div data-repair-if-done className="grid gap-1 text-sm text-foreground">/)
  assert.ok(summary.includes("footnote={footnote}"))
  assert.doesNotMatch(summary, /footnote=\{\(/)
  assert.ok(summary.includes('t("createForm.ifDoneTitle")'))
  assert.ok(source.includes('submitLabel: t("save"),'))
  assert.ok(source.includes("formId: REPAIR_FORM_ID,"))
  assert.ok(source.includes("cancelHref: returnTo,"))
  assert.ok(source.includes("repairFooterAnswerKey(values)"))
  // Section 3 is open (spec call 10): no toggle.
  assert.doesNotMatch(source, /showDetails|aria-expanded|moreDetails|ContentPanel/)
})

test("the date is not after Bangkok today, and the done question asks with two described cards", () => {
  const source = read(FORM)
  assert.match(source, /<Field label=\{t\("date"\)\} id="repair-record-date" required error=\{fieldErrors\.message\("reportedDate"\)\}>\n\s+<Input type="date" required max=\{latestTodayKey\(\)\} /)
  assert.ok(source.includes("reportedDate: todayKey,"))
  assert.ok(source.includes('description={t("doneYesHelp")}'))
  assert.ok(source.includes('description={t("doneNoHelp")}'))
  assert.ok(source.includes('hint={plan ? undefined : t("createForm.noDefault")}'), "ระบบไม่เลือกไว้ให้ off the PM path")
  assert.ok(source.includes('checked={values.done === true}'))
  assert.ok(source.includes('checked={values.done === false}'))
})

test("the facts fetch after a pick is aborted on change and ignores an answer for another asset (Review Focus 2)", () => {
  const source = read(FORM)
  assert.match(source, /const controller = new AbortController\(\)/)
  assert.ok(source.includes("`/api/maintenance-options?type=asset&id=${encodeURIComponent(assetId)}`"))
  assert.ok(source.includes("{ signal: controller.signal }"))
  assert.ok(source.includes("if (controller.signal.aborted) return"))
  assert.ok(source.includes("if (option?.facts?.id !== assetId) return setFactsFailedFor(assetId)"))
  assert.ok(source.includes("return () => controller.abort()"))
  assert.ok(source.includes("const currentFacts = facts?.id === values.assetId ? facts : null"))
})

test("the status line and the refusals come from the outlook (spec §7.3)", () => {
  const source = read(FORM)
  assert.ok(source.includes("getRepairCreateOutlook(currentFacts, { done: values.done, outcome: values.outcome })"))
  assert.match(source, /data-repair-status-line/)
  assert.ok(source.includes('outlook.error === "MAINTENANCE_ASSET_ON_LOAN"'))
  assert.ok(source.includes('outlook.error === "MAINTENANCE_ASSET_INELIGIBLE"'))
  assert.ok(source.includes('<RepairHeldNotice held={outlook.held} assetId={currentFacts.id} locale={locale} canReturn={canReturn} hint={t("createForm.heldHint")} />'))
  assert.ok(source.includes('t("createForm.untilDone")'))
  assert.ok(source.includes('"createForm.statusStays"'))
})

test("the asset card: photo, name, tag, badge, holder line, the eligibility line with the record link, an optional เปลี่ยน (G5P2-R8, R9)", () => {
  const source = read(CARD)
  assert.match(source, /export function RepairAssetCard\(\{ facts, locale, returnTo, onChange, fieldId \}/)
  assert.ok(source.includes("<AssetThumbnail photo={facts.photo} assetTag={facts.assetTag} assetName={facts.name} size={44} />"))
  assert.ok(source.includes("<StatusBadge label={facts.statusLabel} tone={getAssetStateTone(facts.statusName)} />"))
  assert.ok(source.includes("data-repair-eligibility={eligibility}"))
  assert.ok(source.includes("getRepairEligibility(facts)"))
  assert.ok(source.includes("appendOperationalReturnTo(`/${locale}/maintenance/${facts.openRecord.id}`, returnTo)"))
  assert.ok(source.includes('{onChange ? ('), "เปลี่ยน only when given")
  assert.ok(source.includes('t("createForm.noHolder")'))
  assert.doesNotMatch(source, /border-dashed|dark:|#[0-9a-f]{3,6}\b|rgba?\(/i)
  const form = read(FORM)
  assert.ok(form.includes("onChange={plan ? undefined : clearAsset}"), "hidden on the PM path")
})

test("the held notice: warning tone, the text by its document, รับคืน only with asset:edit (Review Focus 4, 5)", () => {
  const source = read(HELD)
  assert.match(source, /export function RepairHeldNotice\(\{ held, assetId, locale, canReturn, hint \}/)
  assert.match(source, /<Notice\n\s+tone="warning"\n\s+data-repair-held\n/)
  assert.ok(source.includes('held.documentNo\n    ? t("createForm.heldWithDocument", { holder, documentNo: held.documentNo })\n    : t("createForm.heldNoDocument", { holder })'))
  assert.ok(source.includes("action={canReturn ? ("))
  assert.ok(source.includes('buildAssetRegisterTransactionHref(locale, assetId, "checkin", `/${locale}/assets/${assetId}`, held.checkoutId)'))
})

test("the words of บันทึกซ่อม (spec §13 repairRecord (new))", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.repairRecord.save, "บันทึกซ่อม")
  assert.equal(th.repairRecord.doneNo, "ยังซ่อมไม่เสร็จ")
  assert.equal(th.repairRecord.doneNoHelp, 'ส่งซ่อม / รออะไหล่ · กด "ซ่อมเสร็จ" ทีหลังที่หน้าบันทึก')
  assert.equal(th.repairRecord.doneYesHelp, "ต้องเลือกผลการซ่อมต่อ: ใช้งานได้ หรือ ซ่อมไม่ได้ เสนอจำหน่าย")
  assert.equal(th.repairRecord.createSubtitle, "บันทึกว่าซ่อมอะไร เมื่อไหร่ และผลเป็นอย่างไร เมื่อบันทึกแล้วระบบจะออกเลขที่บันทึกให้")
  assert.equal(th.repairRecord.filesHelp, "ระบบจะอัปโหลดหลังบันทึก · ตอนยังไม่เสร็จนับเป็นรูปก่อนซ่อม")
  assert.equal(th.repairRecord.filesHelpDone, "ระบบจะอัปโหลดหลังบันทึก · นับเป็นรูปหลังซ่อม")
  const form = th.repairRecord.createForm
  assert.equal(form.dependsOnOutcome, "ขึ้นกับผลการซ่อม")
  assert.equal(form.dependsOnAnswer, "ขึ้นกับคำตอบ ซ่อมเสร็จหรือยัง")
  assert.equal(form.eligibleOk, "ไม่มีบันทึกซ่อมที่ยังไม่เสร็จ บันทึกใหม่ได้")
  assert.equal(form.eligibleOpenRecord, "มีบันทึกซ่อมที่ยังไม่เสร็จ {repairNo}")
  assert.equal(form.heldWithDocument, "อยู่กับ {holder} ตามใบส่งมอบ {documentNo} ต้องรับคืนก่อน")
  assert.equal(form.heldNoDocument, "อยู่กับ {holder} ตามใบส่งมอบที่ยังไม่รับคืน ต้องรับคืนก่อน")
  assert.equal(form.noDefault, "ระบบไม่เลือกไว้ให้")
  assert.equal(th.apiErrors.repairDoneRequired, "เลือกว่าซ่อมเสร็จหรือยัง")
  assert.equal(th.apiErrors.repairOutcomeRequired, "เลือกผลการซ่อม")
  assert.equal(typeof en.apiErrors.repairDoneRequired, "string")
  assert.equal(th.repairRecord.assetStatusEffect, undefined)
  assert.equal(th.repairRecord.moreDetails, undefined)
})

// Closing a repair sets the asset's condition (group 3 spec §19.4): ใช้งานได้ asks สภาพหลังซ่อม (ดี/พอใช้) with the
// shared condition chips, ซ่อมไม่ได้ says the condition becomes ซาก, and the pages pass the options and the start.
test("the complete dialog and the record form ask the condition after a usable repair and say ซาก for one beyond repair", () => {
  for (const [path, id, hook, usable, beyond] of [
    ["src/components/maintenance/repair-record-actions.tsx", "repair-complete-condition", "completeErrors", 'complete.outcome === "usable"', 'complete.outcome === "beyond_repair"'],
    [FORM, "repair-create-condition", "fieldErrors", 'values.done === true && values.outcome === "usable"', 'values.outcome === "beyond_repair"'],
  ] as const) {
    const source = read(path)
    assert.match(source, /import \{ AssetConditionChoice \} from "@\/components\/asset-operations\/condition-choice"/, path)
    const choice = source.match(/<AssetConditionChoice\n([\s\S]*?)\n\s+\/>/)
    assert.ok(choice, path)
    for (const prop of [`id="${id}"`, 'legend={t("conditionAfterRepair")}', "options={conditionOptions}", "required", `error={${hook}.message("conditionId")}`]) {
      assert.ok(choice[1].includes(prop), `${path}: ${prop}`)
    }
    assert.ok(source.includes(`{${usable} ? (\n`), `${path}: only a usable repair asks it`)
    // The ซาก line is the outcome group's hint, so the group's aria-describedby reads it with the choice (final review M9).
    assert.ok(source.includes(`hint={${beyond} ? t("conditionBecomesSalvage") : undefined}`), `${path}: the ซาก line`)
    assert.doesNotMatch(source, /<p className="text-sm text-muted-foreground">\{t\("conditionBecomesSalvage"\)\}<\/p>/, path)
    assert.ok(source.includes("conditionOptions: Option[]\n  initialConditionId: string"), `${path}: the props`)
  }
  for (const path of ["src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx", PAGE]) {
    const source = read(path)
    assert.match(source, /getRepairConditionOptions\(/, path)
    assert.match(source, /orderBy: \{ sortOrder: "asc" \}/, path)
    assert.match(source, /initialConditionId=\{repairConditionDefault\(/, path)
  }
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.repairRecord.conditionAfterRepair, "สภาพหลังซ่อม")
  assert.equal(en.repairRecord.conditionAfterRepair, "Condition after repair")
  assert.equal(th.repairRecord.conditionBecomesSalvage, "สภาพของทรัพย์สินจะเปลี่ยนเป็น ซาก")
  assert.equal(en.repairRecord.conditionBecomesSalvage, "The asset's condition becomes Salvage.")
  assert.equal(th.apiErrors.conditionAfterRepairRequired, "เลือกสภาพหลังซ่อม")
  assert.equal(en.apiErrors.conditionAfterRepairRequired, "Choose the condition after repair.")
  assert.equal(th.apiErrors.invalidConditionAfterRepair, "สภาพนี้ใช้หลังซ่อมไม่ได้ เลือก ดี หรือ พอใช้")
  assert.equal(en.apiErrors.invalidConditionAfterRepair, "Choose Good or Fair after a repair.")
})

test("an asset picked on the record form pre-chooses ดี or พอใช้ from its own condition (final review M1)", () => {
  const form = read(FORM)
  assert.ok(form.includes('import { repairConditionDefault } from "@/lib/asset-lifecycle-policy"'))
  assert.ok(form.includes('setField("conditionId", repairConditionDefault(option?.conditionId ?? null, conditionOptions))'))
  const select = read("src/components/maintenance/maintenance-option-select.tsx")
  assert.ok(select.includes("onChange: (value: string, option?: MaintenanceOption) => void"))
  assert.ok(select.includes("conditionId?: string"))
})

test("focus follows the picked asset to its card, never on a page load (final review 2)", () => {
  const source = read(FORM)
  const card = read(CARD)
  assert.ok(card.includes("<div id={fieldId} tabIndex={-1} data-repair-asset-card"), "the card takes focus")
  assert.ok(source.includes("const focusCardAfterPick = useRef(false)"))
  // Only the picker's onChange arms it: a load with ?assetId= or ?planId= renders the card with the flag off.
  assert.equal(source.match(/focusCardAfterPick\.current = value !== ""/g)?.length, 1)
  assert.match(source, /onChange=\{\(value, option\) => \{\n\s+focusCardAfterPick\.current = value !== ""/)
  assert.match(source, /if \(!currentFacts \|\| !focusCardAfterPick\.current\) return\n\s+focusCardAfterPick\.current = false\n\s+window\.requestAnimationFrame\(\(\) => document\.getElementById\(repairFieldIds\.assetId\)\?\.focus\(\)\)/)
})

test("the status line is announced from an always-mounted polite region (final review 3)", () => {
  const source = read(FORM)
  assert.ok(source.includes('<div role="status" aria-live="polite" data-repair-status-region className="mt-5 empty:mt-0">\n            {statusLine()}\n          </div>'))
  assert.equal(source.match(/\{statusLine\(\)\}/g)?.length, 1)
})

test("the open-record alert belongs to its asset, and the refusal reloads the facts (final review 4)", () => {
  const source = read(FORM)
  assert.ok(source.includes("{openRecordAssetId && openRecordAssetId === values.assetId ? ("))
  assert.match(source, /function clearAsset\(\) \{\n\s+setOpenRecordAssetId\(null\)/)
  assert.ok(source.includes('if (payload?.code === "MAINTENANCE_OPEN_RECORD_EXISTS") {\n          setOpenRecordAssetId(values.assetId)\n          setFacts(null)\n        }'))
  const pick = source.slice(source.indexOf("onChange={(value, option) => {"), source.indexOf("onChange={(value, option) => {") + 400)
  assert.ok(pick.includes("setOpenRecordAssetId(null)"), "a new pick clears it")
})

test("a failed facts read warns and can be retried (final review 5)", () => {
  const source = read(FORM)
  assert.ok(source.includes("const [factsFailedFor, setFactsFailedFor] = useState<string | null>(null)"))
  assert.ok(source.includes("const [factsAttempt, setFactsAttempt] = useState(0)"))
  assert.ok(source.includes("}, [facts?.id, values.assetId, factsAttempt])"))
  assert.ok(source.includes("setFactsFailedFor(assetId)"))
  assert.match(source, /<Notice\n\s+tone="warning"\n\s+role="status"\n\s+data-repair-facts-failed\n/)
  assert.ok(source.includes('{t("createForm.factsFailed")}'))
  assert.ok(source.includes('{tCommon("tryAgain")}'))
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.repairRecord.createForm.factsFailed, "โหลดข้อมูลทรัพย์สินไม่สำเร็จ")
  assert.equal(en.repairRecord.createForm.factsFailed, "The asset's details could not be loaded")
  assert.equal(th.repairRecord.createForm.recordHasOpen, "มีที่ค้าง {repairNo}")
  assert.equal(en.repairRecord.createForm.recordHasOpen, "Open: {repairNo}")
})

test("today is the later of the server's day and the browser's Bangkok day, for the check and the max (final review 6)", () => {
  const source = read(FORM)
  assert.ok(source.includes('import { getBangkokDateKey, type MaintenancePlanFrequency } from "@/lib/preventive-maintenance"'))
  assert.ok(source.includes("const latestTodayKey = () => {\n    const now = getBangkokDateKey(new Date())\n    return now > todayKey ? now : todayKey\n  }"))
  assert.ok(source.includes("const validate = () => validateRepairForm(values, { needsReporter, todayKey: latestTodayKey() })"))
  assert.ok(source.includes("max={latestTodayKey()}"))
})

test("the two-column rows wait for room: one column beside the summary at lg, two again at xl (look step)", () => {
  const source = read(FORM)
  // The frame puts the 20rem summary beside the main column from lg (lg:grid-cols-[minmax(0,1fr)_20rem]), so at 1024
  // the main column is ~330 px: the rows are one column there and come back at xl.
  assert.ok(source.includes('<div className="grid gap-5 md:grid-cols-[minmax(0,220px)_1fr] lg:grid-cols-1 xl:grid-cols-[minmax(0,220px)_1fr]">'))
  assert.ok(source.includes('<div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">'))
  assert.ok(source.includes('<div className="grid gap-4 md:grid-cols-2">'), "two fields keep ~150 px each at 1024")
  assert.ok(read("src/components/asset-operations/operation-form-frame.tsx").includes("lg:grid-cols-[minmax(0,1fr)_20rem]"))
})

test("the summary's status badges wrap instead of cutting the Thai name (look step)", () => {
  const summary = read(SUMMARY)
  assert.match(summary, /<StatusBadge wrap label=\{statusLabels\[name\]/)
  const badge = read("src/components/ui/status-badge.tsx")
  assert.ok(badge.includes("wrap?: boolean"))
  assert.ok(badge.includes('wrap && "h-auto min-h-5.5 whitespace-normal"'))
  assert.ok(badge.includes('<span className={wrap ? "min-w-0 break-words" : "min-w-0 truncate"}>{label}</span>'), "the default still truncates")
})
