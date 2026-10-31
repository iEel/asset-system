import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  EMPTY_LATE_RETURN_DRAFT, buildLateReturnBody, buildLateReturnChecklist, buildLateReturnSummaryRows, lateReturnDays, lateReturnOf, lateReturnOutcome,
  validateLateReturn, type LateReturnSummaryRow, type LateReturnSummaryWords,
} from "../src/lib/checkin-late-return-rules.ts"
import type { AssetOperationChosenDetail, AssetOperationLateReturn, AssetOperationSearchRow } from "../src/lib/asset-operation-search-rules.ts"

// The late return of an outstanding component on รับคืน (group 3 spec §8.6, P2-R4): which row, its outcome, its checks,
// its request, its summary and checklist; then the form's source and the words of this task.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")
const lateReturn = (o: Partial<AssetOperationLateReturn> = {}): AssetOperationLateReturn => ({
  linkId: "link-1", checkinId: "rt-1", checkinNo: "RT-202610-0004", checkinDate: "2026-10-19T18:00:00.000Z",
  parent: { id: "asset-p", assetTag: "NB-0017", name: "โน้ตบุ๊ก Dell" }, parentInStock: true, ...o,
})
function row(o: Partial<AssetOperationSearchRow> = {}, d: Partial<AssetOperationChosenDetail> = {}): AssetOperationSearchRow {
  return {
    id: "c-2", assetTag: "NB-0017-02", name: "Mouse ไร้สาย", serialNumber: null, statusLabel: "พร้อมใช้งาน", placeLabel: "EMP-0412 - สมชาย ใจดี",
    locationLabel: "AC-01 - ห้องบัญชี", currentLocationId: "loc-acc", conditionId: "c-good", eligible: true, reasonKey: null, photo: null,
    holderKey: "employee:emp-1", holderLabel: "EMP-0412 - สมชาย ใจดี", holderEmployeeId: "emp-1", badge: "outstanding", lateReturn: lateReturn(),
    detail: {
      ownership: "component", statusName: "Ready", departmentId: "dep-acc", departmentLabel: "ACC - บัญชี", departmentName: "บัญชี",
      holderLabel: "EMP-0412 - สมชาย ใจดี", holderName: "สมชาย ใจดี", ownerBranchLabel: "สำนักงานใหญ่", locationBranchLabel: "สำนักงานใหญ่",
      components: [], outstandingComponents: [],
      // A ส่วนกลาง parent in IT stock keeps its own department, so a re-attach shows it apart from the return department.
      lateReturnParent: { locationId: "loc-it", locationLabel: "IT-2 - ห้อง IT ชั้น 2", departmentId: "dep-adm", departmentName: "ธุรการ" },
      ...d,
    },
    ...o,
  }
}
const words: LateReturnSummaryWords = {
  parent: "ส่วนควบของ", holder: "ผู้ถือครอง", location: "ที่ตั้ง", department: "แผนก", condition: "สภาพตอนคืน", none: "ไม่มี", notChosen: "ยังไม่ได้เลือก",
  kept: (v) => `${v} (คงเดิม)`, outstandingOf: (tag) => `${tag} (ค้างคืน)`, departmentUnavailable: "ยังไม่ได้ตั้งค่า",
}
const conditions = [{ id: "c-good", label: "ดี" }, { id: "c-fair", label: "พอใช้" }]
const locations = [{ id: "loc-store", label: "IT-9 - คลัง IT" }, { id: "loc-acc", label: "AC-01 - ห้องบัญชี" }]
const returnDepartment = { id: "dep-it", name: "Information Technology" }
const summary = (r: AssetOperationSearchRow, draft: Partial<typeof EMPTY_LATE_RETURN_DRAFT> = {}, o: Partial<Parameters<typeof buildLateReturnSummaryRows>[0]> = {}) =>
  buildLateReturnSummaryRows({ row: r, lateReturn: r.lateReturn!, draft: { ...EMPTY_LATE_RETURN_DRAFT, ...draft }, conditions, locations, currentConditionLabel: "ดี", returnDepartment, ...o }, words)
const pick = (rows: LateReturnSummaryRow[]) => rows.map(({ key, now, next, changed }) => [key, now, next, changed])
const standalone = () => row({ lateReturn: lateReturn({ parentInStock: false }) })

