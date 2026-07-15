import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/app/api/suppliers/[id]/route.ts", "utf8")
const putStart = source.indexOf("export async function PUT")
const deleteStart = source.indexOf("export async function DELETE")
const putSource = source.slice(putStart, deleteStart)
const deleteSource = source.slice(deleteStart)

test("supplier update only blocks an active-to-inactive lifecycle change", () => {
  assert.match(putSource, /maintenancePlans:/)
  assert.match(putSource, /shouldBlockSupplierLifecycleChange\(\{[\s\S]*operation: "update"/)
  assert.match(putSource, /nextIsActive: input\.isActive/)
})

test("supplier delete checks every protected relationship before soft delete", () => {
  assert.match(deleteSource, /_count:/)
  assert.match(deleteSource, /maintenancePlans:/)
  assert.match(deleteSource, /shouldBlockSupplierLifecycleChange\(\{[\s\S]*operation: "delete"/)
  assert.match(deleteSource, /getSupplierDeleteBlockReason/)
  assert.ok(deleteSource.indexOf("shouldBlockSupplierLifecycleChange") < deleteSource.indexOf("isActive: false"))
})
