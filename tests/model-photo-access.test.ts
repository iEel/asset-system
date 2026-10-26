import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { test } from "node:test"
import { pathToFileURL } from "node:url"

// Model photos (attachment module "asset_model") stand in for an asset's photo on the register
// and the asset detail page, which anyone with asset:view opens. Viewing one therefore opens with
// asset:view as well as brand:view; uploading or deleting one stays brand:edit. Every other
// module's rule is unchanged. The file and thumbnail routes share this rule through
// assertCanViewAttachment.

const mockedModuleSources = new Map<string, string>([
  ["@/lib/auth-utils", `
    export function hasPermission(user, module, action) {
      if (user.roles.includes("system_admin")) return true
      return user.permissions.includes(module + ":" + action)
    }
  `],
  ["@/lib/db", `
    export const prisma = { asset: { findFirst: async () => null } }
  `],
])

const registerHooks = (nodeModule as unknown as {
  registerHooks(options: {
    resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown
  }): void
}).registerHooks

registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) {
      return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

type User = { id: string; name: string; roles: string[]; permissions: string[]; employeeId: string | null }
type Access = {
  hasAttachmentPermission(user: User, module: string, action: "view" | "edit"): boolean
  assertCanViewAttachment(user: User, attachment: { module: string; assetId: string | null; referenceId: string }): Promise<void>
}
const access = await import(pathToFileURL("src/lib/attachment-access.ts").href) as Access

function user(...permissions: string[]): User {
  return { id: "user-1", name: "Tester", roles: [], permissions, employeeId: null }
}

const modelPhoto = { module: "asset_model", assetId: null, referenceId: "model-1" }

test("a person with only asset:view can view a model photo but cannot edit it", async () => {
  const viewer = user("asset:view")
  assert.equal(access.hasAttachmentPermission(viewer, "asset_model", "view"), true)
  assert.equal(access.hasAttachmentPermission(viewer, "asset_model", "edit"), false)
  await access.assertCanViewAttachment(viewer, modelPhoto)
})

test("asset:edit alone does not grant model-photo edit; brand:edit does", () => {
  assert.equal(access.hasAttachmentPermission(user("asset:view", "asset:edit"), "asset_model", "edit"), false)
  assert.equal(access.hasAttachmentPermission(user("brand:edit"), "asset_model", "edit"), true)
})

test("a person with brand:view can still view a model photo", async () => {
  const brandViewer = user("brand:view")
  assert.equal(access.hasAttachmentPermission(brandViewer, "asset_model", "view"), true)
  await access.assertCanViewAttachment(brandViewer, modelPhoto)
})

test("a person with neither asset:view nor brand:view cannot view a model photo", async () => {
  const other = user("maintenance:view", "audit:view")
  assert.equal(access.hasAttachmentPermission(other, "asset_model", "view"), false)
  await assert.rejects(access.assertCanViewAttachment(other, modelPhoto), /Forbidden/)
})

test("the rule for every other module is unchanged", () => {
  const cases: Array<[string, string]> = [
    ["asset", "asset"],
    ["maintenance", "maintenance"],
    ["audit_finding", "audit"],
    ["disposal", "disposal"],
    ["disposal_batch", "disposal"],
  ]
  for (const [module, permissionModule] of cases) {
    for (const action of ["view", "edit"] as const) {
      assert.equal(access.hasAttachmentPermission(user(`${permissionModule}:${action}`), module, action), true, `${module} ${action}`)
      const others = permissionModule === "asset" ? user("brand:view", "brand:edit") : user("asset:view", "asset:edit", "brand:view", "brand:edit")
      assert.equal(access.hasAttachmentPermission(others, module, action), false, `${module} ${action} without ${permissionModule}`)
    }
  }
})
