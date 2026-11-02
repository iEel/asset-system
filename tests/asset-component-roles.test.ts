import assert from "node:assert/strict"
import test from "node:test"
import { COMPONENT_ROLE_VALUES, componentRoleLabelKey } from "../src/lib/asset-component-roles.ts"

test("the eight stored role values, in the install form's order (group 4 plan 4, P4-R4)", () => {
  assert.deepEqual([...COMPONENT_ROLE_VALUES], ["RAM", "SSD", "HDD", "Power Supply", "Network Card", "Monitor", "Adapter", "Other"])
})

test("each stored value has its message key (group 4 plan 4, P4-R4)", () => {
  assert.deepEqual(
    COMPONENT_ROLE_VALUES.map((value) => componentRoleLabelKey(value)),
    [
      "componentRoles.ram",
      "componentRoles.ssd",
      "componentRoles.hdd",
      "componentRoles.powerSupply",
      "componentRoles.networkCard",
      "componentRoles.monitor",
      "componentRoles.adapter",
      "componentRoles.other",
    ]
  )
})

test("any other stored text has no key, so the caller shows it as stored (Review Focus 1)", () => {
  for (const stored of ["แรม", "ram", " RAM", "RAM ", "Harddisk", "", "power supply", "toString", "constructor", "__proto__"]) {
    assert.equal(componentRoleLabelKey(stored), null, stored)
  }
})
