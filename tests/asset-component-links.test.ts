import assert from "node:assert/strict"
import test from "node:test"
import { componentCountAfterRemoval, componentFocusAfterRemoval, lastRemovalByComponent } from "../src/lib/asset-component-links.ts"

test("removing an installed link counts one fewer; an outstanding link was not counted (Review Focus 2)", () => {
  assert.equal(componentCountAfterRemoval({ status: "installed" }, 2), 1)
  assert.equal(componentCountAfterRemoval({ status: "outstanding" }, 2), 2)
  assert.equal(componentCountAfterRemoval({ status: "installed" }, 1), 0)
  assert.equal(componentCountAfterRemoval({ status: "outstanding" }, 0), 0)
})

test("the count never goes below zero", () => {
  assert.equal(componentCountAfterRemoval({ status: "installed" }, 0), 0)
})

test("the last removal per component is the latest date; rows not removed are skipped", () => {
  const result = lastRemovalByComponent([
    { componentAssetId: "a", removedAt: new Date("2026-01-05T00:00:00Z") },
    { componentAssetId: "a", removedAt: new Date("2026-03-01T00:00:00Z") },
    { componentAssetId: "a", removedAt: new Date("2026-02-10T00:00:00Z") },
    { componentAssetId: "b", removedAt: null },
    { componentAssetId: "c", removedAt: null },
    { componentAssetId: "c", removedAt: new Date("2025-12-31T00:00:00Z") },
  ])
  assert.deepEqual([...result.keys()].sort(), ["a", "c"])
  assert.equal(result.get("a")?.toISOString(), "2026-03-01T00:00:00.000Z")
  assert.equal(result.get("c")?.toISOString(), "2025-12-31T00:00:00.000Z")
  assert.equal(result.has("b"), false)
})

test("no rows give an empty map", () => {
  assert.equal(lastRemovalByComponent([]).size, 0)
})

test("after a removal, focus goes to the current row that followed it, else the one before it, else none (final review)", () => {
  assert.equal(componentFocusAfterRemoval(["a", "b", "c"], "b"), "c")
  assert.equal(componentFocusAfterRemoval(["a", "b", "c"], "c"), "b")
  assert.equal(componentFocusAfterRemoval(["a"], "a"), null)
  assert.equal(componentFocusAfterRemoval([], "a"), null)
  // A row that is not among the current ones gives no target from the list.
  assert.equal(componentFocusAfterRemoval(["a", "b"], "z"), null)
})
