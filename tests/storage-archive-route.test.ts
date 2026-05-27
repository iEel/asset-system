import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("storage orphan archive route keeps protected archive safeguards", () => {
  const source = readFileSync("src/app/api/admin/storage/archive-orphan/route.ts", "utf8")

  assert.match(source, /requirePermission\(user, "setting", "edit"\)/)
  assert.match(source, /prisma\.attachment\.findFirst/)
  assert.match(source, /isActive:\s*true/)
  assert.ok(source.includes("filePath: { in: pathVariants }"))
  assert.match(source, /archiveOrphanUploadFile/)
  assert.ok(source.includes("getUploadRoot()"))
  assert.match(source, /logAudit/)
  assert.match(source, /storage_archive_orphan_file/)
})
