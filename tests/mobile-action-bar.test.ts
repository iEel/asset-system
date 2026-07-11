import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getMobileActionGridClass } from "../src/lib/mobile-action-layout.ts"

test("mobile action grid expands one to four visible actions across the available width", () => {
  assert.equal(getMobileActionGridClass(0), "grid-cols-1")
  assert.equal(getMobileActionGridClass(1), "grid-cols-1")
  assert.equal(getMobileActionGridClass(2), "grid-cols-2")
  assert.equal(getMobileActionGridClass(3), "grid-cols-3")
  assert.equal(getMobileActionGridClass(4), "grid-cols-4")
  assert.equal(getMobileActionGridClass(8), "grid-cols-4")
})

test("mobile action bar derives its grid from visible actions", () => {
  const source = readFileSync("src/components/ui/mobile-action-bar.tsx", "utf8")

  assert.match(source, /getMobileActionGridClass\(visibleActions\.length\)/)
  assert.doesNotMatch(source, /className="grid min-w-0 grid-cols-4 gap-2"/)
})
