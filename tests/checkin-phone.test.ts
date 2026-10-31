import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { checkinPeopleOpen, checkinPhoneFooterCounts, checkinPhonePartClass, checkinPhoneParts } from "../src/lib/checkin-phone.ts"

const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`)) as Record<string, Record<string, string>>

test("below lg ผู้คืน and ผู้รับคืน fold into one line; แก้ไข, an empty field or an error shows both; from lg both always show (spec §8.8)", () => {
  // [closed, open]. "contents" keeps the two fields cells of section 2's grid, so from lg the layout does not move.
  assert.deepEqual(Object.fromEntries(checkinPhoneParts.map((part) => [part, [checkinPhonePartClass(part, false), checkinPhonePartClass(part, true)]])), {
    people: ["max-lg:hidden lg:contents", "contents"],
    peopleLine: ["lg:hidden", "hidden"],
  })
  const both = { opened: false, returnBy: "E001 - สมชาย ใจดี", receiveBy: "IT01 - สมศรี มีสุข", returnByError: false, receiveByError: false }
  assert.equal(checkinPeopleOpen(both), false, "the holder and you, both chosen: the line")
  assert.equal(checkinPeopleOpen({ ...both, opened: true }), true, "แก้ไข, or a pick in either field")
  assert.equal(checkinPeopleOpen({ ...both, returnBy: "" }), true, "no ผู้คืน: nothing chosen yet, or a handover to a department or a room")
  assert.equal(checkinPeopleOpen({ ...both, receiveBy: "" }), true, "no ผู้รับคืน: the signed-in user has no employee")
  assert.equal(checkinPeopleOpen({ ...both, returnByError: true }), true, "an error under ผู้คืน, P2-R18's included: the focus target shows")
  assert.equal(checkinPeopleOpen({ ...both, receiveByError: true }), true, "a refusal under ผู้รับคืน after the review")
})

test("the phone's footer counts the components back and missing; no components, or a late return, keep the desktop line (spec §8.8, P2-R4)", () => {
  assert.deepEqual(checkinPhoneFooterCounts({ lateReturn: false, returned: 1, missing: 1 }), { returned: 1, missing: 1 })
  assert.deepEqual(checkinPhoneFooterCounts({ lateReturn: false, returned: 2, missing: 0 }), { returned: 2, missing: 0 })
  assert.deepEqual(checkinPhoneFooterCounts({ lateReturn: false, returned: 0, missing: 2 }), { returned: 0, missing: 2 })
  assert.equal(checkinPhoneFooterCounts({ lateReturn: false, returned: 0, missing: 0 }), null, "no components (or none read yet): รับคืน <tag> จาก <ผู้คืน>")
  assert.equal(checkinPhoneFooterCounts({ lateReturn: true, returned: 1, missing: 0 }), null, "the late return keeps รับคืน <component tag> จาก <holder>")
})

test("the phone's words, Thai and English (spec §8.8, board TX-Checkin-Phone)", () => {
  const words: Record<string, [string, string]> = {
    phonePeople: ["ผู้คืน / ผู้รับคืน: {returnBy} / {receiveBy}", "Returned by / received by: {returnBy} / {receiveBy}"],
    phonePeopleEdit: ["แก้ไขผู้คืนและผู้รับคืน", "Edit who returns it and who receives it"],
    phoneFooterComponents: ["ส่วนควบได้คืน {returned} · ขาด {missing}", "Components back: {returned} · missing: {missing}"],
  }
  for (const [key, pair] of Object.entries(words)) assert.deepEqual([messages("th").checkin[key], messages("en").checkin[key]], pair, key)
  // The button's visible word; its accessible name (phonePeopleEdit) starts with it (label in name).
  assert.deepEqual([messages("th").common.edit, messages("en").common.edit], ["แก้ไข", "Edit"])
})

test("the form: one line opens both people fields, the footer's phone line, the card's warnings on the phone, the camera (spec §8.8, P2-R12)", () => {
  const form = read("src/components/asset-operations/checkin-form.tsx")
  for (const part of [
    'import { checkinPeopleOpen, checkinPhoneFooterCounts, checkinPhonePartClass } from "@/lib/checkin-phone"',
    "const [phonePeopleOpen, setPhonePeopleOpen] = useState(false)",
    'const isDesktop = useMediaQuery("(min-width: 64rem)")',
    "summaryOnPhone={false}",
    "warnings={summaryWarnings}",
    // T9's lateReturn (lateReturnOf): a blocked outstanding row keeps sections 2 and 3, and its counts (X19).
    "const phoneFooterCounts = checkinPhoneFooterCounts({ lateReturn: lateReturn !== null, returned: travelling.length - missingComponents.length, missing: missingComponents.length })",
    't("phonePeople", { returnBy: selectedReturnBy?.label ?? "", receiveBy: selectedReceiver?.label ?? "" })',
    '<Button type="button" variant="ghost" size="sm" aria-label={t("phonePeopleEdit")} onClick={openPhonePeople}>',
    'requestAnimationFrame(() => document.getElementById("checkin-return-by")?.focus())',
  ]) assert.ok(form.includes(part), part)
  assert.match(form, /const peopleOpen = checkinPeopleOpen\(\{\n\s+opened: phonePeopleOpen,\n\s+returnBy: selectedReturnBy\?\.label \?\? "",\n\s+receiveBy: selectedReceiver\?\.label \?\? "",\n\s+returnByError: Boolean\(fieldErrors\.errors\.returnBy\),\n\s+receiveByError: Boolean\(fieldErrors\.errors\.receiveBy\),\n\s+\}\)/)
  assert.match(form, /<div data-checkin-people-line className=\{cn\("flex min-w-0 items-center justify-between gap-3 md:col-span-2", checkinPhonePartClass\("peopleLine", peopleOpen\)\)\}>/)
  assert.match(form, /<div data-checkin-part="people" className=\{checkinPhonePartClass\("people", peopleOpen\)\}>\n\s+<SearchableSelect\n\s+id="checkin-return-by"\n[\s\S]*?\/>\n\s+<SearchableSelect\n\s+id="checkin-receive-by"\n[\s\S]*?\/>\n\s+<\/div>/)
  const at = (text: string, from = 0) => {
    const index = form.indexOf(text, from)
    assert.ok(index >= 0, text)
    return index
  }
  // Section 2 by its title: T9's late panel has its own FormSection number={2} earlier in the source.
  const section2 = '<FormSection number={2} title={t("sectionReturn")}>'
  assert.ok(
    at(section2) < at("data-checkin-people-line") && at("data-checkin-people-line") < at('data-checkin-part="people"') &&
      at('data-checkin-part="people"') < at('id="checkin-return-by"') && at('id="checkin-return-by"') < at('id="checkin-receive-by"') &&
      at('id="checkin-receive-by"') < at("<FormSection number={3}"),
    "section 2 opens with the line, then the two fields",
  )
  const people = form.slice(at('<div data-checkin-part="people"'), at("<FormSection number={3}"))
  assert.equal(people.match(/onChange=\{\(value\) => \{\n\s+setPhonePeopleOpen\(true\)\n/g)?.length, 2, "a pick in either field keeps both open, so they never fold under the finger")
  assert.match(form, /description: phoneFooterCounts \? \(\n\s+<>\n\s+<span className="max-lg:hidden">\{footerLine\}<\/span>\n\s+<span className="lg:hidden">\{t\("phoneFooterComponents", phoneFooterCounts\)\}<\/span>\n\s+<\/>\n\s+\) : footerLine,/)
  // The card's warnings, below lg only and as the frame's last child (the card is hidden there, P2-R12). Never rendered
  // on the desktop, so a desktop locator meets each warning once.
  assert.match(form, /\{!isDesktop && summaryWarnings\.length > 0 \? \(\n\s+<div data-checkin-phone-warnings className="grid gap-2 lg:hidden">\n\s+\{summaryWarnings\.map\(\(warning, index\) => \(\n\s+<Notice key=\{index\} tone="warning">[\s\S]*?\) : null\}\n\s+<\/OperationFormFrame>/)
  const dropzone = form.slice(at("<FileDropzone"), at("/>", at("<FileDropzone")))
  assert.ok(dropzone.includes('accept="image/*"') && dropzone.includes('capture="environment"'), "a phone opens the camera for the photos (spec §8.8)")
  assert.equal(form.match(/\bid="checkin-return-by"/g)?.length, 1, "the line takes no id; v-track's once-per-page rule holds")
})
