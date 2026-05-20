import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
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
