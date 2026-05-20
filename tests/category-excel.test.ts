import assert from "node:assert/strict"
import test from "node:test"

import { buildCategoryExportRows, buildCategoryTemplateRows } from "../src/lib/category-excel.ts"

test("builds category export rows with checklist and prefix metadata", () => {
  const rows = buildCategoryExportRows(
    [
      {
        code: "COM",
        name: "Computer",
        description: "Desktop assets",
        isActive: true,
        _count: { assets: 3, models: 2, customFieldDefs: 1 },
        customFieldDefs: [{ fieldName: "cpu", fieldLabel: "CPU", fieldType: "text", isRequired: true }],
      },
    ],
    {
      checklistByCategoryId: new Map([["cat-1", ["Front", "Serial"]]]),
      prefixByCategoryCode: new Map([["COM", "CPU"]]),
      categoryIdByCode: new Map([["COM", "cat-1"]]),
    }
  )

  assert.deepEqual(rows, [
    {
      code: "COM",
      name: "Computer",
      description: "Desktop assets",
      models: 2,
      assets: 3,
      customFields: "cpu (CPU, text, required)",
      photoChecklist: "Front, Serial",
      assetTagPrefix: "CPU",
      active: "Y",
    },
  ])
})

test("builds category template example rows", () => {
  assert.deepEqual(buildCategoryTemplateRows(), {
    categories: [{ code: "COM", name: "Computer", description: "Desktop / workstation", active: "Y" }],
    customFields: [{ categoryCode: "COM", fieldName: "cpu", fieldLabel: "CPU", fieldLabelTh: "ซีพียู", fieldType: "text", options: "", required: "N", active: "Y" }],
    photoChecklist: [{ categoryCode: "COM", item: "รูปหน้าเครื่อง" }],
  })
})
