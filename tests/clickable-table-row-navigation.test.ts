import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { shouldCancelClickableRowNavigation } from "../src/lib/clickable-row-navigation.ts"

test("only an explicit false before-navigation result cancels row navigation", () => {
  assert.equal(shouldCancelClickableRowNavigation(false), true)
  assert.equal(shouldCancelClickableRowNavigation(undefined), false)
  assert.equal(shouldCancelClickableRowNavigation(true), false)
})

test("clickable row applies the cancellable guard to mouse and keyboard navigation", async () => {
  const source = await readFile("src/components/ui/clickable-table-row.tsx", "utf8")
  assert.match(source, /onNavigate\?: \(\) => boolean \| void/)
  assert.match(source, /shouldCancelClickableRowNavigation\(onNavigate\?\.\(\)\)/)
  assert.match(source, /onClick/)
  assert.match(source, /onKeyDown/)
})
