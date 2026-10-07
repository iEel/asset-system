import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8")

test("attachment views allow the module permission or the signed-in employee custodian only", () => {
  const access = read("src/lib/attachment-access.ts")

  assert.match(access, /export async function canViewOwnAssetAttachment/)
  assert.match(access, /attachment\.module !== "asset"/)
  assert.match(access, /attachment\.assetId \?\? attachment\.referenceId/)
  assert.match(access, /custodianId: user\.employeeId/)
  assert.match(access, /isActive: true/)
  assert.match(access, /export async function assertCanViewAttachment[\s\S]*?requireAttachmentPermission\(user, attachment\.module, "view"\)/)

  for (const path of ["src/app/api/attachments/[id]/route.ts", "src/app/api/attachments/[id]/thumbnail/route.ts"]) {
    assert.match(read(path), /await assertCanViewAttachment\(user, attachment\)/, path)
  }
})

test("asset attachment delete still requires broad edit permission only", () => {
  const route = read("src/app/api/attachments/[id]/route.ts")
  const deleteBlock = route.slice(route.indexOf("export async function DELETE"))

  assert.ok(deleteBlock.startsWith("export async function DELETE"))
  assert.match(deleteBlock, /requireAttachmentPermission\(user, existing\.module, "edit"\)/)
  assert.doesNotMatch(deleteBlock, /canViewOwnAssetAttachment|assertCanViewAttachment/)
})
