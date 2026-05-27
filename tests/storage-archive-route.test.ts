import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("storage orphan archive route keeps protected archive safeguards", () => {
  const source = readFileSync("src/app/api/admin/storage/archive-orphan/route.ts", "utf8")

  assert.match(source, /requirePermission\(user, "setting", "edit"\)/)
  assert.match(source, /prisma\.attachment\.findFirst/)
  assert.match(source, /isActive:\s*true/)
  assert.ok(source.includes("filePath: { in: pathVariants }"))
  assert.match(source, /const uploadRoot = getUploadRoot\(\)/)
  assert.equal(source.match(/getUploadRoot\(\)/g)?.length, 1)
  assert.ok(source.includes("getStoragePathVariants(relativePath, uploadRoot)"))
  assert.match(source, /archiveOrphanUploadFile/)
  assert.match(source, /archiveOrphanUploadFile\(\{\s*uploadDir: uploadRoot,/)
  assert.match(source, /const ipAddress = getRequestIpAddress\(request\)\?\.slice\(0, 50\)/)
  assert.match(source, /const userAgent = request\.headers\.get\("user-agent"\)\?\.slice\(0, 500\) \?\? undefined/)
  assert.match(source, /ipAddress,\s*userAgent,/)
  assert.match(source, /logAudit/)
  assert.match(source, /storage_archive_orphan_file/)

  const activeAttachmentCheckIndex = source.indexOf("prisma.attachment.findFirst")
  const archiveCallIndex = source.indexOf("const archived = await archiveOrphanUploadFile")
  assert.ok(activeAttachmentCheckIndex >= 0)
  assert.ok(archiveCallIndex >= 0)
  assert.ok(activeAttachmentCheckIndex < archiveCallIndex)
})