test("which rows are late returns, and the outcome the row brings (P2-R4)", () => {
  assert.equal(lateReturnOf(row())?.linkId, "link-1")
  assert.equal(lateReturnOf(row({ eligible: false, reasonKey: "asset.transactionReasonActiveMaintenance" })), null, "a blocked row reads its reason; no panel")
  assert.equal(lateReturnOf(row({ lateReturn: undefined, badge: "handover" })), null)
  assert.equal(lateReturnOf(null), null)
  assert.deepEqual([lateReturnOutcome(lateReturn()), lateReturnOutcome(lateReturn({ parentInStock: false }))], ["reattached", "standalone"])
  assert.deepEqual(EMPTY_LATE_RETURN_DRAFT, { conditionId: "", nextLocationId: "", remark: "" })
})

test("today and the RT-'s return date as Bangkok days (spec §5 dates, P2-R13)", () => {
  assert.deepEqual(lateReturnDays(lateReturn(), new Date("2026-10-31T17:30:00.000Z")), { todayDay: "2026-11-01", checkinDay: "2026-10-20" })
  assert.deepEqual(lateReturnDays(lateReturn({ checkinDate: null }), new Date("2026-10-31T01:00:00.000Z")), { todayDay: "2026-10-31", checkinDay: null })
  assert.deepEqual(lateReturnDays(null, new Date("2026-10-31T01:00:00.000Z")), { todayDay: "2026-10-31", checkinDay: null })
})

test("the panel's checks: ผู้รับคืน, วันที่คืน from the RT-'s day to today, the room only when it stands alone; the condition is never required (spec §8.6, P2-R4, P2-R13)", () => {
  const days: { todayDay: string; checkinDay: string | null } = { todayDay: "2026-10-31", checkinDay: "2026-10-20" }
  const valid = { ...EMPTY_LATE_RETURN_DRAFT, receiveBy: "EMP-0007 - สมหญิง รักงาน", returnDate: "2026-10-31" }
  const at = (values: typeof valid, outcome: "reattached" | "standalone" = "reattached", context = days) => validateLateReturn(values, { outcome, ...context })
  assert.deepEqual(at(valid), {})
  assert.deepEqual(at({ ...valid, receiveBy: "", returnDate: "" }), { receiveBy: "required", returnDate: "required" })
  assert.deepEqual(at({ ...valid, receiveBy: "x".repeat(101) }), { receiveBy: "tooLong" })
  assert.deepEqual(at({ ...valid, returnDate: "2026-11-01" }), { returnDate: "checkinReturnDateInFuture" })
  assert.deepEqual(at({ ...valid, returnDate: "2026-10-19" }), { returnDate: "componentReturnDateBeforeCheckin" })
  assert.deepEqual(at({ ...valid, returnDate: "2026-10-20" }), {}, "the RT-'s own day")
  assert.deepEqual(at({ ...valid, returnDate: "2020-01-01" }, "reattached", { todayDay: "2026-10-31", checkinDay: null }), {}, "an RT- date that was not read sets no lower bound")
  assert.deepEqual(at(valid, "standalone"), { nextLocationId: "required" })
  assert.deepEqual(at({ ...valid, nextLocationId: "loc-store" }, "standalone"), {})
})

test("the request: the link and its RT- as the stale guard, the outcome the panel showed, and only the values given; a re-attach never sends a room (P2-R3, Review Focus 3)", () => {
  const values = { ...EMPTY_LATE_RETURN_DRAFT, receiveBy: "EMP-0007 - สมหญิง รักงาน", receiveByEmployeeId: "emp-7", returnDate: "2026-10-31", nextLocationId: "loc-store" }
  assert.deepEqual(buildLateReturnBody(lateReturn(), values),
    { componentLinkId: "link-1", checkinId: "rt-1", expectedOutcome: "reattached", returnDate: "2026-10-31", receiveBy: "EMP-0007 - สมหญิง รักงาน", receiveByEmployeeId: "emp-7" })
  assert.deepEqual(buildLateReturnBody(lateReturn({ parentInStock: false }), { ...values, receiveByEmployeeId: "", conditionId: "c-fair", remark: "  คืนที่โต๊ะ IT  " }), {
    componentLinkId: "link-1", checkinId: "rt-1", expectedOutcome: "standalone", returnDate: "2026-10-31", receiveBy: "EMP-0007 - สมหญิง รักงาน",
    conditionId: "c-fair", nextLocationId: "loc-store", remark: "คืนที่โต๊ะ IT",
  })
  assert.equal("remark" in buildLateReturnBody(lateReturn(), { ...values, remark: "   " }), false)
})

