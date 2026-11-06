import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getCategoryDeleteBlockReason } from "../src/lib/category-delete-guard.ts"

test("allows deleting unused categories", () => {
  assert.equal(getCategoryDeleteBlockReason({ assets: 0, models: 0 }), null)
})

test("blocks deleting categories that still have assets or models", () => {
  assert.equal(
    getCategoryDeleteBlockReason({ assets: 2, models: 1 }),
    "ปิดใช้งานหมวดหมู่นี้ไม่ได้ เพราะยังผูกกับรุ่น 1 รายการ และทรัพย์สิน 2 รายการ (นับรวมที่ปิดใช้งานแล้ว)"
  )
  // It counts inactive rows too, so it names them and does not claim they are in use (final review fix 2).
  assert.equal(
    getCategoryDeleteBlockReason({ assets: 0, models: 2 }),
    "ปิดใช้งานหมวดหมู่นี้ไม่ได้ เพราะยังผูกกับรุ่น 2 รายการ (นับรวมที่ปิดใช้งานแล้ว)"
  )
  assert.equal(getCategoryDeleteBlockReason({ assets: 1200, models: 0 }), "ปิดใช้งานหมวดหมู่นี้ไม่ได้ เพราะยังผูกกับทรัพย์สิน 1,200 รายการ (นับรวมที่ปิดใช้งานแล้ว)")
  assert.doesNotMatch(getCategoryDeleteBlockReason({ assets: 3, models: 2 }) ?? "", /ใช้งานอยู่/)
})

test("category delete route checks active asset and model references before soft delete", () => {
  const source = readFileSync("src/app/api/categories/[id]/route.ts", "utf8")
  const deleteHandler = source.slice(source.indexOf("export async function DELETE"))

  assert.match(deleteHandler, /include:[\s\S]*_count:[\s\S]*select:[\s\S]*assets:\s*true,[\s\S]*models:\s*true/)
  assert.match(deleteHandler, /getCategoryDeleteBlockReason\(\{[\s\S]*assets:\s*existing\._count\.assets,[\s\S]*models:\s*existing\._count\.models/)
  assert.match(deleteHandler, /return NextResponse\.json\(\{ error: blockReason \}, \{ status: 409 \}\)/)
})

// User decision 2026-10-21 Y5: only the change from active to inactive is guarded, so an inactive category that still has
// assets can be edited while it stays inactive (the route-level cases are in tests/master-data-record-status.test.ts).
test("category update route only applies the delete guard when deactivating a category", () => {
  const source = readFileSync("src/app/api/categories/[id]/route.ts", "utf8")
  const putHandler = source.slice(source.indexOf("export async function PUT"), source.indexOf("function normalizeFieldOptions"))

  assert.match(putHandler, /if \(isDeactivation\(existing\.isActive, input\.isActive\)\) \{/)
  assert.doesNotMatch(putHandler, /if \(!input\.isActive\) \{/)
  assert.match(putHandler, /const blockReason = getCategoryDeleteBlockReason\(\{[\s\S]*assets:\s*existing\._count\.assets,[\s\S]*models:\s*existing\._count\.models/)
  assert.match(putHandler, /return NextResponse\.json\(\{ error: blockReason \}, \{ status: 409 \}\)/)
})

test("category create route reactivates an inactive category with the same code instead of inserting a duplicate", () => {
  const source = readFileSync("src/app/api/categories/route.ts", "utf8")

  assert.match(source, /existingInactiveCategory\s*=\s*await prisma\.assetCategory\.findFirst\(/)
  assert.match(source, /where:\s*\{\s*code:\s*input\.code,\s*isActive:\s*false\s*\}/)
  assert.match(source, /existingInactiveCategory\s*\?\s*await prisma\.assetCategory\.update\(/)
  assert.match(source, /action:\s*existingInactiveCategory\s*\?\s*"reactivate"\s*:\s*"create"/)
})

test("category create route does not send deleteMany in nested custom field create payload", () => {
  const source = readFileSync("src/app/api/categories/route.ts", "utf8")
  const createBranch = source.slice(source.indexOf(": await prisma.assetCategory.create"), source.indexOf("await saveCategoryPhotoChecklist"))
  const createHelper = source.slice(source.indexOf("function buildCustomFieldDefsCreate"), source.indexOf("function buildCustomFieldDefsReplace"))
  const createInputHelper = source.slice(source.indexOf("function buildCustomFieldDefinitionCreateInputs"), source.indexOf("function normalizeFieldOptions"))

  assert.match(createBranch, /customFieldDefs:\s*buildCustomFieldDefsCreate\(input\.customFieldDefs\)/)
  assert.doesNotMatch(createBranch, /buildCustomFieldDefsReplace\(input\.customFieldDefs\)/)
  assert.match(createHelper, /create:\s*buildCustomFieldDefinitionCreateInputs\(customFieldDefs\)/)
  assert.doesNotMatch(createHelper, /deleteMany/)
  assert.match(createInputHelper, /customFieldDefs\.map/)
})
