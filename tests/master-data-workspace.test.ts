import assert from "node:assert/strict"
import test from "node:test"

import { buildMasterDataWorkspaceItems } from "../src/lib/master-data-workspace.ts"

test("builds a shared master-data workspace with a stable active section", () => {
  const items = buildMasterDataWorkspaceItems("th", "locations", {
    companies: "Companies",
    branches: "Branches",
    locations: "Locations",
    employees: "Employees",
    suppliers: "Suppliers",
  })

  assert.equal(items.length, 5)
  assert.deepEqual(items.find((item) => item.id === "locations"), {
    id: "locations",
    label: "Locations",
    href: "/th/master-data/locations",
    active: true,
  })
})
