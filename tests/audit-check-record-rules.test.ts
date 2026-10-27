import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  AUDIT_CHECK_FIELD_ORDER,
  AUDIT_CHECK_NONE_OPTION_ID,
  auditCheckCustodianOptions,
  auditCheckFoundOptions,
  auditCheckFoundValue,
  auditCheckMarkedFields,
  auditCheckShownFields,
  auditCheckUnchosenFields,
  auditCheckValueFromFound,
  chooseAuditCheckValue,
  pressAuditCheckMatch,
  pressAuditCheckMismatch,
  startAuditCheckRecord,
  type AuditCheckRecord,
} from "../src/lib/audit-check-record-rules.ts"
import { buildCheckDefaults, checkPhotoReasonKey, diffCheckValues, requiresCheckPhoto, type AuditScanItemRow } from "../src/lib/audit-scan-session.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const expected = { location: "L1", custodian: "E1", department: "D1", condition: "C1" }
const employees = [
  { id: "E1", label: "E001 - สมชาย ใจดี", departmentId: "D1" },
  { id: "E2", label: "E002 - สมหญิง รักงาน", departmentId: "D2" },
  { id: "E3", label: "E003 - สมศักดิ์ มั่นคง", departmentId: null },
  { id: "E4", label: "E004 - สมใจ ตั้งใจ", departmentId: "D1" },
]
const personal = { expected, ownershipType: "personal", employees }
const shared = { expected, ownershipType: "shared", employees }
const licence = { expected, ownershipType: "software_license", employees }
const MATCH = { mode: "match", chosen: false } as const
const CHOSEN = { mode: "mismatch", chosen: true } as const
const UNCHOSEN = { mode: "mismatch", chosen: false } as const
const allMatch = { location: MATCH, custodian: MATCH, department: MATCH, condition: MATCH }
const start = (values = expected) => startAuditCheckRecord(values, personal)

test("only the fields the scan route compares are shown: no custodian for a non-personal asset, no location for a licence (bug 22, P3-R11)", () => {
  assert.deepEqual(AUDIT_CHECK_FIELD_ORDER, ["location", "custodian", "department", "condition"])
  assert.deepEqual(auditCheckShownFields("personal"), ["location", "custodian", "department", "condition"])
  for (const type of ["shared", "stock", "component"]) assert.deepEqual(auditCheckShownFields(type), ["location", "department", "condition"], type)
  assert.deepEqual(auditCheckShownFields("software_license"), ["department", "condition"])
  // A missing or unknown type reads as personal, as the server's normalize does.
  assert.deepEqual(auditCheckShownFields(null), ["location", "custodian", "department", "condition"])
  assert.deepEqual(auditCheckShownFields("legacy"), ["location", "custodian", "department", "condition"])
})

test("the sheet opens ตรง where the value is the expected one, ไม่ตรง and chosen where it differs (the walked room, a saved result), and a hidden field sends the expected value", () => {
  assert.deepEqual(start(), { values: expected, fields: allMatch, departmentTouched: false, departmentFollowsCustodian: false })
  // A wrong room (spec §12, my call): the location opens as ไม่ตรง with the walked room chosen.
  const wrongRoom = start({ ...expected, location: "L9" })
  assert.deepEqual(wrongRoom.fields, { ...allMatch, location: CHOSEN })
  assert.equal(wrongRoom.values.location, "L9")
  assert.deepEqual(diffCheckValues(wrongRoom.values, expected, "personal"), ["location"])
  // A saved department that differs is the person's own: a new custodian will not move it.
  assert.deepEqual(start({ ...expected, department: "D3" }), {
    values: { ...expected, department: "D3" },
    fields: { ...allMatch, department: CHOSEN },
    departmentTouched: true,
    departmentFollowsCustodian: false,
  })
  // A shared asset's custodian and a licence's walked room are never compared: hidden, and sent as expected.
  assert.deepEqual(startAuditCheckRecord({ ...expected, custodian: "E2" }, shared), { values: expected, fields: allMatch, departmentTouched: false, departmentFollowsCustodian: false })
  assert.deepEqual(startAuditCheckRecord({ ...expected, location: "L9" }, licence).values, expected)
  // "" is a real value (ไม่มี / ไม่ระบุ): a saved empty custodian opens as ไม่ตรง, chosen.
  assert.deepEqual(start({ ...expected, custodian: "" }).fields.custodian, CHOSEN)
})

