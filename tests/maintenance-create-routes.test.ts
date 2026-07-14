import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

test("maintenance list no longer embeds create forms", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  assert.doesNotMatch(page, /<MaintenanceTicketForm/)
  assert.doesNotMatch(page, /<MaintenancePlanForm/)
  assert.doesNotMatch(page, /getMaintenanceOptions\(\)/)
})

test("maintenance create and PM edit routes are dedicated permission-aware pages", () => {
  const paths = [
    "src/app/[locale]/(dashboard)/maintenance/new/page.tsx",
    "src/app/[locale]/(dashboard)/maintenance/pm/new/page.tsx",
    "src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx",
  ]
  for (const path of paths) {
    assert.equal(existsSync(path), true, path)
    const source = readFileSync(path, "utf8")
    assert.match(source, /requirePagePermission/)
    assert.match(source, /<Breadcrumbs/)
    assert.match(source, /<h1/)
  }
})
