import assert from "node:assert/strict"
import test from "node:test"
import { filterSearchableOptions } from "../src/lib/searchable-select-filter.ts"

const options = [
  { id: "1", label: "นางสาวศิริวรรณ ปิ่นทอง" },
  { id: "2", label: "Dell Latitude 5420" },
  { id: "3", label: "ฝ่ายซ่อมบำรุง", disabled: true },
]

test("empty query keeps every option in order", () => {
  assert.equal(filterSearchableOptions(options, ""), options)
  assert.equal(filterSearchableOptions(options, "   "), options)
})

test("Thai search ignores spaces", () => {
  assert.deepEqual(filterSearchableOptions(options, "ศิริวรรณปิ่น").map((option) => option.id), ["1"])
  assert.deepEqual(filterSearchableOptions(options, "ซ่อม บำรุง").map((option) => option.id), ["3"])
})

test("Latin search ignores case and spaces", () => {
  assert.deepEqual(filterSearchableOptions(options, "dell lat").map((option) => option.id), ["2"])
})
