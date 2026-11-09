import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

import {
  classifyApiRouteProtection,
  rbacRoutePermissionMatrix,
  summarizeRbacRouteMatrix,
  validateRbacRouteSource,
} from "../src/lib/rbac-route-matrix.ts"

test("summarizes RBAC route matrix coverage by module", () => {
  const summary = summarizeRbacRouteMatrix([
    {
      filePath: "src/app/api/assets/route.ts",
      label: "Assets",
      checks: [
        { module: "asset", action: "view" },
        { module: "asset", action: "create" },
      ],
    },
    {
      filePath: "src/app/api/admin/settings/route.ts",
      label: "Settings",
      checks: [{ module: "setting", action: "edit" }],
    },
  ])

  assert.deepEqual(summary, {
    routes: 2,
    checks: 3,
    byModule: [
      { module: "asset", checks: 2 },
      { module: "setting", checks: 1 },
    ],
  })
})

test("critical API routes still contain their RBAC checks", () => {
  const failures = rbacRoutePermissionMatrix.flatMap((entry) => {
    const source = readFileSync(entry.filePath, "utf8")
    return validateRbacRouteSource(entry, source)
  })

  assert.deepEqual(failures, [])
})

test("bulk disposal execution is registered for disposal edit permission", () => {
  const entry = rbacRoutePermissionMatrix.find(
    (candidate) => candidate.filePath === "src/app/api/disposal-requests/bulk-execution/route.ts",
  )

  assert.deepEqual(entry?.checks, [{ module: "disposal", action: "edit" }])
})

test("the disposal round is registered for disposal edit permission (group 6 plan 4)", () => {
  const entry = rbacRoutePermissionMatrix.find((candidate) => candidate.filePath === "src/app/api/disposal-rounds/route.ts")
  assert.deepEqual(entry?.checks, [{ module: "disposal", action: "edit" }])
})

test("the transaction pickers' search is registered for asset edit, as the four pages and their save routes (server search spec 6.2), and consumable create for mode=consumable (consumables plan 2)", () => {
  const entry = rbacRoutePermissionMatrix.find((candidate) => candidate.filePath === "src/app/api/asset-operations/search/route.ts")
  assert.deepEqual(entry?.checks, [{ module: "asset", action: "edit" }, { module: "consumable", action: "create" }])
})

test("the bulk-move list is registered for asset edit, as its page and the bulk-move save (group 3 spec §10.3; P4-R25)", () => {
  const entry = rbacRoutePermissionMatrix.find((candidate) => candidate.filePath === "src/app/api/asset-operations/bulk-move-list/route.ts")
  assert.deepEqual(entry?.checks, [{ module: "asset", action: "edit" }])
})

test("the purchase-document search is registered for asset create or edit, as the asset form it serves (group 4 plan 3 P3-R2)", () => {
  const entry = rbacRoutePermissionMatrix.find((candidate) => candidate.filePath === "src/app/api/purchase-documents/search/route.ts")
  assert.deepEqual(entry?.checks, [{ module: "asset", action: "create" }, { module: "asset", action: "edit" }])
})

test("the purchase-document pre-check is asset create or edit; create-and-link and unlink are asset edit (group 4 plan 3 P3-R2)", () => {
  const checks = (filePath: string) => rbacRoutePermissionMatrix.find((candidate) => candidate.filePath === filePath)?.checks
  assert.deepEqual(checks("src/app/api/purchase-documents/check-duplicates/route.ts"), [{ module: "asset", action: "create" }, { module: "asset", action: "edit" }])
  assert.deepEqual(checks("src/app/api/assets/[id]/purchase-documents/route.ts"), [{ module: "asset", action: "edit" }])
  // The DELETE has no viewer refusal row (the E2E suite sends no DELETE); its unit test pins the check before any read.
  assert.deepEqual(checks("src/app/api/assets/[id]/purchase-documents/[documentId]/route.ts"), [{ module: "asset", action: "edit" }])
})

test("the component removal is a POST registered for asset edit, with a viewer refusal row (group 4 plan 4 P4-R1)", () => {
  const entry = rbacRoutePermissionMatrix.find((candidate) => candidate.filePath === "src/app/api/assets/[id]/components/[componentId]/remove/route.ts")
  assert.deepEqual(entry?.checks, [{ module: "asset", action: "edit" }])
  assert.ok(!rbacRoutePermissionMatrix.some((candidate) => candidate.filePath === "src/app/api/assets/[id]/components/[componentId]/route.ts"))
})

test("the scan search is registered for asset view, as the scan page; the viewer holds it, so it has no refusal row (group 4 plan 4)", () => {
  const entry = rbacRoutePermissionMatrix.find((candidate) => candidate.filePath === "src/app/api/assets/scan-search/route.ts")
  assert.deepEqual(entry?.checks, [{ module: "asset", action: "view" }])
})

test("the label queue and the print record are registered for asset view (spec call 19); the viewer holds it, so no refusal row (group 4 plan 6)", () => {
  const entry = rbacRoutePermissionMatrix.find((candidate) => candidate.filePath === "src/app/api/assets/label-prints/route.ts")
  assert.deepEqual(entry?.checks, [{ module: "asset", action: "view" }])
})

test("every import and export route is in the matrix: export for asset view, the template, preview and confirm for asset create (group 4 plan 5)", () => {
  const checks = (filePath: string) => rbacRoutePermissionMatrix.find((candidate) => candidate.filePath === filePath)?.checks
  assert.deepEqual(checks("src/app/api/assets/export/route.ts"), [{ module: "asset", action: "view" }])
  assert.deepEqual(checks("src/app/api/assets/import-template/route.ts"), [{ module: "asset", action: "create" }])
  assert.deepEqual(checks("src/app/api/assets/import-preview/route.ts"), [{ module: "asset", action: "create" }])
  assert.deepEqual(checks("src/app/api/assets/import-confirm/route.ts"), [{ module: "asset", action: "create" }])
})

test("every API route has an explicit protection inventory classification", () => {
  const routeFiles = collectApiRouteFiles("src/app/api")
  const classifications = routeFiles.map((filePath) =>
    classifyApiRouteProtection(filePath, readFileSync(filePath, "utf8"), rbacRoutePermissionMatrix)
  )
  const unclassified = classifications
    .filter((classification) => classification.status === "unclassified")
    .map((classification) => classification.filePath)

  assert.deepEqual(unclassified, [])
  assert.ok(classifications.some((classification) => classification.status === "public_exception"))
  assert.ok(classifications.some((classification) => classification.status === "matrix"))
  assert.ok(classifications.some((classification) => classification.status === "protected"))
})

function collectApiRouteFiles(directory: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      files.push(...collectApiRouteFiles(fullPath))
    } else if (entry === "route.ts") {
      files.push(fullPath.replace(/\\/g, "/"))
    }
  }
  return files.sort((left, right) => left.localeCompare(right))
}

test("the session endpoints count as session-protected routes", () => {
  for (const file of ["src/app/api/session/status/route.ts", "src/app/api/session/keep-alive/route.ts"])
    assert.equal(classifyApiRouteProtection(file, readFileSync(file, "utf8")).status, "protected", file)
})