test("editing a recorded result opens each field as it was saved: a saved difference is ไม่ตรง with that value chosen, the rest ตรง, and the walked room never applies (P3-R21)", () => {
  // The fields buildCheckDefaults reads in edit mode: the saved actual* values, the location falling back to the expected one.
  const saved = { expectedLocationId: "L1", actualLocationId: "L2", actualCustodianId: "E1", actualDepartmentId: "D1", actualConditionId: "C2" } as AuditScanItemRow
  const edit = startAuditCheckRecord(buildCheckDefaults({ mode: "edit", item: saved, room: { locationId: "L9", departmentId: "" } }), personal)
  assert.deepEqual(edit.values, { location: "L2", custodian: "E1", department: "D1", condition: "C2" })
  assert.deepEqual(edit.fields, { ...allMatch, location: CHOSEN, condition: CHOSEN })
  assert.equal(auditCheckFoundValue(edit, "location"), "L2", "the saved room is the chosen ที่พบ")
  assert.deepEqual(auditCheckMarkedFields(edit, "personal"), ["location", "condition"])
  assert.deepEqual(diffCheckValues(edit.values, expected, "personal"), ["location", "condition"], "saving unchanged sends the saved result again")
  // A result saved as matched opens all ตรง, whatever room the walk is in.
  const matched = { ...saved, actualLocationId: "L1", actualConditionId: "C1" } as AuditScanItemRow
  assert.deepEqual(startAuditCheckRecord(buildCheckDefaults({ mode: "edit", item: matched, room: { locationId: "L9", departmentId: "" } }), personal).fields, allMatch)
})

test("ไม่ตรง opens ที่พบ with nothing chosen; a choice makes the row differ; the expected value or ตรง turns it back (spec §12, P3-R8)", () => {
  const pressed = pressAuditCheckMismatch(start(), "condition")
  assert.deepEqual(pressed.fields, { ...allMatch, condition: UNCHOSEN })
  assert.deepEqual(pressed.values, expected, "the value waits for a choice")
  assert.equal(pressAuditCheckMismatch(pressed, "condition"), pressed, "pressed again: nothing changes")
  assert.deepEqual(auditCheckUnchosenFields(pressed, "personal"), ["condition"])
  assert.deepEqual(auditCheckMarkedFields(pressed, "personal"), ["condition"])
  assert.deepEqual(diffCheckValues(pressed.values, expected, "personal"), [], "the saved diff stays the chosen values")
  assert.equal(auditCheckFoundValue(pressed, "condition"), "", "the picker shows its placeholder")
  const chosen = chooseAuditCheckValue(pressed, "condition", "C2", personal)
  assert.deepEqual(chosen.fields, { ...allMatch, condition: CHOSEN })
  assert.equal(chosen.values.condition, "C2")
  assert.deepEqual(auditCheckUnchosenFields(chosen, "personal"), [])
  assert.deepEqual(diffCheckValues(chosen.values, expected, "personal"), ["condition"])
  assert.equal(auditCheckFoundValue(chosen, "condition"), "C2")
  assert.deepEqual(chooseAuditCheckValue(chosen, "condition", "C1", personal), start(), "choosing the expected value is ตรง")
  assert.deepEqual(pressAuditCheckMatch(chosen, "condition", personal), start(), "ตรง resets the value")
  assert.deepEqual(pressAuditCheckMatch(start({ ...expected, location: "L9" }), "location", personal), start(), "ตรง on a wrong room takes the expected room")
})

