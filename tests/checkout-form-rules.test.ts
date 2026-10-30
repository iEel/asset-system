import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  buildCheckoutChecklist,
  buildCheckoutSummaryRows,
  checkoutComponents,
  checkoutConditionDefault,
  checkoutReceiverLabel,
  withCheckoutAssetDetail,
  type CheckoutChoice,
  type CheckoutSummaryRow,
  type CheckoutSummaryWords,
} from "../src/lib/checkout-form-rules.ts"
import type { AssetOperationChosenDetail, AssetOperationSearchRow } from "../src/lib/asset-operation-search-rules.ts"

// ส่งมอบ's pure rules (group 3 plan 1 Task 6): the สรุปก่อนบันทึก rows, the checklist, the detail answer, the condition
// default and the receiver; then the form's source and its words.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")

function row(o: Partial<AssetOperationSearchRow> = {}, d: Partial<AssetOperationChosenDetail> = {}): AssetOperationSearchRow {
  return {
    id: "a1",
    assetTag: "NB-0017",
    name: "Notebook",
    serialNumber: null,
    statusLabel: "พร้อมใช้งาน",
    placeLabel: "HQ-01 - คลัง IT",
    locationLabel: "HQ-01 - คลัง IT",
    currentLocationId: "l1",
    conditionId: "c-good",
    eligible: true,
    reasonKey: null,
    detail: {
      ownership: "personal",
      statusName: "Ready",
      departmentId: "d-it",
      departmentLabel: "IT - Information Technology",
      holderLabel: null,
      ownerBranchLabel: "สำนักงานใหญ่",
      locationBranchLabel: "สำนักงานใหญ่",
      components: [],
      ...d,
    },
    ...o,
  }
}
const employee = { id: "e1", label: "E001 - สมชาย ใจดี", departmentId: "d-acc", departmentLabel: "ACC - บัญชี", branchLabel: "สำนักงานใหญ่", heldCount: 2 }
const choose = (o: Partial<CheckoutChoice> = {}): CheckoutChoice => ({
  asset: row(),
  checkoutType: "user",
  handoverMode: "",
  employee: null,
  department: null,
  location: null,
  ...o,
})
const words: CheckoutSummaryWords = {
  holder: "ผู้ถือครอง",
  department: "แผนก",
  location: "ที่ตั้ง",
  status: "สถานะ",
  components: "ส่วนควบ",
  none: "ไม่มี",
  notChosen: "ยังไม่ได้เลือก",
  inUse: "ใช้งานอยู่",
  checkedOut: "ถูกยืม",
  kept: (v) => `${v} (คงเดิม)`,
  count: (n) => `${n} รายการ`,
  componentsGo: (n) => `ไปด้วย ${n} รายการ`,
}
const pick = (rows: CheckoutSummaryRow[]) => rows.map(({ key, now, next, changed }) => [key, now, next, changed])

