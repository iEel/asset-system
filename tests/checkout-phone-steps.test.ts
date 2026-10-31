import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { checkoutPhonePartClass, checkoutPhoneParts, formatCheckoutDay, getCheckoutSignStatement } from "../src/lib/checkout-phone-steps.ts"
import { shouldDropSignature, signaturePadHeight } from "../src/lib/signature-pad-size.ts"

const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")
const checkout = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`)).checkout as Record<string, string>

test("one form, three phone steps: a part shows below lg only on its steps, a phone-only part never from lg (P1-R4)", () => {
  const H = "max-lg:hidden", P = "lg:hidden"
  assert.deepEqual(Object.fromEntries(checkoutPhoneParts.map((part) => [part, ([1, 2, 3] as const).map((step) => checkoutPhonePartClass(part, step))])), {
    asset: ["", H, H], receiver: ["", H, H], evidence: ["", H, ""], evidenceHeading: ["", H, H], photo: ["", H, H], dateField: ["", H, H], signature: [H, H, ""],
    stepsBar: [P, P, P], stepsFooter: [P, P, P], dateLine: [P, "hidden", "hidden"], readBack: ["hidden", P, "hidden"], statement: ["hidden", "hidden", P],
  })
})

test("the pad drops a drawing only when it is hidden; any other width change keeps it (final review M1)", () => {
  assert.equal(shouldDropSignature(320, 0), true, "hidden, as on leaving the phone's step 3")
  assert.equal(shouldDropSignature(0, 0), false, "already hidden")
  assert.equal(shouldDropSignature(0, 320), false, "shown again")
  assert.equal(shouldDropSignature(640, 623), false, "a scrollbar appeared")
  assert.equal(shouldDropSignature(640, 900), false, "a wider window")
  assert.equal(shouldDropSignature(640, 640), false)
})

test("dates read as Bangkok days, the Buddhist year in Thai; the statement and the pad's height (spec §5, §7.4)", () => {
  assert.deepEqual([formatCheckoutDay("2026-10-30", "th"), formatCheckoutDay("2026-10-30", "en"), formatCheckoutDay("", "th"), formatCheckoutDay("2026-13-40", "th")], ["30 ต.ค. 2569", "30 Oct 2026", "", ""])
  assert.deepEqual(getCheckoutSignStatement({ checkoutType: "user", travellingCount: 2 }), { key: "signStatement", onBehalf: false })
  assert.deepEqual(getCheckoutSignStatement({ checkoutType: "user", travellingCount: 0 }), { key: "signStatementNoComponents", onBehalf: false })
  assert.deepEqual(getCheckoutSignStatement({ checkoutType: "department", travellingCount: 1 }), { key: "signStatement", onBehalf: true })
  assert.deepEqual(getCheckoutSignStatement({ checkoutType: "location", travellingCount: 0 }), { key: "signStatementNoComponents", onBehalf: true })
  assert.deepEqual([signaturePadHeight(false, 390, 664), signaturePadHeight(true, 390, 664), signaturePadHeight(true, 844, 390), signaturePadHeight(true, 390, 300), signaturePadHeight(true, 1440, 900)], [180, 280, 195, 180, 180])
})

test("the phone steps' words, Thai and English (spec §7.4, board TX-Checkout-Phone-1/2/3)", () => {
  const words: Record<string, [string, string]> = {
    phoneStepsLabel: ["ขั้นตอนการส่งมอบ", "Handover steps"], phoneStep1: ["ทรัพย์สินและผู้รับ", "Asset and receiver"],
    phoneStep2: ["ให้ผู้รับตรวจ", "Receiver checks"], phoneStep3: ["ลงชื่อรับ", "Receiver signs"],
    phoneCancelBack: ["ยกเลิกและกลับ", "Cancel and go back"], phoneBackToEdit: ["ย้อนกลับไปแก้ไข", "Back to edit"],
    phoneBackToCheck: ["ย้อนกลับไปขั้นตรวจ", "Back to the check"], phoneNext: ["ถัดไป: ให้ผู้รับตรวจ", "Next: receiver checks"],
    phoneAccept: ["ถูกต้อง ลงชื่อรับ", "Correct, sign to receive"], phoneFix: ["มีบางอย่างไม่ถูกต้อง กลับไปแก้", "Something is wrong, go back"],
    phoneSave: ["บันทึกการส่งมอบ", "Save the handover"], phoneDateToday: ["วันที่ส่งมอบ: วันนี้ {date}", "Handover date: today, {date}"],
    phoneDateOther: ["วันที่ส่งมอบ: {date}", "Handover date: {date}"], phoneDateChange: ["เปลี่ยนวันที่ส่งมอบ", "Change the handover date"],
    readBackHandOver: ["ยื่นมือถือให้ผู้รับอ่านรายการนี้ก่อนลงชื่อ", "Hand the phone to the receiver to read this before signing."],
    readBackReceiving: ["{receiver} กำลังรับ", "{receiver} is receiving"], readBackTagSerial: ["{tag} · S/N {serial}", "{tag} · S/N {serial}"],
    readBackPhotoCount: ["รูปก่อนส่งมอบ {count} รูป", "{count, plural, one {Photo before handover: #} other {Photos before handover: #}}"], readBackNoPhoto: ["ยังไม่มีรูปก่อนส่งมอบ", "No photo before handover"],
    readBackComponents: ["ได้รับพร้อมกัน {count} รายการ", "Received with it: {count}"], readBackCondition: ["สภาพตอนรับ", "Condition on receipt"],
    deliveredBy: ["ผู้ส่งมอบ", "Handed over by"],
    signStatement: ["ข้าพเจ้าได้รับ {tag} พร้อมส่วนควบ {count} รายการ ในสภาพ{condition}", "I have received {tag} with {count, plural, one {# component} other {# components}}, in {condition} condition."],
    signStatementNoComponents: ["ข้าพเจ้าได้รับ {tag} ในสภาพ{condition}", "I have received {tag} in {condition} condition."],
    signOnBehalf: ["รับในนามของ {destination}", "Received on behalf of {destination}"],
    signLandscapeHint: ["หมุนมือถือเป็นแนวนอน เพื่อเซ็นได้กว้างขึ้น", "Turn the phone sideways for a wider signing area."],
  }
  for (const [key, pair] of Object.entries(words)) assert.deepEqual([checkout("th")[key], checkout("en")[key]], pair, key)
})

test("the form, the frame, the pad, the focus and the page carry the steps (P1-R4)", () => {
  const form = read("src/components/asset-operations/checkout-form.tsx")
  for (const part of ['const isDesktop = useMediaQuery("(min-width: 64rem)")', "const [step, setStep] = useState<CheckoutPhoneStep>(1)", "if (!isDesktop) return showStepOne()",
    'if (action === "review") return setReviewOpen(true)', 'if (action === "nextStep") return moveToStep(2)', 'if (action === "save") return void submitCheckout()',
    'className={cn("mb-4", checkoutPhonePartClass("evidenceHeading", step))}',
    'checkoutPhonePartClass("readBack", step)', "tall",
    "fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })"]) assert.ok(form.includes(part), part)
  // phoneSteps after description=, so Task 6's form-frames-ui regex (title= then description=) still reads the frame.
  assert.match(form, /<OperationFormFrame\n\s+title=\{t\("title"\)\}\n\s+description=\{t\("description"\)\}\n\s+phoneSteps\n/)
  // Task 6's hooks stay; each part's class sits beside its data-checkout-part.
  for (const part of ["asset", "receiver", "evidence", "photo", "signature"]) assert.match(form, new RegExp(`data-checkout-part="${part}" className=\\{(?:cn\\()?checkoutPhonePartClass\\("${part}", step\\)`), part)
  const at = (text: string) => {
    const index = form.indexOf(text)
    assert.ok(index >= 0, text)
    return index
  }
  assert.ok(at("<OperationFormFrame") < at("<CheckoutPhoneBar") && at("<CheckoutPhoneBar") < at("<CheckoutReadBack") && at("<CheckoutReadBack") < at("<FormSection number={1}"), "the bar, then the read-back, open the frame's children")
  assert.match(form, /<\/OperationFormFrame>\n\s+<StickyFormFooter className=\{checkoutPhonePartClass\("stepsFooter", step\)\} status=[^\n]*>\n[\s\S]*?<\/StickyFormFooter>\n\s+<\/form>/, "the phone bar follows the frame as the form's last child; its status line is step 1's failed-read warning (final review I1)")
  const phoneBar = form.slice(form.indexOf('<StickyFormFooter className={checkoutPhonePartClass("stepsFooter", step)} status='), form.lastIndexOf("</StickyFormFooter>"))
  assert.ok(phoneBar.includes('variant="outline"') && phoneBar.indexOf('variant="outline"') < phoneBar.indexOf('type="submit"'), "GD4: phoneFix comes before the submits in the source")
  assert.doesNotMatch(read("src/lib/checkout-phone-steps.ts"), /export type CheckoutPhoneStep\b/, "the step type is checkout-form-rules.ts's alone")
  const frame = read("src/components/asset-operations/operation-form-frame.tsx")
  assert.equal(frame.split('(phoneSteps || !summaryOnPhone) && "max-lg:hidden"').length - 1, 1, "the summary column (รับคืน's summaryOnPhone={false} hides it too, group 3 plan 2 Task 8)")
  assert.equal(frame.split('"lg:col-span-2", phoneSteps && "max-lg:hidden"').length - 1, 1, "the footer")
  const pad = read("src/components/asset-operations/signature-pad.tsx")
  for (const part of ["signaturePadHeight(tall, window.innerWidth, window.innerHeight)", "onChangeRef.current(null)", "if (shouldDropSignature(previousWidth, width)) {", "context.drawImage(image, 0, 0, width, height)"]) assert.ok(pad.includes(part), part)
  assert.ok(read("src/app/[locale]/(dashboard)/asset-management/checkout/page.tsx").includes("deliveredByLabel={getUserDisplayLabel(user)}"))
})
