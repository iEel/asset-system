import assert from "node:assert/strict"
import test from "node:test"

import {
  addCustomFieldValueCounts,
  countSavedFieldsWithValues,
  customFieldRenameWarning,
  isNewCustomField,
  splitCustomFieldOptions,
} from "../src/lib/category-custom-field-names.ts"
import {
  customFieldValueCountPageSize,
  readCategoryCustomFieldValueCounts,
  type CategoryAssetValuePageArgs,
} from "../src/lib/category-custom-field-value-counts.ts"
import { categoryPrefixFor, parsePrefixRows, renderAssetTagExample } from "../src/lib/category-prefix-groups.ts"

// Group 8 plan 2 Task 2: the edit form's template table (board MD-Category-Edit), rulings G8P2-R1 and G8P2-R2.

test("a custom field's values count once per asset whose JSON holds a non-empty value under its name (G8P2-R1)", () => {
  const counts = new Map<string, number>()
  addCustomFieldValueCounts(counts, JSON.stringify({ cpu: "i5", ram: "  ", os: null, wifi: false, disk: 512 }))
  addCustomFieldValueCounts(counts, JSON.stringify({ cpu: "i7", ram: "16" }))
  addCustomFieldValueCounts(counts, null)
  addCustomFieldValueCounts(counts, "")
  addCustomFieldValueCounts(counts, "not json")
  addCustomFieldValueCounts(counts, "[1,2]")
  assert.deepEqual(Object.fromEntries(counts), { cpu: 2, ram: 1, wifi: 1, disk: 1 })
})

test("the values reader pages through the category's active assets by id, 2,000 at a time, selecting only id and the JSON (G8P2-R1)", async () => {
  const assets = Array.from({ length: 4500 }, (_, index) => ({
    id: `a${String(index).padStart(5, "0")}`,
    customFieldsJson: index % 3 === 0 ? JSON.stringify({ cpu: "x" }) : index % 3 === 1 ? JSON.stringify({ cpu: "", ram: "8" }) : null,
  }))
  const calls: CategoryAssetValuePageArgs[] = []
  const counts = await readCategoryCustomFieldValueCounts("cat-1", async (args) => {
    calls.push(args)
    const after = args.where.id?.gt
    return assets.filter((asset) => !after || asset.id > after).slice(0, args.take)
  })
  assert.equal(customFieldValueCountPageSize, 2000)
  assert.equal(calls.length, 3)
  assert.deepEqual(calls[0], {
    where: { categoryId: "cat-1", isActive: true },
    orderBy: { id: "asc" },
    take: 2000,
    select: { id: true, customFieldsJson: true },
  })
  assert.deepEqual(calls[1].where, { categoryId: "cat-1", isActive: true, id: { gt: "a01999" } })
  assert.deepEqual(calls[2].where.id, { gt: "a03999" })
  assert.deepEqual(counts, { cpu: 1500, ram: 1500 })
})

test("a row is new when it is not in the saved definition by its saved identity, not by its name (G8P2-R2)", () => {
  const saved = new Set(["f1", "f2"])
  assert.equal(isNewCustomField({ id: "f1" }, saved), false)
  assert.equal(isNewCustomField({ id: "other" }, saved), true)
  assert.equal(isNewCustomField({}, saved), true, "added or duplicated rows carry no id")
})

test("the rename warning shows only on a saved field whose name changed and whose saved name holds values (G8P2-R1)", () => {
  const savedNames = new Map([
    ["f1", "cpu"],
    ["f2", "ram"],
  ])
  const counts = { cpu: 12, ram: 0 }
  assert.deepEqual(customFieldRenameWarning({ id: "f1", fieldName: "processor" }, savedNames, counts), { savedName: "cpu", count: 12 })
  assert.equal(customFieldRenameWarning({ id: "f1", fieldName: "cpu" }, savedNames, counts), null, "unchanged")
  assert.equal(customFieldRenameWarning({ id: "f1", fieldName: " cpu " }, savedNames, counts), null, "spaces are not a rename")
  assert.equal(customFieldRenameWarning({ id: "f2", fieldName: "memory" }, savedNames, counts), null, "no values")
  assert.equal(customFieldRenameWarning({ fieldName: "cpu_copy" }, savedNames, counts), null, "a new row")
  assert.equal(countSavedFieldsWithValues(["cpu", "ram", "gpu"], { cpu: 12, gpu: 1 }), 2)
})

test("option chips split the text as the API stores it: lines or commas, trimmed, empties dropped", () => {
  assert.deepEqual(splitCustomFieldOptions("Windows 11 Pro\r\nWindows 10 Pro, Ubuntu 24.04\n\n ,"), ["Windows 11 Pro", "Windows 10 Pro", "Ubuntu 24.04"])
  assert.deepEqual(splitCustomFieldOptions(""), [])
  assert.deepEqual(splitCustomFieldOptions(null), [])
})

test("the prefix box: the category's prefix from the settings and the other categories of its group", () => {
  const rows = parsePrefixRows(JSON.stringify({ nb: "com", pc: "COM", cam: "CAM" }))
  assert.deepEqual(categoryPrefixFor(rows, "nb"), { prefix: "COM", sharedWithIds: ["pc"] })
  assert.deepEqual(categoryPrefixFor(rows, "cam"), { prefix: "CAM", sharedWithIds: [] })
  assert.deepEqual(categoryPrefixFor(rows, "none"), { prefix: null, sharedWithIds: [] })
  assert.deepEqual(categoryPrefixFor(rows, undefined), { prefix: null, sharedWithIds: [] })
})

test("the example asset tag renders the settings' template with the category segment and the first running number", () => {
  const parts = {
    template: "{globalPrefix}{separator}{assetPrefix}{separator}{year2}{separator}{running}",
    separator: "-",
    globalPrefix: "GRL",
    companyCode: "SNI",
    branchCode: "HQ",
    runningDigits: 4,
    year: 2026,
  }
  assert.equal(renderAssetTagExample(parts, "COM", "NB"), "GRL-COM-26-0001")
  assert.equal(renderAssetTagExample(parts, null, " NB "), "GRL-NB-26-0001", "no prefix: the category code as typed, trimmed")
  assert.equal(renderAssetTagExample(parts, null, ""), "GRL-CAT-26-0001", "nothing typed yet")
  assert.equal(
    renderAssetTagExample({ ...parts, template: "{assetCompanyCode}{separator}{branchCode}{separator}{assetPrefix}{separator}{running}", runningDigits: 5 }, "COM", "NB"),
    "SNI-HQ-COM-00001"
  )
  assert.equal(renderAssetTagExample({ ...parts, template: "{assetPrefix}" }, "COM", "NB"), "SNI-HQ-COM-0001", "a template without {running} falls back to the default")
})