test("บุคคล to an employee: holder, the employee's department, status and the components that go (spec §7.3, §6)", () => {
  const components = [{ id: "k1", assetTag: "NB-0017-01", name: "Adapter 65W", travels: true }, { id: "k2", assetTag: "NB-0017-02", name: "Mouse ไร้สาย", travels: false }]
  const rows = buildCheckoutSummaryRows(choose({ asset: row({}, { components }), employee, handoverMode: "permanent_assignment" }), words)
  assert.deepEqual(rows.map((r) => r.label), ["ผู้ถือครอง", "แผนก", "สถานะ", "ส่วนควบ"])
  assert.deepEqual(pick(rows), [["holder", "ไม่มี", "E001 - สมชาย ใจดี", true], ["department", "IT - Information Technology", "ACC - บัญชี", true],
    ["status", "พร้อมใช้งาน", "ใช้งานอยู่", true], ["components", "2 รายการ", "ไปด้วย 1 รายการ", true]])
  assert.deepEqual(checkoutComponents(row({}, { components })), { travelling: [components[0]], staying: [components[1]] })
})
test("ส่วนกลาง keeps its department, to an employee and to a department (P1-R2)", () => {
  const shared = row({}, { ownership: "shared" })
  for (const choice of [choose({ asset: shared, employee }), choose({ asset: shared, checkoutType: "department", department: { id: "d-acc", label: "ACC - บัญชี" }, handoverMode: "temporary_loan" })])
    assert.deepEqual(pick(buildCheckoutSummaryRows(choice, words))[1], ["department", "IT - Information Technology", "IT - Information Technology", false])
})
test("to a department an old holder stays and says so; to a room the room changes, the department does not (spec §7.3)", () => {
  const dept = choose({ asset: row({}, { holderLabel: "E009 - คนเดิม" }), checkoutType: "department", department: { id: "d-acc", label: "ACC - บัญชี" }, handoverMode: "temporary_loan" })
  assert.deepEqual(pick(buildCheckoutSummaryRows(dept, words)), [["holder", "E009 - คนเดิม", "E009 - คนเดิม (คงเดิม)", false],
    ["department", "IT - Information Technology", "ACC - บัญชี", true], ["status", "พร้อมใช้งาน", "ถูกยืม", true]])
  const room = choose({ checkoutType: "location", location: { id: "l2", label: "BR-02 - ห้อง 2" }, handoverMode: "temporary_loan" })
  assert.deepEqual(pick(buildCheckoutSummaryRows(room, words)), [["holder", "ไม่มี", "ไม่มี", false],
    ["department", "IT - Information Technology", "IT - Information Technology", false], ["location", "HQ-01 - คลัง IT", "BR-02 - ห้อง 2", true], ["status", "พร้อมใช้งาน", "ถูกยืม", true]])
})
test("nothing promised before it is chosen, and no rows without the detail (spec §4 anti-goal)", () => {
  assert.deepEqual(pick(buildCheckoutSummaryRows(choose(), words)), [["holder", "ไม่มี", "ยังไม่ได้เลือก", false],
    ["department", "IT - Information Technology", "ยังไม่ได้เลือก", false], ["status", "พร้อมใช้งาน", "ยังไม่ได้เลือก", false]])
  assert.deepEqual(buildCheckoutSummaryRows(choose({ asset: row({ detail: undefined }) }), words), [])
})
test("the checklist, the detail answer, the condition default and the receiver (spec §7.2-7.3, P1-R5)", () => {
  const checkWords = { asset: "ทรัพย์สิน", receiver: "ผู้รับ", mode: "ลักษณะการส่งมอบ", signature: "ลายเซ็นผู้รับ", signatureMissing: "ยังไม่มี (ไม่บังคับ)" }
  assert.deepEqual(buildCheckoutChecklist({ ...choose({ asset: null }), signed: false }, checkWords), [{ key: "asset", label: "ทรัพย์สิน", done: false },
    { key: "receiver", label: "ผู้รับ", done: false }, { key: "mode", label: "ลักษณะการส่งมอบ", done: false }, { key: "signature", label: "ลายเซ็นผู้รับ", done: false, note: "ยังไม่มี (ไม่บังคับ)" }])
  assert.deepEqual(buildCheckoutChecklist({ ...choose({ employee, handoverMode: "temporary_loan" }), signed: true }, checkWords).map((c) => c.done), [true, true, true, true])
  assert.equal(buildCheckoutChecklist({ ...choose({ asset: row({ eligible: false, reasonKey: "asset.transactionReasonStatusNotReady" }) }), signed: false }, checkWords)[0].done, false)
  const plain = row({ detail: undefined }); const answered = row()
  assert.equal(withCheckoutAssetDetail(plain, answered), answered)
  assert.equal(withCheckoutAssetDetail(row({ id: "a2", detail: undefined }), answered)?.id, "a2", "another asset chosen since")
  assert.equal(withCheckoutAssetDetail(plain, null), plain, "a failed read keeps the row")
  assert.equal(checkoutConditionDefault(row(), [{ id: "c-good" }]), "c-good")
  assert.equal(checkoutConditionDefault(row({ conditionId: "c-legacy" }), [{ id: "c-good" }]), "")
  assert.equal(checkoutReceiverLabel(choose({ checkoutType: "department", employee })), null)
})