test("re-attach: back into the parent, no holder, the parent's room and the parent's department; the condition kept unless chosen (spec §8.6, P2-R7)", () => {
  assert.deepEqual(pick(summary(row())), [
    ["parent", "NB-0017 (ค้างคืน)", "NB-0017", true],
    ["holder", "สมชาย ใจดี", "ไม่มี", true],
    ["location", "AC-01 - ห้องบัญชี", "IT-2 - ห้อง IT ชั้น 2", true],
    ["department", "บัญชี", "ธุรการ", true],
    ["condition", "ดี", "ดี (คงเดิม)", false],
  ])
  assert.deepEqual(summary(row()).map((r) => r.label), ["ส่วนควบของ", "ผู้ถือครอง", "ที่ตั้ง", "แผนก", "สภาพตอนคืน"])
  assert.deepEqual(pick(summary(row(), { conditionId: "c-fair" }))[4], ["condition", "ดี", "พอใช้", true])
  assert.deepEqual(pick(summary(row(), { conditionId: "c-good" }))[4], ["condition", "ดี", "ดี", false], "chosen and the same")
  assert.deepEqual(pick(summary(row(), { nextLocationId: "loc-store" }))[2], ["location", "AC-01 - ห้องบัญชี", "IT-2 - ห้อง IT ชั้น 2", true], "a room left over from a stand-alone panel is not used")
})

test("stand alone: no parent, the room chosen on the panel (none until chosen) and the return department; a ส่วนกลาง one keeps its own (spec §6, §8.6, P2-R7, P2-R8)", () => {
  assert.deepEqual(pick(summary(standalone())), [
    ["parent", "NB-0017 (ค้างคืน)", "ไม่มี", true],
    ["holder", "สมชาย ใจดี", "ไม่มี", true],
    ["location", "AC-01 - ห้องบัญชี", "ยังไม่ได้เลือก", false],
    ["department", "บัญชี", "Information Technology", true],
    ["condition", "ดี", "ดี (คงเดิม)", false],
  ])
  assert.deepEqual(pick(summary(standalone(), { nextLocationId: "loc-store" }))[2], ["location", "AC-01 - ห้องบัญชี", "IT-9 - คลัง IT", true])
  assert.deepEqual(pick(summary(standalone(), { nextLocationId: "loc-acc" }))[2], ["location", "AC-01 - ห้องบัญชี", "AC-01 - ห้องบัญชี", false], "the room it is in already")
  // ส่วนกลาง keeps its responsible department on a return, as the route writes it; re-attached, it follows the parent (spec §6, P2-R7).
  assert.deepEqual(pick(summary(row({ lateReturn: lateReturn({ parentInStock: false }) }, { ownership: "shared" })))[3], ["department", "บัญชี", "บัญชี", false])
  assert.deepEqual(pick(summary(row({}, { ownership: "shared" })))[3], ["department", "บัญชี", "ธุรการ", true])
  // The return department does not resolve: nothing is promised, and the save is refused (P2-R8).
  for (const r of [row(), standalone()]) assert.deepEqual(pick(summary(r, {}, { returnDepartment: null }))[3], ["department", "บัญชี", "ยังไม่ได้ตั้งค่า", false])
})

test("nothing promised without the detail: no rows, none for a re-attach whose parent was not read; a component with no holder (spec §4 anti-goal)", () => {
  assert.deepEqual(summary(row({ detail: undefined })), [])
  assert.deepEqual(summary(row({}, { lateReturnParent: undefined })), [])
  assert.equal(summary(row({ lateReturn: lateReturn({ parentInStock: false }) }, { lateReturnParent: undefined })).length, 5, "a stand-alone return needs no parent")
  assert.deepEqual(pick(summary(row({}, { holderLabel: null, holderName: null })))[1], ["holder", "ไม่มี", "ไม่มี", false])
})

test("the still-missing list: the asset, ผู้รับคืน, and เก็บไว้ที่ only when it stands alone (spec §5)", () => {
  const w = { asset: "ทรัพย์สิน", receiver: "ผู้รับคืน", location: "เก็บไว้ที่" }
  assert.deepEqual(buildLateReturnChecklist({ eligible: true, receiveBy: "", outcome: "reattached", nextLocationId: "" }, w),
    [{ key: "asset", label: "ทรัพย์สิน", done: true }, { key: "receiver", label: "ผู้รับคืน", done: false }])
  assert.deepEqual(buildLateReturnChecklist({ eligible: true, receiveBy: "x", outcome: "standalone", nextLocationId: "" }, w).map((c) => [c.key, c.done]),
    [["asset", true], ["receiver", true], ["location", false]])
  assert.equal(buildLateReturnChecklist({ eligible: false, receiveBy: "x", outcome: "standalone", nextLocationId: "loc-store" }, w)[0].done, false)
})

