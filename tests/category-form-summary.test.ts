import assert from "node:assert/strict"
import test from "node:test"

import {
  categoryChangeParts,
  categoryFormTotals,
  categoryStatusLocked,
  diffCategoryForm,
  normalizePhotoChecklist,
  type CategoryFormSnapshot,
} from "../src/lib/category-form-summary.ts"

// Group 8 plan 2 Task 3: the side panel ผลของการแก้ไข (G8P2-R3), the sticky footer's change summary and the status rule
// of section 4 (board MD-Category-Edit).

const field = (id: string | undefined, fieldName: string, overrides: Partial<CategoryFormSnapshot["customFieldDefs"][number]> = {}) => ({
  id,
  fieldName,
  fieldLabel: fieldName.toUpperCase(),
  fieldLabelTh: null,
  fieldType: "text" as const,
  options: null,
  isRequired: false,
  ...overrides,
})

const saved: CategoryFormSnapshot = {
  code: "NB",
  name: "โน้ตบุ๊ก",
  description: "",
  isActive: true,
  customFieldDefs: [field("a", "cpu", { isRequired: true }), field("b", "ram", { isRequired: true }), field("c", "disk")],
  photoChecklist: ["หน้าเครื่อง", "Serial Number"],
}

test("the totals count fields, required fields, photo items as the server saves them, and the status", () => {
  assert.deepEqual(categoryFormTotals(saved), { fields: 3, required: 2, photos: 2, isActive: true })
  // The photo checklist saves trimmed, blank-free and de-duplicated (serializePhotoChecklist), so the count follows it.
  assert.deepEqual(normalizePhotoChecklist([" หน้าเครื่อง ", "", "หน้าเครื่อง", "ป้าย"]), ["หน้าเครื่อง", "ป้าย"])
  assert.equal(categoryFormTotals({ ...saved, photoChecklist: [" a ", "a", "  "] }).photos, 1)
})

test("no change: an untouched form diffs to nothing and the footer has no parts", () => {
  const changes = diffCategoryForm(saved, structuredClone(saved))
  assert.deepEqual(changes, {
    fieldsAdded: 0,
    fieldsEdited: 0,
    fieldsRemoved: 0,
    fieldsReordered: false,
    addedFieldNames: [],
    addedRequired: 0,
    photosAdded: 0,
    photosRemoved: 0,
    photosReordered: false,
    infoChanged: false,
    descriptionChanged: false,
    status: null,
  })
  assert.deepEqual(categoryChangeParts(changes), [])
})

test("fields compare by their saved id (G8P2-R2): added rows carry no id, an edit is any changed property, a missing id is removed", () => {
  const current: CategoryFormSnapshot = {
    ...saved,
    customFieldDefs: [
      field("a", "cpu", { isRequired: true, fieldLabel: "Processor" }),
      field("c", "disk"),
      field(undefined, "mac_address", { fieldLabel: "MAC address" }),
      field(undefined, "warranty", { fieldLabel: "Warranty", fieldLabelTh: "ประกัน", isRequired: true }),
    ],
  }
  const changes = diffCategoryForm(saved, current)
  assert.equal(changes.fieldsAdded, 2)
  assert.equal(changes.fieldsEdited, 1)
  assert.equal(changes.fieldsRemoved, 1)
  assert.equal(changes.fieldsReordered, false, "a and c keep their order")
  assert.deepEqual(changes.addedFieldNames, ["MAC address", "ประกัน"], "the Thai label first, then the label")
  assert.equal(changes.addedRequired, 1)
  assert.deepEqual(categoryChangeParts(changes), [
    { key: "fieldsAdded", count: 2 },
    { key: "fieldsEdited", count: 1 },
    { key: "fieldsRemoved", count: 1 },
  ])
})

test("an edit counts the type, the options as stored, the Thai label and จำเป็น; trailing spaces and option spacing do not", () => {
  const base = field("x", "color", { fieldType: "select", options: "แดง\nเขียว" })
  const savedSelect = { ...saved, customFieldDefs: [base] }
  const same = diffCategoryForm(savedSelect, { ...saved, customFieldDefs: [{ ...base, fieldName: "color ", options: "แดง, เขียว" }] })
  assert.equal(same.fieldsEdited, 0)
  for (const change of [{ fieldType: "text" as const }, { options: "แดง" }, { fieldLabelTh: "สี" }, { isRequired: true }]) {
    assert.equal(diffCategoryForm(savedSelect, { ...saved, customFieldDefs: [{ ...base, ...change }] }).fieldsEdited, 1, JSON.stringify(change))
  }
})

test("moving saved rows is a reorder; photo items diff as the saved lists", () => {
  const reordered = diffCategoryForm(saved, { ...saved, customFieldDefs: [saved.customFieldDefs[1], saved.customFieldDefs[0], saved.customFieldDefs[2]] })
  assert.equal(reordered.fieldsReordered, true)
  assert.equal(reordered.fieldsEdited, 0)
  assert.deepEqual(categoryChangeParts(reordered), [{ key: "fieldsReordered" }])

  const photos = diffCategoryForm(saved, { ...saved, photoChecklist: ["Serial Number", "ป้ายรหัส", "อะแดปเตอร์", ""] })
  assert.equal(photos.photosAdded, 2)
  assert.equal(photos.photosRemoved, 1)
  assert.equal(photos.photosReordered, false)
  assert.deepEqual(categoryChangeParts(photos), [
    { key: "photosAdded", count: 2 },
    { key: "photosRemoved", count: 1 },
  ])
  const photoOrder = diffCategoryForm(saved, { ...saved, photoChecklist: ["Serial Number", "หน้าเครื่อง "] })
  assert.deepEqual(categoryChangeParts(photoOrder), [{ key: "photosReordered" }])
})

test("code or name, description and the status each add their part, in the footer's order", () => {
  const changes = diffCategoryForm(saved, { ...saved, code: "NB2", description: "เครื่องพกพา", isActive: false })
  assert.equal(changes.infoChanged, true)
  assert.equal(changes.descriptionChanged, true)
  assert.equal(changes.status, "deactivated")
  assert.deepEqual(categoryChangeParts(changes), [{ key: "info" }, { key: "description" }, { key: "deactivated" }])
  assert.equal(diffCategoryForm({ ...saved, isActive: false }, saved).status, "activated")
  // A null description and an empty one are the same saved value.
  assert.equal(diffCategoryForm({ ...saved, description: null }, { ...saved, description: " " }).descriptionChanged, false)
})

test("the status checkbox locks only while an active saved category with models or assets stays ticked", () => {
  const reason = "ปิดใช้งานหมวดหมู่นี้ไม่ได้ เพราะยังผูกกับทรัพย์สิน 2 รายการ (นับรวมที่ปิดใช้งานแล้ว)"
  assert.equal(categoryStatusLocked({ savedIsActive: true, isActive: true, blockReason: reason }), true)
  assert.equal(categoryStatusLocked({ savedIsActive: true, isActive: true, blockReason: null }), false, "nothing in it")
  assert.equal(categoryStatusLocked({ savedIsActive: false, isActive: false, blockReason: reason }), false, "an inactive category can always be ticked back on")
  assert.equal(categoryStatusLocked({ savedIsActive: false, isActive: true, blockReason: reason }), false, "and unticked again before saving")
  assert.equal(categoryStatusLocked({ savedIsActive: undefined, isActive: true, blockReason: null }), false, "create")
})