test("the form's source: the form wraps the frame; three sections, the asset card, the receiver, the summary, the footer and the phone hooks (spec §7.1-§7.3, P1-R4)", () => {
  const form = read("src/components/asset-operations/checkout-form.tsx")
  for (const part of [
    'const CHECKOUT_FORM_ID = "checkout-form"', "useState<CheckoutPhoneStep>(1)",
    "<form onSubmit={handleSubmit} noValidate id={CHECKOUT_FORM_ID} data-step={step}>",
    '<FormSection number={1} title={t("sectionAsset")}>', '<FormSection number={2} title={t("sectionReceiver")}>', "<FormSection number={3} title=",
    "pickedBody={(row) => <CheckoutAssetCard row={row} />}",
    "<StatusBadge label={row.statusLabel} tone={getAssetStateTone(row.detail?.statusName)} />",
    'row.detail ? t("assetWhere", { location: row.locationLabel, branch: row.detail.locationBranchLabel, holder: row.detail.holderLabel ?? t("noHolder") }) : row.locationLabel',
    'buildAssetOperationSearchHref({ mode: "checkout", id: assetId, detail: true })', "withCheckoutAssetDetail(current.asset, answered)",
    "checkoutConditionDefault(initialAsset, conditions)", "checkoutConditionDefault(row, conditions)",
    '<FieldGroup legend={t("checkoutTo")} id="checkout-type" required error={errorText("checkoutType")}>',
    "<AssetConditionChoice", 'id="checkout-condition"',
    't("receiverHint", { department: selectedEmployee.departmentLabel, branch: selectedEmployee.branchLabel, count: selectedEmployee.heldCount })',
    "const cancelHref = getOperationCancelHref(locale, returnTo)", "const receiverLabel = checkoutReceiverLabel(choice)",
    "summary={<OperationSummaryCard", 'footnote={t("summaryFootnote")}',
    't("footerDescription", { tag: values.asset.assetTag, receiver: receiverLabel })',
    'submitLabel: tOperation("reviewAndSave")', "formId: CHECKOUT_FORM_ID",
    ...["asset", "receiver", "evidence", "photo", "signature"].map((part) => `data-checkout-part="${part}"`),
  ]) assert.ok(form.includes(part), part)
  const at = (text: string) => form.indexOf(text)
  assert.ok(at("<form onSubmit=") < at("<OperationFormFrame") && at("</OperationFormFrame>") < at("</form>") && at("</form>") < at("<OperationReviewDialog"),
    "the form wraps the frame, so the frame's StickyFormFooter is inside the form; the review dialog follows the form")
  assert.doesNotMatch(form, /data-slot=/, "the slots are the shared parts' own (Task 5's operation-summary-card and operation-form-frame)")
  assert.doesNotMatch(form, /<NativeSelect|function Select\(|function OperationShell|t\("toAsset"\)|t\("selectCondition"\)/)
  const picker = read("src/components/ui/asset-operation-picker.tsx")
  for (const part of ["pickedBody?: (row: AssetOperationSearchRow) => React.ReactNode", "{pickedBody ? pickedBody(value) : ("]) assert.ok(picker.includes(part), part)
})
test("the words of ส่งมอบ, Thai and English; checkout.selectCondition has no reader left (spec §7.1-§7.3, decision 5)", () => {
  const messages = { th: JSON.parse(read("messages/th.json")), en: JSON.parse(read("messages/en.json")) }
  const word = (locale: "th" | "en", key: string): unknown =>
    key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages[locale])
  const words: Record<string, [string, string]> = {
    "checkout.description": ["บันทึกการส่งมอบให้พนักงาน แผนก หรือที่ตั้ง เมื่อบันทึกแล้วระบบจะออกเลขใบส่งมอบให้", "Record a handover to an employee, a department or a location. The handover number is issued when you save."],
    "checkout.sectionAsset": ["ทรัพย์สินที่จะส่งมอบ", "Asset to hand over"], "checkout.sectionReceiver": ["ส่งมอบให้ใคร", "Who receives it"],
    "checkout.sectionEvidence": ["หลักฐาน", "Evidence"], "checkout.sectionEvidenceOptional": ["ไม่บังคับ แต่แนะนำ", "Optional, but recommended"],
    "checkout.assetWhere": ["อยู่ที่ {location} · {branch} · {holder}", "At {location} · {branch} · {holder}"], "checkout.noHolder": ["ยังไม่มีผู้ถือครอง", "No holder yet"],
    "checkout.componentsTravel": ["ส่วนควบที่จะส่งมอบไปด้วย {count} รายการ", "{count} components go with it"],
    "checkout.componentsTravelNote": ["ส่วนควบไปพร้อมเครื่องหลักโดยอัตโนมัติ ถ้าไม่ต้องการส่งชิ้นไหน ให้ถอดออกจากเครื่องก่อน", "Components go with the parent automatically. To keep one back, remove it from the parent first."],
    "checkout.componentsStaying": ["ไม่ไปด้วย {count} รายการ เพราะมีการส่งมอบของตัวเองค้างอยู่: {list}", "{count} not going, each has its own open handover: {list}"],
    "checkout.receiverEmployee": ["พนักงานผู้รับ", "Receiving employee"], "checkout.receiverDepartment": ["แผนกผู้รับ", "Receiving department"],
    "checkout.receiverLocation": ["ที่ตั้งปลายทาง", "Destination location"],
    "checkout.receiverHint": ["{department} · {branch} · ตอนนี้ถือครองทรัพย์สินอยู่ {count} รายการ", "{department} · {branch} · holds {count} assets now"],
    "checkout.receiverSignatureFor": ["ให้ {name} เซ็นในกรอบนี้", "Ask {name} to sign in this box"],
    "checkout.summaryComponentsGo": ["ไปด้วย {count} รายการ", "{count} go with it"], "checkout.checkReceiver": ["ผู้รับ", "Receiver"],
    "checkout.signatureMissing": ["ยังไม่มี (ไม่บังคับ)", "Not yet (optional)"],
    "checkout.summaryFootnote": ["เลขใบส่งมอบออกให้หลังบันทึก แล้วเปิดใบส่งมอบให้พิมพ์ทันที", "The handover number is issued on saving, and the handover document opens for printing."],
    "checkout.footerDescription": ["ส่งมอบ {tag} ให้ {receiver}", "Hand over {tag} to {receiver}"], "checkout.footerIncomplete": ["เลือกทรัพย์สินและผู้รับ", "Choose the asset and the receiver"],
    "checkout.permanentAssignmentHelp": ["ใช้ต่อเนื่อง ไม่มีกำหนดคืน", "Continuous use, no return date"], "checkout.temporaryLoanHelp": ["ต้องคืนตามวันที่กำหนด", "Must be returned by the due date"],
    "assetOperation.summaryHolder": ["ผู้ถือครอง", "Holder"], "assetOperation.summaryDepartment": ["แผนก", "Department"],
    "assetOperation.summaryLocation": ["ที่ตั้ง", "Location"], "assetOperation.summaryStatus": ["สถานะ", "Status"],
    "assetOperation.summaryComponents": ["ส่วนควบ", "Components"], "assetOperation.summaryNone": ["ไม่มี", "None"],
    "assetOperation.summaryNotChosen": ["ยังไม่ได้เลือก", "Not chosen yet"], "assetOperation.summaryKept": ["{value} (คงเดิม)", "{value} (unchanged)"],
    "assetOperation.summaryCount": ["{count} รายการ", "{count}"],
  }
  assert.equal(Object.keys(words).length, 32, "Step 5's keys")
  for (const [key, pair] of Object.entries(words)) assert.deepEqual([word("th", key), word("en", key)], pair, key)
  for (const locale of ["th", "en"] as const) assert.equal(word(locale, "checkout.selectCondition"), undefined, locale)
})
