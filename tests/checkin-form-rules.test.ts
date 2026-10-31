import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  buildCheckinChecklist, buildCheckinSummaryRows, checkinAutoNextStatus, checkinBangkokDay, checkinComponents,
  checkinHeldDays, checkinNextStatusOptions, checkinTodayDay, checkinWarningLines,
  type CheckinFormChoice, type CheckinSummaryRow, type CheckinSummaryWords, type CheckinWarningWords,
} from "../src/lib/checkin-form-rules.ts"
import type { AssetOperationChosenDetail, AssetOperationSearchRow } from "../src/lib/asset-operation-search-rules.ts"

// รับคืน's pure rules (group 3 plan 2 Task 8, spec §8.1-8.4): the สรุปก่อนบันทึก rows and checklist, the components that
// come back, หลังรับคืนให้เป็น and its auto-pick, the days held and the warning lines; then the form's and the page's
// source and the words. The handover day and the legacy mark are T2's (tests/checkin-route-rules.test.ts).
const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")
const handover = { id: "co-1", documentNo: "HO-202610-0012", checkoutType: "user", handoverMode: "permanent_assignment", checkoutDate: "2026-10-01T02:00:00.000Z",
  expectedReturnDate: null, conditionBefore: "c-good", remark: null, destinationLabel: "E001 - สมชาย ใจดี" }
const adapter = { id: "k1", assetTag: "NB-0017-01", name: "Adapter 65W", travels: true, locationLabel: "HQ-01 - คลัง IT" }
const mouse = { id: "k2", assetTag: "NB-0017-02", name: "Mouse ไร้สาย", travels: true, locationLabel: "HQ-01 - คลัง IT" }
const dock = { id: "k3", assetTag: "NB-0017-03", name: "Dock", travels: false, locationLabel: "BR-02 - ห้อง 2" }
function row(o: Partial<AssetOperationSearchRow> = {}, d: Partial<AssetOperationChosenDetail> = {}): AssetOperationSearchRow {
  return {
    id: "a1", assetTag: "NB-0017", name: "Notebook", serialNumber: "SN-1", statusLabel: "ใช้งานอยู่", placeLabel: "E001 - สมชาย ใจดี",
    locationLabel: "HQ-01 - คลัง IT", currentLocationId: "l1", conditionId: "c-na", eligible: true, reasonKey: null, photo: null,
    checkout: handover, holderKey: "e1", holderLabel: "E001 - สมชาย ใจดี", holderEmployeeId: "e1",
    detail: { ownership: "personal", statusName: "In Use", departmentId: "d-acc", departmentLabel: "ACC - บัญชี", departmentName: "บัญชี",
      holderLabel: "E001 - สมชาย ใจดี", holderName: "สมชาย ใจดี", ownerBranchLabel: "สำนักงานใหญ่", locationBranchLabel: "สำนักงานใหญ่", components: [], ...d },
    ...o,
  }
}
const statuses = [{ id: "s-ready", label: "พร้อมใช้งาน", name: "Ready" }, { id: "s-um", label: "อยู่ระหว่างซ่อม", name: "Under Maintenance" }, { id: "s-pd", label: "รอตัดจำหน่าย", name: "Pending Disposal" }]
const [ready, repair, disposal] = statuses
const itDept = { id: "d-it", code: "IT", name: "Information Technology" }
const room = { id: "l2", label: "BR-02 - ห้อง 2", name: "ห้อง 2" }
const good = { id: "c-good", label: "ดี", name: "Good" }
const conditionLabels = { "c-na": "ยังไม่ประเมิน", "c-good": "ดี" }
const choose = (o: Partial<CheckinFormChoice> = {}): CheckinFormChoice =>
  ({ row: row(), returnDepartment: itDept, status: null, location: null, condition: null, conditionLabels, unticked: new Set(), ...o })
const words: CheckinSummaryWords = { holder: "ผู้ถือครอง", department: "แผนก", status: "สถานะ", location: "ที่ตั้ง", condition: "สภาพ", components: "ส่วนควบ",
  none: "ไม่มี", notChosen: "ยังไม่ได้เลือก", count: (n) => `${n} รายการ`, componentsBack: (r, m) => `ได้คืน ${r} · ขาด ${m}` }
const pick = (rows: CheckinSummaryRow[]) => rows.map(({ key, now, next, changed }) => [key, now, next, changed])

