import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  COMPONENT_LINK_OUTSTANDING,
  installedOrOutstandingLinkWhere,
  isOutstandingLink,
  outstandingLinkWhere,
} from "../src/lib/asset-component-outstanding.ts"

test("an outstanding link: the status, the two wheres and the predicate (group 3 spec §8.5, P2-R1)", () => {
  assert.equal(COMPONENT_LINK_OUTSTANDING, "outstanding")
  assert.ok(COMPONENT_LINK_OUTSTANDING.length <= 20, "fits AssetComponent.status NVarChar(20): no migration")
  assert.deepEqual(outstandingLinkWhere, { status: "outstanding", removedAt: null })
  assert.deepEqual(installedOrOutstandingLinkWhere, { status: { in: ["installed", "outstanding"] }, removedAt: null })
  assert.equal(isOutstandingLink({ status: "outstanding", removedAt: null }), true)
  assert.equal(isOutstandingLink({ status: "outstanding" }), true)
  for (const link of [{ status: "installed", removedAt: null }, { status: "removed", removedAt: new Date() }, { status: "outstanding", removedAt: new Date() }]) {
    assert.equal(isOutstandingLink(link), false, JSON.stringify(link))
  }
})

test("the module stays pure: no import at all, so pages, routes and node --test all load it", () => {
  assert.doesNotMatch(readFileSync("src/lib/asset-component-outstanding.ts", "utf8"), /^import /m)
})
