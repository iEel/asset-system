import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const emptyStateSource = readFileSync(new URL("../src/components/ui/action-empty-state.tsx", import.meta.url), "utf8")
const errorSource = readFileSync(new URL("../src/app/[locale]/(dashboard)/error.tsx", import.meta.url), "utf8")
const accessDeniedSource = readFileSync(new URL("../src/app/[locale]/(dashboard)/access-denied/page.tsx", import.meta.url), "utf8")

test("uses one shared action wrapper for empty, error, and permission states", () => {
  assert.match(emptyStateSource, /const actionNode = action \?\?/)
  assert.match(emptyStateSource, /<div className="mt-4">\{actionNode\}<\/div>/)
  assert.match(errorSource, /tone="error"/)
  assert.match(accessDeniedSource, /tone="permission"/)
})
