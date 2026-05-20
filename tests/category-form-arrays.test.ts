import assert from "node:assert/strict"
import test from "node:test"

import { duplicateCategoryCustomField, moveArrayItem } from "../src/lib/category-form-arrays.ts"

test("moves an array item without mutating the original list", () => {
  const source = ["a", "b", "c"]

  assert.deepEqual(moveArrayItem(source, 2, 0), ["c", "a", "b"])
  assert.deepEqual(source, ["a", "b", "c"])
})

test("ignores move requests outside the list bounds", () => {
  assert.deepEqual(moveArrayItem(["a", "b"], 0, -1), ["a", "b"])
  assert.deepEqual(moveArrayItem(["a", "b"], 0, 3), ["a", "b"])
})

test("duplicates custom field definitions with a safe field name", () => {
  const duplicated = duplicateCategoryCustomField({
    id: "field-1",
    fieldName: "cpu",
    fieldLabel: "CPU",
    fieldLabelTh: "ซีพียู",
    fieldType: "text",
    options: "",
    isRequired: false,
    sortOrder: 0,
    isActive: true,
  })

  assert.deepEqual(duplicated, {
    fieldName: "cpu_copy",
    fieldLabel: "CPU Copy",
    fieldLabelTh: "ซีพียู Copy",
    fieldType: "text",
    options: "",
    isRequired: false,
    sortOrder: 0,
    isActive: true,
  })
})
