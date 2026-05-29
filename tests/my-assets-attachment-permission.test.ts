import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("asset attachment downloads allow only the signed-in employee custodian fallback", () => {
  const source = readFileSync("src/app/api/attachments/[id]/route.ts", "utf8")

  assert.match(source, /canViewOwnAssetAttachment/)
  assert.match(source, /attachment\.module !== "asset"/)
  assert.match(source, /attachment\.assetId \?\? attachment\.referenceId/)
  assert.match(source, /custodianId: user\.employeeId/)
  assert.match(source, /isActive: true/)
  assert.match(source, /requireAttachmentPermission\(user, attachment\.module, "view"\)/)
})

test("asset attachment delete still requires broad edit permission only", () => {
  const source = readFileSync("src/app/api/attachments/[id]/route.ts", "utf8")
  const deleteBlock = source.match(/export async function DELETE[\s\S]*?function requireAttachmentPermission/)?.[0]

  assert.ok(deleteBlock)
  assert.match(deleteBlock, /requireAttachmentPermission\(user, existing\.module, "edit"\)/)
  assert.doesNotMatch(deleteBlock, /canViewOwnAssetAttachment/)
})
