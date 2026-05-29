import assert from "node:assert/strict"
import test from "node:test"

import {
  applyCategoryPrefixGroupEdit,
  buildCategoryPrefixGroups,
  parsePrefixRows,
  serializePrefixRows,
} from "../src/lib/category-prefix-groups.ts"

test("groups category prefix rows by normalized prefix", () => {
  assert.deepEqual(
    buildCategoryPrefixGroups([
      { categoryId: "cat-a", prefix: " com " },
      { categoryId: "cat-b", prefix: "COM" },
      { categoryId: "cat-c", prefix: "ups" },
      { categoryId: "", prefix: "FUR" },
      { categoryId: "cat-d", prefix: "" },
    ]),
    [
      { prefix: "COM", categoryIds: ["cat-a", "cat-b"] },
      { prefix: "UPS", categoryIds: ["cat-c"] },
    ]
  )
})

test("applies prefix group edits while keeping one prefix per category", () => {
  const rows = applyCategoryPrefixGroupEdit(
    [
      { categoryId: "cat-a", prefix: "COM" },
      { categoryId: "cat-b", prefix: "COM" },
      { categoryId: "cat-c", prefix: "UPS" },
    ],
    {
      previousPrefix: "COM",
      prefix: "it",
      categoryIds: ["cat-a", "cat-c", "cat-c"],
    }
  )

  assert.deepEqual(rows, [
    { categoryId: "cat-a", prefix: "IT" },
    { categoryId: "cat-c", prefix: "IT" },
  ])
})

test("parses and serializes category prefix settings with the existing storage format", () => {
  const rows = parsePrefixRows('{"cat-a":" com ","cat-b":"","cat-c":12,"cat-d":"ups"}')

  assert.deepEqual(rows, [
    { categoryId: "cat-a", prefix: "COM" },
    { categoryId: "cat-d", prefix: "UPS" },
  ])
  assert.equal(serializePrefixRows(rows), '{"cat-a":"COM","cat-d":"UPS"}')
})