test("the rules stay pure: relative .ts imports, no database", () => {
  const source = read("src/lib/checkin-late-return-rules.ts")
  assert.doesNotMatch(source, /from "@\/|@prisma\/client"|\bprisma\./)
  for (const [, path] of source.matchAll(/from "([^"]+)"/g)) assert.match(path, /^\.\/[\w-]+\.ts$/, path)
})

test("the รับคืน form: the late return is a branch of the one form, its panel stands where sections 2 and 3 do, with its own ids, checks and errors, the save to component-return and the RT- after (spec §8.6, P2-R4)", () => {
  const form = read("src/components/asset-operations/checkin-form.tsx")
  for (const part of [
    'const LATE_FIELD_IDS = {\n  receiveBy: "checkin-late-receive-by",\n  returnDate: "checkin-late-return-date",\n  conditionId: "checkin-late-condition",\n  nextLocationId: "checkin-late-location",\n} as const satisfies Record<LateReturnField, string>',
    "const LATE_FIELD_ORDER = Object.keys(LATE_FIELD_IDS) as LateReturnField[]",
    "const lateErrors = useFieldErrors<LateReturnField>()",
    "useState<LateReturnDraft>(EMPTY_LATE_RETURN_DRAFT)",
    "const lateReturn = lateReturnOf(chosen)",
    "const lateOutcome = lateReturn ? lateReturnOutcome(lateReturn) : null",
    "const lateDays = lateReturnDays(lateReturn, new Date())",
    "if (lateReturn) return openLateReview()",
    "lateErrors.setErrors(validateLateReturn(",
    "const focusLateError = () => lateErrors.focusFirst(LATE_FIELD_ORDER, { idFor: (key) => LATE_FIELD_IDS[key], reveal: leaveReview })",
    "fetch(`/api/assets/${chosen.id}/component-return`, {",
    'headers: { "Content-Type": "application/json" },',
    "body: JSON.stringify(buildLateReturnBody(lateReturn, {",
    "if (lateErrors.applyServer(payload) && focusLateError()) return",
    'if (payload?.code === "ASSET_CHANGED_DURING_OPERATION") {',
    "const documentHref = `/${locale}/asset-management/checkins/${payload.checkinId}`",
    't("lateSuccess")',
    "<div data-checkin-late-panel>",
    '<FormSection number={2} title={t("lateSectionTitle")}>',
    'options={[{ id: "", label: t("lateConditionUnchanged") }, ...conditions]}',
    'lateOutcome === "standalone" ? (',
    "max={lateDays.todayDay}",
    "min={lateDays.checkinDay ?? undefined}",
    'description={lateReturn ? t("lateReviewDescription") : t("reviewDescription")}',
    "onConfirm={() => void (lateReturn ? submitLateReturn() : submitCheckin())}",
    "setLate(EMPTY_LATE_RETURN_DRAFT)",
    "lateErrors.setErrors({})",
    "const summaryWarnings = lateReturn ? lateWarnings :",
    "rows={lateReturn ? lateSummaryRows :",
    "checklist={lateReturn ? lateChecklist :",
    "const footerLine = lateReturn ? lateFooter :",
  ]) assert.ok(form.includes(part), part)
  for (const id of ["checkin-late-receive-by", "checkin-late-return-date", "checkin-late-condition", "checkin-late-location", "checkin-late-remark"]) {
    assert.equal(form.match(new RegExp(`\\bid="${id}"`, "g"))?.length, 1, id)
  }
  assert.equal(form.match(/<form\b/g)?.length, 1, "one form, one frame submit")
  assert.equal(form.match(/<OperationReviewDialog\b/g)?.length, 1, "one review dialog")
  assert.match(form, /\{lateReturn \? \(\n\s+<div data-checkin-late-panel>/, "the panel stands where sections 2 and 3 do")
  const at = (text: string) => form.indexOf(text)
  assert.ok(at("if (lateReturn) return openLateReview()") < at("fieldErrors.setErrors(validate("), "the late branch comes before the return's own checks")
  assert.ok(at("{lateReturn ? (") < at("<FormSection number={3}"), "section 3 is in the other branch")
  const stale = at('if (payload?.code === "ASSET_CHANGED_DURING_OPERATION") {')
  const reread = form.indexOf("await loadRowDetail(chosen.id)", stale)
  assert.ok(reread > stale && form.indexOf('throw new Error(payload?.code ?? payload?.error ?? tCommon("error"))', reread) > reread,
    "a stale panel reads the row again before the toast (Review Focus 3)")
  assert.ok(form.includes("{!lateReturn && travelling.length > 0 ? ("), "a late return shows no components checklist: its route takes no missingComponentIds")
  assert.doesNotMatch(form, /"-"|text-warning|from "next\/link"/)
})

test("the words of the late return and of ส่งมอบ's outstanding warning, Thai and English (spec §7.1, §7.3, §8.6)", () => {
  const messages = { th: JSON.parse(read("messages/th.json")), en: JSON.parse(read("messages/en.json")) }
  const word = (locale: "th" | "en", key: string): unknown =>
    key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages[locale])
  const expected: Record<string, [string, string]> = {
    "checkin.lateSectionTitle": ["รับคืนส่วนควบที่ค้างคืน", "Return an outstanding component"],
    "checkin.lateParent": ["ส่วนควบของ {tag} {name}", "A component of {tag} {name}"],
    "checkin.lateSince": ["ค้างคืนตั้งแต่ {documentNo} · {date}", "Outstanding since {documentNo} · {date}"],
    "checkin.lateReattachNotice": ["บันทึกแล้วส่วนควบจะกลับเข้าเครื่องหลัก {parentTag} ซึ่งอยู่ในคลัง IT โดยใช้ที่ตั้งและแผนกตามเครื่องหลัก", "On saving, the component goes back into {parentTag}, which is in IT stock, and takes its location and department."],
    "checkin.lateStandaloneNotice": ["เครื่องหลัก {parentTag} ไม่ได้อยู่ในคลัง IT แล้ว บันทึกแล้วส่วนควบจะแยกเป็นทรัพย์สินเดี่ยวในคลัง IT ไม่กลับเข้าเครื่องหลัก เลือกที่ตั้งที่จะเก็บไว้ด้านล่าง", "{parentTag} is no longer in IT stock. On saving, the component stands alone in IT stock instead of going back into it. Choose where to store it below."],
    "checkin.lateCondition": ["สภาพตอนคืน (ไม่บังคับ)", "Condition on return (optional)"],
    "checkin.lateConditionUnchanged": ["คงเดิม", "Unchanged"],
    "checkin.lateFooter": ["รับคืน {tag} จาก {holder}", "Return {tag} from {holder}"],
    "checkin.lateFooterNoHolder": ["รับคืน {tag}", "Return {tag}"],
    "checkin.lateSummaryParent": ["ส่วนควบของ", "Component of"],
    "checkin.lateSummaryOutstanding": ["{parentTag} (ค้างคืน)", "{parentTag} (outstanding)"],
    "checkin.lateDepartmentUnavailable": ["ยังไม่ได้ตั้งค่า", "Not set up"],
    "checkin.lateSummaryFootnote": ["ไม่ออกเลขเอกสารใหม่ บันทึกเป็นบรรทัดในใบรับคืน {documentNo} แล้วเปิดใบรับคืนให้พิมพ์", "No new document number: the return is a line on {documentNo}, which then opens for printing."],
    "checkin.lateReviewDescription": ["ยืนยันผู้รับคืน วันที่คืน และปลายทางของส่วนควบก่อนบันทึก", "Confirm the receiver, the return date and where the component goes before saving."],
    "checkin.lateReviewSince": ["ค้างคืนตั้งแต่", "Outstanding since"],
    "checkin.lateResultReattach": ["กลับเข้าเครื่องหลัก {parentTag}", "Back into {parentTag}"],
    "checkin.lateResultStandalone": ["แยกเป็นทรัพย์สินเดี่ยว เก็บไว้ที่ {location}", "Stands alone, stored at {location}"],
    "checkin.lateSuccess": ["รับคืนส่วนควบสำเร็จ", "Component returned"],
    "checkout.componentsOutstanding": ["ยังค้างคืน {count} รายการ: {list}", "{count, plural, one {# component is still outstanding: {list}} other {# components are still outstanding: {list}}}"],
    "checkout.componentsOutstandingNote": ["ชิ้นที่ค้างคืนไม่ไปกับการส่งมอบนี้ เมื่อได้คืนแล้วให้รับคืนที่หน้ารับคืนทรัพย์สิน", "An outstanding component does not go with this handover. When it comes back, return it on the Check-in Asset page."],
    "checkout.outstandingWith": ["อยู่กับ {holder}", "with {holder}"],
    "checkout.outstandingSince": ["ตั้งแต่ {documentNo}", "since {documentNo}"],
    "checkout.summaryComponentsOutstanding": ["ค้างคืน {count} รายการ", "{count} outstanding"],
  }
  assert.equal(Object.keys(expected).length, 23, "Step 3e's keys")
  for (const [key, pair] of Object.entries(expected)) assert.deepEqual([word("th", key), word("en", key)], pair, key)
})