test("บุคคล: the holder goes, the return department, the chosen status, room and condition, and the components back and missing (spec §8.4, §6)", () => {
  const rows = buildCheckinSummaryRows(choose({ row: row({}, { components: [adapter, mouse, dock] }), status: ready, location: room, condition: good, unticked: new Set(["k2", "k3"]) }), words)
  assert.deepEqual(rows.map((r) => r.label), ["ผู้ถือครอง", "แผนก", "สถานะ", "ที่ตั้ง", "สภาพ", "ส่วนควบ"])
  assert.deepEqual(pick(rows), [["holder", "สมชาย ใจดี", "ไม่มี", true], ["department", "บัญชี", "Information Technology", true],
    ["status", "ใช้งานอยู่", "พร้อมใช้งาน", true], ["location", "HQ-01 - คลัง IT", "BR-02 - ห้อง 2", true],
    ["condition", "ยังไม่ประเมิน", "ดี", true], ["components", "2 รายการ", "ได้คืน 1 · ขาด 1", true]])
})
test("ส่วนกลาง, ส่วนควบ and License keep their department; an IT asset stays plain; no return department promises nothing; ส่งซ่อม reads the status name (P2-R7, P2-R8, P2-R9)", () => {
  for (const ownership of ["shared", "component", "software_license"] as const)
    assert.deepEqual(pick(buildCheckinSummaryRows(choose({ row: row({}, { ownership }) }), words))[1], ["department", "บัญชี", "บัญชี", false], ownership)
  assert.deepEqual(pick(buildCheckinSummaryRows(choose({ row: row({}, { departmentId: "d-it", departmentName: "Information Technology" }) }), words))[1],
    ["department", "Information Technology", "Information Technology", false])
  assert.deepEqual(pick(buildCheckinSummaryRows(choose({ returnDepartment: null }), words))[1], ["department", "บัญชี", "บัญชี", false])
  assert.deepEqual(pick(buildCheckinSummaryRows(choose({ status: repair }), words))[2], ["status", "ใช้งานอยู่", "อยู่ระหว่างซ่อม", true])
})
test("nothing promised before it is chosen, no components row when none travel, never a condition id, no rows without the detail (spec §4 anti-goal)", () => {
  assert.deepEqual(pick(buildCheckinSummaryRows(choose({ row: row({}, { holderLabel: null, holderName: null, components: [dock] }) }), words)), [
    ["holder", "ไม่มี", "ไม่มี", false], ["department", "บัญชี", "Information Technology", true], ["status", "ใช้งานอยู่", "ยังไม่ได้เลือก", false],
    ["location", "HQ-01 - คลัง IT", "ยังไม่ได้เลือก", false], ["condition", "ยังไม่ประเมิน", "ยังไม่ได้เลือก", false]])
  assert.deepEqual(pick(buildCheckinSummaryRows(choose({ row: row({ conditionId: "c-gone" }) }), words))[4], ["condition", "ไม่มี", "ยังไม่ได้เลือก", false])
  assert.deepEqual(buildCheckinSummaryRows(choose({ row: row({ detail: undefined }) }), words), [])
  assert.deepEqual(buildCheckinSummaryRows(choose({ row: null }), words), [])
})
test("หลังรับคืนให้เป็น: ส่งซ่อม only for someone who may open a repair, and alone on a row with an open repair, whoever returns it (spec §5, §8.3, P2-R14)", () => {
  const ids = (input: Parameters<typeof checkinNextStatusOptions>[0]) => checkinNextStatusOptions(input).map((status) => status.id)
  assert.deepEqual(ids({ statuses, repairLocked: false, canCreateRepair: true }), ["s-ready", "s-um", "s-pd"])
  assert.deepEqual(ids({ statuses, repairLocked: false, canCreateRepair: false }), ["s-ready", "s-pd"])
  assert.deepEqual(ids({ statuses, repairLocked: true, canCreateRepair: false }), ["s-um"], "joining an open repair needs only asset:edit")
  assert.deepEqual(ids({ statuses, repairLocked: true, canCreateRepair: true }), ["s-um"])
})
test("the auto-pick fills an empty choice only: damage text, เสียหาย or ใช้งานไม่ได้ pick ส่งซ่อม, ซาก picks รอตัดจำหน่าย, never a status not offered (spec §8.3, P2-R16, P2-R14)", () => {
  const auto = (o: Partial<Parameters<typeof checkinAutoNextStatus>[0]>) =>
    checkinAutoNextStatus({ nextStatusId: "", conditionName: null, damageNote: "", options: statuses, ...o })
  assert.equal(auto({ damageNote: "จอแตก" }), "s-um")
  assert.equal(auto({ damageNote: "   " }), "")
  assert.equal(auto({ conditionName: "Damaged" }), "s-um")
  assert.equal(auto({ conditionName: "Non-functional" }), "s-um")
  assert.equal(auto({ conditionName: "Salvage" }), "s-pd")
  assert.equal(auto({ conditionName: "Salvage", damageNote: "จอแตก" }), "s-pd", "a salvage asset is not repaired")
  assert.equal(auto({ conditionName: "Good" }), "")
  assert.equal(auto({ conditionName: "Damaged", nextStatusId: "s-ready" }), "s-ready", "a choice already made stays")
  const withoutRepair = checkinNextStatusOptions({ statuses, repairLocked: false, canCreateRepair: false })
  assert.equal(auto({ conditionName: "Damaged", options: withoutRepair }), "")
  assert.equal(auto({ damageNote: "จอแตก", options: withoutRepair }), "")
  assert.equal(auto({ conditionName: "Salvage", options: [ready, repair] }), "", "รอตัดจำหน่าย not offered")
})
test("days: Bangkok days, as the route's bound counts them; the days held run to the chosen return date; no handover day (a legacy backfill) and a return before it read none (spec §5, §8.2, P2-R9, P2-R13)", () => {
  assert.equal(checkinTodayDay(new Date("2026-10-31T17:30:00.000Z")), "2026-11-01", "00:30 in Bangkok is the next day")
  assert.equal(checkinTodayDay(new Date("2026-10-31T16:59:59.000Z")), "2026-10-31")
  assert.equal(checkinBangkokDay("2026-10-30T18:30:00.000Z"), "2026-10-31")
  assert.equal(checkinBangkokDay(null), "")
  assert.equal(checkinBangkokDay(""), "")
  assert.equal(checkinBangkokDay("not a date"), "", "no RangeError from getBangkokDateKey")
  assert.equal(checkinHeldDays({ handoverDay: "2026-10-01", returnDay: "2026-10-31" }), 30)
  assert.equal(checkinHeldDays({ handoverDay: "2025-12-31", returnDay: "2026-01-02" }), 2)
  assert.equal(checkinHeldDays({ handoverDay: "2026-10-31", returnDay: "2026-10-31" }), 0)
  assert.equal(checkinHeldDays({ handoverDay: "2026-10-31", returnDay: "2026-10-30" }), null)
  assert.equal(checkinHeldDays({ handoverDay: null, returnDay: "2026-10-31" }), null)
  assert.equal(checkinHeldDays({ handoverDay: "2026-10-01", returnDay: "" }), null)
})
test("the components that travel, and which did not come back; one with its own handover is not listed (spec §8.2, P2-R1)", () => {
  assert.deepEqual(checkinComponents(row({}, { components: [adapter, mouse, dock] }), new Set(["k2", "k3", "gone"])), { travelling: [adapter, mouse], missing: [mouse] })
  assert.deepEqual(checkinComponents(row({ detail: undefined }), new Set(["k1"])), { travelling: [], missing: [] })
  assert.deepEqual(checkinComponents(null, new Set()), { travelling: [], missing: [] })
})
test("still missing: the asset, both people, the condition, หลังรับคืนให้เป็น and the room; the two signatures optional (spec §8.4, P2-R9)", () => {
  const checkWords = { asset: "ทรัพย์สิน", returnBy: "ผู้คืน", receiveBy: "ผู้รับคืน", condition: "สภาพตอนคืน", nextStatus: "หลังรับคืนให้เป็น", location: "เก็บไว้ที่",
    returnSignature: "ลายเซ็นผู้คืน", receiveSignature: "ลายเซ็นผู้รับคืน", signatureMissing: "ยังไม่มี (ไม่บังคับ)" }
  const empty = { row: null, returnBy: "", receiveBy: "", conditionAfter: "", nextStatusId: "", nextLocationId: "", returnSigned: false, receiveSigned: false }
  assert.deepEqual(buildCheckinChecklist(empty, checkWords), [
    { key: "asset", label: "ทรัพย์สิน", done: false }, { key: "returnBy", label: "ผู้คืน", done: false }, { key: "receiveBy", label: "ผู้รับคืน", done: false },
    { key: "condition", label: "สภาพตอนคืน", done: false }, { key: "nextStatus", label: "หลังรับคืนให้เป็น", done: false }, { key: "location", label: "เก็บไว้ที่", done: false },
    { key: "returnSignature", label: "ลายเซ็นผู้คืน", done: false, note: "ยังไม่มี (ไม่บังคับ)" },
    { key: "receiveSignature", label: "ลายเซ็นผู้รับคืน", done: false, note: "ยังไม่มี (ไม่บังคับ)" }])
  const filled = { row: row(), returnBy: "E001 - สมชาย ใจดี", receiveBy: "E002 - ใจดี มาก", conditionAfter: "c-good", nextStatusId: "s-ready", nextLocationId: "l2", returnSigned: true, receiveSigned: true }
  assert.deepEqual(buildCheckinChecklist(filled, checkWords).map((check) => check.done), [true, true, true, true, true, true, true, true])
  assert.equal(buildCheckinChecklist({ ...filled, row: row({ eligible: false, reasonKey: "asset.transactionReasonActiveMaintenance" }) }, checkWords)[0].done, false)
  assert.equal(buildCheckinChecklist({ ...filled, row: row({ checkout: undefined, legacy: true }) }, checkWords)[0].done, false, "a ข้อมูลเก่า row before its backfill")
})
test("warning lines: no return department, each component not back and where it stays, ส่งซ่อม opens or joins a record, a broken asset made พร้อมใช้งาน (spec §8.4, §12, P2-R16)", () => {
  const warn: CheckinWarningWords = { departmentUnavailable: "ยังไม่ได้ตั้งแผนกที่รับคืน",
    missing: (input) => `${input.component} ยังไม่ได้คืน จะอยู่กับ ${input.returner} ที่ ${input.room} และบันทึกเป็นอุปกรณ์ที่ขาดในใบรับคืน`,
    repairOpens: "จะเปิดใบซ่อมให้", repairJoins: (repairNo) => `ต่อใบซ่อม ${repairNo}`,
    brokenReady: "สภาพนี้ส่งมอบต่อไม่ได้จนกว่าจะส่งซ่อม", salvageReady: "ซากรอตัดจำหน่าย ส่งมอบต่อไม่ได้" }
  const lines = (o: Partial<Parameters<typeof checkinWarningLines>[0]>) => checkinWarningLines({ row: row({}, { components: [adapter, mouse] }), returnDepartment: itDept,
    unticked: new Set(), returnerLabel: "E001 - สมชาย ใจดี", status: null, conditionName: null, repairLocked: false, ...o }, warn)
  assert.deepEqual(lines({}), [])
  assert.deepEqual(lines({ returnDepartment: null, unticked: new Set(["k2"]), status: repair }), [
    "ยังไม่ได้ตั้งแผนกที่รับคืน",
    "NB-0017-02 Mouse ไร้สาย ยังไม่ได้คืน จะอยู่กับ E001 - สมชาย ใจดี ที่ HQ-01 - คลัง IT และบันทึกเป็นอุปกรณ์ที่ขาดในใบรับคืน",
    "จะเปิดใบซ่อมให้"])
  assert.deepEqual(lines({ row: row({ openRepair: true, openRepairNo: "RP-202610-0042" }), status: repair, repairLocked: true }), ["ต่อใบซ่อม RP-202610-0042"])
  assert.deepEqual(lines({ row: row({ openRepair: true }), status: repair, repairLocked: true }), [], "without its number the open-repair notice says it")
  assert.deepEqual(lines({ status: ready, conditionName: "Damaged" }), ["สภาพนี้ส่งมอบต่อไม่ได้จนกว่าจะส่งซ่อม"])
  assert.deepEqual(lines({ status: ready, conditionName: "Non-functional" }), ["สภาพนี้ส่งมอบต่อไม่ได้จนกว่าจะส่งซ่อม"])
  assert.deepEqual(lines({ status: ready, conditionName: "Salvage" }), ["ซากรอตัดจำหน่าย ส่งมอบต่อไม่ได้"])
  assert.deepEqual(lines({ status: repair, conditionName: "Damaged" }), ["จะเปิดใบซ่อมให้"])
  assert.deepEqual(lines({ status: disposal, conditionName: "Salvage" }), [])
  assert.deepEqual(lines({ row: null, returnDepartment: null }), ["ยังไม่ได้ตั้งแผนกที่รับคืน"])
})
test("the form: the form wraps the frame with the legacy link and no summary on the phone; three sections, the card, the holding strip, the checklist, the fields in the spec's order, the summary and the footer (spec §8.1-8.4, P2-R9-R12)", () => {
  const form = read("src/components/asset-operations/checkin-form.tsx")
  for (const part of [
    'const CHECKIN_FORM_ID = "checkin-form"', "<form onSubmit={handleSubmit} noValidate id={CHECKIN_FORM_ID}>",
    "actions={legacyLink}", "summaryOnPhone={false}", "legacyLink: React.ReactNode",
    'import { CHECKIN_RETURN_DATE_ERROR_KEYS, checkinHandoverDay, checkinReturnDateError, isLegacyBackfilledHandover } from "@/lib/checkin-route-rules"',
    "const handoverDay = selectedCheckout ? checkinHandoverDay(selectedCheckout) : null", "isLegacyBackfilledHandover(selectedCheckout.remark)",
    "(dateError ? CHECKIN_RETURN_DATE_ERROR_KEYS[dateError] : null)",
    "const selectedReturnBy = ", "const selectedReceiver = ", "function chooseRow(", "function setEmployeeField(", "async function submitCheckin(", "async function leaveReview(",
    '<FormSection number={1} title={t("sectionAsset")}>', '<FormSection number={2} title={t("sectionReturn")}>', "<FormSection number={3} title=",
    "pickedBody={(row) => <CheckinAssetCard row={row} />}", "<StatusBadge label={row.statusLabel} tone={getAssetStateTone(row.detail?.statusName)} />",
    'buildAssetOperationSearchHref({ mode: "checkin", id: assetId, detail: true })', "withCheckoutAssetDetail(current, answered)",
    'label: t("handedOverAt")', 't("heldFor", {', 't("heldLegacy")', "conditionLabels[selectedCheckout.conditionBefore] ?? null",
    '<FieldGroup legend={t("componentsLegend")} id="checkin-components" hint={t("componentsNote")} error={fieldErrors.message("missingComponentIds")}>',
    'type="checkbox"', "checked={!unticked.has(component.id)}", 'body.append("missingComponentIds", component.id)', "setUnticked(new Set())",
    't("returnByHolder")', 't("receiveByYou")', "onChange={setCondition}", "max={todayDay}", "min={handoverDay ?? undefined}",
    "const nextStatusOptions = checkinNextStatusOptions({ statuses, repairLocked, canCreateRepair })", "nextStatusOptions.map(",
    'label={t("nextStatusAfterReturn")}', 't("nextStatusJoinsRepair", { repairNo: chosen.openRepairNo })', 'sendsToRepair ? t("sendToRepairHelp") : undefined',
    "nextStatusId: current.nextStatusId || picked", 'name="checkin-photo-type"',
    "key={`return:${returnByEmployeeId}`}", "key={`receive:${receiveByEmployeeId}`}",
    'apiError.describe("ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE").message', 'getApiErrorKey("ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE")',
    "summary={<OperationSummaryCard", "rows={summaryRows}", "checklist={checklist}", 'footnote={t("summaryFootnote")}',
    't("footerDescription", { tag: chosen.assetTag, returner: values.returnBy })', 'submitLabel: tOperation("reviewAndSave")', "formId: CHECKIN_FORM_ID",
    'label: t("conditionAfter"), value: selectedCondition?.label ?? ""', 'label: t("returnDate"), value: formatCheckoutDay(values.returnDate, locale)',
  ]) assert.ok(form.includes(part), part)
  assert.equal(form.split("nextStatusId: current.nextStatusId || picked").length - 1, 2, "the damage text and the condition")
  const at = (text: string) => form.indexOf(text)
  assert.ok(at("<form onSubmit=") < at("<OperationFormFrame") && at("</OperationFormFrame>") < at("</form>") && at("</form>") < at("<OperationReviewDialog"),
    "the form wraps the frame; the review follows the form")
  assert.ok(at('id="checkin-components"') < at('id="checkin-return-by"') && at('id="checkin-condition-after"') < at('id="checkin-return-date"')
    && at('id="checkin-return-date"') < at('id="checkin-next-status"') && at('id="checkin-next-status"') < at('id="checkin-next-location"'), "the spec's order (P2-R11)")
  const chooseRow = form.slice(at("function chooseRow("), at("async function confirmLegacyReturn("))
  assert.ok(chooseRow.indexOf("if (!returnDepartment) {") >= 0 && chooseRow.indexOf("if (!returnDepartment) {") < chooseRow.indexOf("void confirmLegacyReturn(row)"),
    "no return department: the confirm is refused before any backfill (P2-R8)")
  assert.equal(form.match(/<KeyValueList\b/g)?.length, 1, "one holding strip")
  assert.doesNotMatch(form, /data-slot=|function Select\(|function formatDate\b|operationConditionDefault|from "next\/link"|<ContentPanel\b|<PageHeader\b|photoTypeAssetTag|photoTypeSerial|photoTypeAccessories|returnPhotoChecklist|legacyReturnCount|conditionLabelById|toLocalDateInputValue|getApiErrorKey\(dateError\)/)
})
test("the page: the signed-in person's employee, maintenance:create, the return department, the condition names, and T7's legacy link passed on unchanged (spec §8.1, §8.3, §12, P2-R8, P2-R12, X5)", () => {
  const page = read("src/app/[locale]/(dashboard)/asset-management/checkin/page.tsx")
  for (const part of [
    'const user = await requirePagePermission(locale, "asset", "edit")', 'const t = await getTranslations("checkin")',
    'getAssetOperationMasterOptions({ conditionsFor: "checkin" })',
    "getCheckinPreselect({ checkoutId: filters.checkoutId, assetId: filters.assetId })", "countLegacyReturns()", "readConditionLabels()",
    "readCheckinDepartment(prisma).catch(() => null)", "const legacyLink = legacyReturnCount > 0 ? (",
    't("legacyReturnLink", { count: formatCount(legacyReturnCount) })', "legacyLink={legacyLink}",
    "currentEmployeeId={user.employeeId ?? null}", 'canCreateRepair={hasPermission(user, "maintenance", "create")}',
    "returnDepartment={returnDepartment}", "conditionLabels={conditionLabels}",
    "initialRow={preselect.row}", "initialQuery={preselect.query}",
  ]) assert.ok(page.includes(part), part)
  assert.doesNotMatch(page, /legacyReturnCount=|headerActions|legacyReturnView/)
})
test("the words of รับคืน, Thai and English; the three dropped photo types and the old photo heading have no reader left; the legacy link's words are T7's and the outstanding line's T4's (spec §8.1-8.4, §13, P2-R10)", () => {
  const messages = { th: JSON.parse(read("messages/th.json")), en: JSON.parse(read("messages/en.json")) }
  const word = (locale: "th" | "en", key: string): unknown =>
    key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages[locale])
  const words: Record<string, [string, string]> = {
    "checkin.description": ["บันทึกการรับทรัพย์สินคืน เมื่อบันทึกแล้วระบบจะออกเลขใบรับคืนให้", "Record an asset's return. The return number is issued when you save."],
    "checkin.sectionAsset": ["ทรัพย์สินที่รับคืน", "Asset to return"], "checkin.sectionReturn": ["รายละเอียดการคืน", "Return details"],
    "checkin.sectionEvidence": ["หลักฐาน", "Evidence"], "checkin.sectionEvidenceOptional": ["ไม่บังคับ แต่แนะนำ", "Optional, but recommended"],
    "checkin.handedOverAt": ["ส่งมอบเมื่อ", "Handed over"], "checkin.heldFor": ["{date} · ถือมา {days} วัน", "{date} · held for {days} days"],
    "checkin.heldLegacy": ["ข้อมูลเก่า (ใบส่งมอบย้อนหลัง)", "Legacy record (backdated handover)"],
    "checkin.permanentAssignmentShort": ["มอบหมายใช้งานประจำ", "Permanent assignment"], "checkin.temporaryLoanShort": ["ยืมใช้ชั่วคราว", "Temporary loan"],
    "checkin.componentsLegend": ["ส่วนควบที่ต้องได้คืน · ติ๊กชิ้นที่ได้คืนแล้ว", "Components to get back · tick each one returned"],
    "checkin.componentsNote": ["ชิ้นที่ไม่ได้ติ๊กจะยังอยู่กับผู้คืน และบันทึกเป็นอุปกรณ์ที่ขาดในใบรับคืน", "An unticked component stays with the returner and is recorded as missing on the return."],
    "checkin.componentNotReturned": ["ยังไม่ได้คืน", "not returned"],
    "checkin.returnByHolder": ["ผู้ถือครองตอนนี้", "Current holder"], "checkin.receiveByYou": ["คุณ", "You"],
    "checkin.nextStatusAfterReturn": ["หลังรับคืนให้เป็น", "After the return"],
    "checkin.sendToRepairHelp": ["บันทึกแล้วระบบจะเปิดใบซ่อมให้อัตโนมัติ", "On saving, a repair record opens automatically."],
    "checkin.nextStatusJoinsRepair": ["ต่อใบซ่อม {repairNo} ที่ยังไม่ปิด", "Joins the open repair record {repairNo}."],
    "checkin.photoTypeOverview": ["ภาพรวม", "Overview"], "checkin.photoTypeDamage": ["จุดเสียหาย", "Damage"],
    "checkin.signatureMissing": ["ยังไม่มี (ไม่บังคับ)", "Not yet (optional)"],
    "checkin.summaryComponentsBack": ["ได้คืน {returned} · ขาด {missing}", "{returned} back · {missing} missing"],
    "checkin.summaryFootnote": ["เลขใบรับคืนออกให้หลังบันทึก แล้วเปิดใบรับคืนให้พิมพ์ทันที", "The return number is issued on saving, and the return document opens for printing."],
    "checkin.footerDescription": ["รับคืน {tag} จาก {returner}", "Return {tag} from {returner}"],
    "checkin.footerIncomplete": ["เลือกทรัพย์สินและผู้คืน", "Choose the asset and the returner"],
    "checkin.detailReadFailed": ["อ่านข้อมูลสรุปไม่สำเร็จ", "Could not read the summary"],
    "checkin.warningComponentMissing": ["{component} ยังไม่ได้คืน จะอยู่กับ {returner} ที่ {room} และบันทึกเป็นอุปกรณ์ที่ขาดในใบรับคืน",
      "{component} is not back: it stays with {returner} at {room} and is recorded as missing on the return."],
    "checkin.warningRepairOpens": ["จะเปิดใบซ่อมให้", "A repair record will be opened."],
    "checkin.warningRepairJoins": ["ต่อใบซ่อม {repairNo}", "Joins repair record {repairNo}."],
    "checkin.warningBrokenReady": ["สภาพนี้ส่งมอบต่อไม่ได้จนกว่าจะส่งซ่อม", "In this condition it cannot be handed over until it is repaired."],
    "checkin.warningSalvageReady": ["ซากรอตัดจำหน่าย ส่งมอบต่อไม่ได้", "Salvage awaiting disposal cannot be handed over."],
    "assetOperation.summaryCondition": ["สภาพ", "Condition"],
    "assetOperation.badgeHandover": ["มีใบส่งมอบ {documentNo}", "Handover {documentNo}"],
    "assetOperation.badgeLegacy": ["ข้อมูลเก่า ไม่มีใบส่งมอบ", "Legacy record, no handover"],
    "assetOperation.badgeOutstanding": ["ส่วนควบค้างคืน", "Outstanding component"],
    "apiErrors.checkinRepairStatusRequired": ["มีงานซ่อมที่ยังไม่ปิด หลังรับคืนต้องเป็น ส่งซ่อม", "This asset has an open repair. After the return it must go to Send for repair."],
  }
  assert.equal(Object.keys(words).length, 36, "Step 4's keys")
  for (const [key, pair] of Object.entries(words)) assert.deepEqual([word("th", key), word("en", key)], pair, key)
  for (const key of ["checkin.selectCondition", "checkin.photoTypeAssetTag", "checkin.photoTypeSerial", "checkin.photoTypeAccessories", "checkin.returnPhotoChecklist", "checkin.returnPhotoChecklistHelp"])
    for (const locale of ["th", "en"] as const) assert.equal(word(locale, key), undefined, `${locale} ${key}`)
})