test("ไม่มี / ไม่ระบุ is a choosable option for every field but the location, the condition included, and stands for an empty value (P3-R9, P3-R20)", () => {
  const options = [{ id: "X1", label: "X1 - ตัวเลือก" }]
  assert.equal(AUDIT_CHECK_NONE_OPTION_ID, "__none__")
  assert.deepEqual(auditCheckFoundOptions("location", options, "ไม่มี / ไม่ระบุ"), options)
  for (const field of ["custodian", "department", "condition"] as const) {
    assert.deepEqual(auditCheckFoundOptions(field, options, "ไม่มี / ไม่ระบุ"), [{ id: "__none__", label: "ไม่มี / ไม่ระบุ" }, ...options], field)
  }
  assert.equal(auditCheckValueFromFound("__none__"), "")
  assert.equal(auditCheckValueFromFound("E2"), "E2")
  const none = chooseAuditCheckValue(pressAuditCheckMismatch(start(), "custodian"), "custodian", auditCheckValueFromFound("__none__"), personal)
  assert.equal(none.values.custodian, "")
  assert.deepEqual(none.fields.custodian, CHOSEN)
  assert.equal(auditCheckFoundValue(none, "custodian"), "__none__")
  assert.deepEqual(diffCheckValues(none.values, expected, "personal"), ["custodian"])
  // Nobody holds it: no department to follow, so the department stays as expected.
  assert.deepEqual(none.fields.department, MATCH)
  assert.equal(none.values.department, "D1")
})

test("a new custodian of a personal asset brings that person's department, visibly, unless the person set the department; ตรง takes it back (N-AU1, spec §12, P3-R11)", () => {
  const found = chooseAuditCheckValue(start(), "custodian", "E2", personal)
  assert.deepEqual(found, {
    values: { ...expected, custodian: "E2", department: "D2" },
    fields: { ...allMatch, custodian: CHOSEN, department: CHOSEN },
    departmentTouched: false,
    departmentFollowsCustodian: true,
  })
  const diff = diffCheckValues(found.values, expected, "personal")
  assert.deepEqual(diff, ["custodian", "department"])
  assert.equal(requiresCheckPhoto("scan", diff), true, "the department's photo rule stays visible")
  assert.equal(checkPhotoReasonKey("scan", diff), "photoRequiredPlacement")
  // ตรง on the custodian, or the expected custodian chosen again, takes the followed department back.
  assert.deepEqual(pressAuditCheckMatch(found, "custodian", personal), start())
  assert.deepEqual(chooseAuditCheckValue(found, "custodian", "E1", personal), start())
  // A custodian of the expected department: the department is ตรง again.
  assert.deepEqual(chooseAuditCheckValue(found, "custodian", "E4", personal), {
    values: { ...expected, custodian: "E4" },
    fields: { ...allMatch, custodian: CHOSEN },
    departmentTouched: false,
    departmentFollowsCustodian: false,
  })
  // A custodian with no department: nothing to follow, so the followed department goes back.
  assert.deepEqual(chooseAuditCheckValue(found, "custodian", "E3", personal), {
    values: { ...expected, custodian: "E3" },
    fields: { ...allMatch, custodian: CHOSEN },
    departmentTouched: false,
    departmentFollowsCustodian: false,
  })
  // The person's own department wins: chosen, pressed ไม่ตรง (still to choose), or pressed ตรง.
  const ownDepartment = chooseAuditCheckValue(chooseAuditCheckValue(start(), "department", "D3", personal), "custodian", "E2", personal)
  assert.deepEqual(ownDepartment.values, { ...expected, custodian: "E2", department: "D3" })
  assert.equal(ownDepartment.departmentFollowsCustodian, false)
  const waiting = chooseAuditCheckValue(pressAuditCheckMismatch(start(), "department"), "custodian", "E2", personal)
  assert.deepEqual(waiting.fields.department, UNCHOSEN)
  assert.equal(waiting.values.department, "D1")
  assert.deepEqual(auditCheckUnchosenFields(waiting, "personal"), ["department"])
  const keptDepartment = chooseAuditCheckValue(pressAuditCheckMatch(start(), "department", personal), "custodian", "E2", personal)
  assert.deepEqual(keptDepartment.fields.department, MATCH)
  assert.equal(keptDepartment.values.department, "D1")
  // A department saved earlier counts as set.
  assert.equal(chooseAuditCheckValue(start({ ...expected, department: "D3" }), "custodian", "E2", personal).values.department, "D3")
  // Only where the custodian is compared: a shared asset's custodian never moves its department (bug 22's knock-on).
  assert.equal(chooseAuditCheckValue(startAuditCheckRecord(expected, shared), "custodian", "E2", shared).values.department, "D1")
})

