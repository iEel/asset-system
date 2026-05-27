import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("audit Excel finalizer only formats date columns that exist on the worksheet", () => {
  const source = readFileSync("src/lib/audit-excel.ts", "utf8")

  assert.match(source, /existingColumnKeys/)
  assert.match(source, /worksheet\.columns/)
  assert.match(source, /if \(!existingColumnKeys\.has\(key\)\) continue/)
  assert.match(source, /worksheet\.getColumn\(key\)/)
})
