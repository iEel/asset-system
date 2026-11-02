import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { emptyAssetFormValues, type CustomFieldDefinition } from "../src/lib/asset-form-rules.ts"
import { summarizeAssetFormSection, type AssetFormSummaryInput } from "../src/lib/asset-form-summary.ts"

// The one-line summary and the "กรอกแล้ว n จาก m ช่อง" badge of each folded section of the asset form (group 4 plan 2
// Task 6a, spec §8): what the section holds, read from the form's values, as parts the section words.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")

const definition = (fieldName: string, isRequired: boolean): CustomFieldDefinition => ({
  id: fieldName, categoryId: "cat", fieldName, fieldLabel: fieldName, options: [], fieldType: "text", isRequired, sortOrder: 0,
})

const empty: AssetFormSummaryInput = {
  values: { ...emptyAssetFormValues },
  install: { parentAssetId: "", componentRole: "", slotNo: "", reason: "" },
  documents: { mode: "create", chosen: [], queued: 0 },
  photos: { checklistTotal: 0, checklistCovered: 0, existing: 0, queued: 0 },
  customFields: { definitions: [], valueOf: () => "", extraRows: 0 },
}

test("an empty form: every section says nothing, and only the ones with fields count them", () => {
  assert.deepEqual(summarizeAssetFormSection("install", empty), { filled: 0, total: 4, parts: [] })
  assert.deepEqual(summarizeAssetFormSection("purchase", empty), { filled: 0, total: 8, parts: [] })
  assert.deepEqual(summarizeAssetFormSection("documents", empty), { filled: 0, total: 0, parts: [] })
  assert.deepEqual(summarizeAssetFormSection("photos", empty), { filled: 0, total: 0, parts: [] })
  assert.deepEqual(summarizeAssetFormSection("customFields", empty), { filled: 0, total: 0, parts: [] })
  assert.deepEqual(summarizeAssetFormSection("other", empty), { filled: 0, total: 1, parts: [] })
})

test("purchase and warranty: the date, the price and the warranty end when set; blank text is not filled", () => {
  const input = { ...empty, values: { ...emptyAssetFormValues, purchaseDate: "2026-01-15", purchasePrice: "25000.5", warrantyEndDate: "2027-01-15", poNumber: "  " } }
  assert.deepEqual(summarizeAssetFormSection("purchase", input), {
    filled: 3,
    total: 8,
    parts: [{ key: "purchaseDate", date: "2026-01-15" }, { key: "purchasePrice", amount: 25000.5 }, { key: "warrantyEnd", date: "2027-01-15" }],
  })
  // A price that is not a number is counted as typed but not shown as an amount.
  const typo = { ...empty, values: { ...emptyAssetFormValues, purchasePrice: "abc" } }
  assert.deepEqual(summarizeAssetFormSection("purchase", typo), { filled: 1, total: 8, parts: [] })
})

test("install, documents, photos, custom fields and the remark", () => {
  const install = { ...empty, install: { parentAssetId: "p1", componentRole: "Harddisk", slotNo: "", reason: "" }, installParentLabel: "NB-001 - Notebook" }
  assert.deepEqual(summarizeAssetFormSection("install", install), { filled: 2, total: 4, parts: [{ key: "installParent", label: "NB-001 - Notebook" }] })

  // Group 4 plan 3 Task 5: the chosen documents' refs, the drafts as รอบันทึก n ใบ, and the badge เลือกแล้ว n ใบ (create)
  // in place of กรอกแล้ว (tests/asset-form-documents-ui.test.ts has the edit case).
  const chosen = [
    { id: "d1", documentType: "purchase_order" as const, documentNo: "PO-1" },
    { id: "d2", documentType: "invoice" as const, documentNo: "INV-2" },
  ]
  const documents: AssetFormSummaryInput = { ...empty, documents: { mode: "create", chosen, queued: 1 } }
  assert.deepEqual(summarizeAssetFormSection("documents", documents), {
    filled: 0,
    total: 0,
    parts: [{ key: "documentRefs", refs: chosen }, { key: "documentsQueued", count: 1 }],
    badge: { key: "documentsSelected", count: 2 },
  })

  const photos = { ...empty, photos: { checklistTotal: 3, checklistCovered: 2, existing: 1, queued: 2 } }
  assert.deepEqual(summarizeAssetFormSection("photos", photos), {
    filled: 2,
    total: 3,
    parts: [{ key: "photosExisting", count: 1 }, { key: "photosQueued", count: 2 }],
  })

  const valuesByName: Record<string, string> = { cpu: "i7", ram: "" }
  const custom = {
    ...empty,
    customFields: { definitions: [definition("cpu", true), definition("ram", true), definition("color", false)], valueOf: (name: string) => valuesByName[name] ?? "", extraRows: 2 },
  }
  assert.deepEqual(summarizeAssetFormSection("customFields", custom), {
    filled: 1,
    total: 3,
    parts: [{ key: "customRequiredMissing", count: 1 }, { key: "customExtraRows", count: 2 }],
  })

  const remark = { ...empty, values: { ...emptyAssetFormValues, remark: "ซื้อพร้อมกระเป๋า" } }
  assert.deepEqual(summarizeAssetFormSection("other", remark), { filled: 1, total: 1, parts: [{ key: "remarkSet" }] })
})

test("the summary file is pure: relative .ts imports only, no React, no @/, no prisma", () => {
  const source = read("src/lib/asset-form-summary.ts")
  for (const match of source.matchAll(/^import .* from "([^"]+)"$/gm)) assert.match(match[1], /^\.\/[\w-]+\.ts$/, match[0])
  assert.doesNotMatch(source, /from "react"|@\/|prisma|"use client"/)
})
