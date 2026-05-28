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
    "ไม่สามารถลบหมวดหมู่นี้ได้ เพราะยังมีทรัพย์สิน 2 รายการ และรุ่น 1 รายการใช้งานอยู่"
  )
})

test("category delete route checks active asset and model references before soft delete", () => {
  const source = readFileSync("src/app/api/categories/[id]/route.ts", "utf8")
  const deleteHandler = source.slice(source.indexOf("export async function DELETE"))

  assert.match(deleteHandler, /include:\s*\{\s*_count:\s*\{\s*select:\s*\{\s*assets:\s*true,\s*models:\s*true/s)
  assert.match(deleteHandler, /getCategoryDeleteBlockReason\(\{\s*assets:\s*existing\._count\.assets,\s*models:\s*existing\._count\.models/s)
  assert.match(deleteHandler, /return NextResponse\.json\(\{ error: blockReason \}, \{ status: 409 \}\)/)
})

test("category update route only applies the delete guard when deactivating a category", () => {
  const source = readFileSync("src/app/api/categories/[id]/route.ts", "utf8")
  const putHandler = source.slice(source.indexOf("export async function PUT"), source.indexOf("function normalizeFieldOptions"))

  assert.match(putHandler, /if \(!input\.isActive\) \{/)
  assert.match(putHandler, /const blockReason = getCategoryDeleteBlockReason\(\{\s*assets:\s*existing\._count\.assets,\s*models:\s*existing\._count\.models/s)
  assert.match(putHandler, /return NextResponse\.json\(\{ error: blockReason \}, \{ status: 409 \}\)/)
})

test("category create route reactivates an inactive category with the same code instead of inserting a duplicate", () => {
  const source = readFileSync("src/app/api/categories/route.ts", "utf8")

  assert.match(source, /existingInactiveCategory\s*=\s*await prisma\.assetCategory\.findFirst\(/)
  assert.match(source, /where:\s*\{\s*code:\s*input\.code,\s*isActive:\s*false\s*\}/)
  assert.match(source, /existingInactiveCategory\s*\?\s*await prisma\.assetCategory\.update\(/)
  assert.match(source, /action:\s*existingInactiveCategory\s*\?\s*"reactivate"\s*:\s*"create"/)
})