test("one rule: a shown field is ไม่ตรง with a value exactly when the server's diff names it, and a row still to choose keeps the expected value (P3-R8)", () => {
  const steps: Array<(record: AuditCheckRecord) => AuditCheckRecord> = [
    (record) => record,
    (record) => pressAuditCheckMismatch(record, "location"),
    (record) => chooseAuditCheckValue(record, "location", "L2", personal),
    (record) => chooseAuditCheckValue(record, "custodian", "E2", personal),
    (record) => pressAuditCheckMismatch(record, "condition"),
    (record) => chooseAuditCheckValue(record, "custodian", "", personal),
    (record) => chooseAuditCheckValue(record, "condition", "", personal),
    (record) => pressAuditCheckMatch(record, "location", personal),
    (record) => chooseAuditCheckValue(record, "department", "D1", personal),
    (record) => chooseAuditCheckValue(record, "custodian", "E2", personal),
  ]
  const order = (fields: readonly string[]) => [...fields].sort((a, b) => AUDIT_CHECK_FIELD_ORDER.indexOf(a as never) - AUDIT_CHECK_FIELD_ORDER.indexOf(b as never))
  let record = start({ ...expected, location: "L9" })
  steps.forEach((step, index) => {
    record = step(record)
    const diff = diffCheckValues(record.values, expected, "personal")
    for (const field of auditCheckShownFields("personal")) {
      const state = record.fields[field]
      assert.equal(state.mode === "mismatch" && state.chosen, diff.includes(field), `step ${index}: ${field}`)
      if (state.mode === "mismatch" && !state.chosen) assert.equal(record.values[field], expected[field], `step ${index}: ${field} waits`)
    }
    // The save label's fields: the diff plus the rows still to choose, in field order.
    assert.deepEqual(auditCheckMarkedFields(record, "personal"), order([...new Set([...diff, ...auditCheckUnchosenFields(record, "personal")])]), `step ${index}`)
  })
})

test("custodian options read code - name · department, so the department is searchable too (P3-R10)", () => {
  const departments = [{ id: "D1", label: "D01 - ฝ่ายบัญชี" }, { id: "D2", label: "D02 - ฝ่ายขาย" }]
  assert.deepEqual(auditCheckCustodianOptions([...employees, { id: "E5", label: "E005 - สมพร ย้ายแผนก", departmentId: "D9" }], departments), [
    { id: "E1", label: "E001 - สมชาย ใจดี · D01 - ฝ่ายบัญชี" },
    { id: "E2", label: "E002 - สมหญิง รักงาน · D02 - ฝ่ายขาย" },
    { id: "E3", label: "E003 - สมศักดิ์ มั่นคง" },
    { id: "E4", label: "E004 - สมใจ ตั้งใจ · D01 - ฝ่ายบัญชี" },
    { id: "E5", label: "E005 - สมพร ย้ายแผนก" },
  ])
})

test("the record rules are pure: node --test imports them", () => {
  const source = read("src/lib/audit-check-record-rules.ts")
  assert.doesNotMatch(source, /from "@\//)
  assert.doesNotMatch(source, /^import (?!type )[^\n]*from "@prisma\/client"/m)
  assert.doesNotMatch(source, /"use client"|\buse(?:State|Effect|Memo)\b/)
})
