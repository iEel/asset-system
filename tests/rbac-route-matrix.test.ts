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
