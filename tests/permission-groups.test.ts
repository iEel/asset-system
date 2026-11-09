import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { HIGH_RISK_ACTIONS, PERMISSION_ACTION_ORDER, PERMISSION_GROUPS, permissionGroupOf } from "../src/lib/permission-groups.ts"

function rolePageModules() {
  const source = readFileSync("src/app/[locale]/(dashboard)/admin/roles/page.tsx", "utf8").replace(/\r\n/g, "\n")
  const block = source.match(/const permissionModules = \[([\s\S]*?)\] as const/)
  assert.ok(block, "permissionModules list not found in the roles page")
  return Array.from(block[1].matchAll(/"([a-zA-Z]+)"/g), (match) => match[1])
}

test("the five groups cover the 26 modules once", () => {
  const pageModules = rolePageModules()
  assert.equal(pageModules.length, 26)

  const grouped = PERMISSION_GROUPS.flatMap((group) => group.modules)
  assert.equal(new Set(grouped).size, grouped.length, "a module appears in two groups")
  assert.deepEqual([...grouped].sort(), [...pageModules].sort())
  assert.deepEqual(
    PERMISSION_GROUPS.map((group) => group.key),
    ["assets", "transactions", "operations", "masterData", "system"],
  )
})

test("action order", () => {
  assert.deepEqual([...PERMISSION_ACTION_ORDER], ["view", "create", "edit", "export", "approve", "delete"])
})

test("high-risk actions and group lookup", () => {
  assert.deepEqual([...HIGH_RISK_ACTIONS], ["delete", "approve", "export"])
  assert.equal(permissionGroupOf("asset"), "assets")
  assert.equal(permissionGroupOf("transfer"), "transactions")
  assert.equal(permissionGroupOf("report"), "operations")
  assert.equal(permissionGroupOf("condition"), "masterData")
  assert.equal(permissionGroupOf("log"), "system")
  assert.equal(permissionGroupOf("unknown"), null)
})
