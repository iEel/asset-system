import assert from "node:assert/strict"
import test from "node:test"
import { assetOwnershipTypes, ownershipMayHaveHolder } from "../src/lib/asset-ownership.ts"

test("ownershipMayHaveHolder: บุคคล, ส่วนกลาง, Stock and License may have a holder; ส่วนควบ takes its parent's (group 4 plan 2, P2-R2)", () => {
  assert.deepEqual(assetOwnershipTypes.map((ownership) => [ownership, ownershipMayHaveHolder(ownership)]), [
    ["personal", true], ["shared", true], ["stock", true], ["component", false], ["software_license", true],
  ])
})
