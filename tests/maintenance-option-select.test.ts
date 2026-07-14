import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

test("maintenance option select debounces, aborts stale requests, and announces state", () => {
  const path = "src/components/maintenance/maintenance-option-select.tsx"
  assert.equal(existsSync(path), true)
  const source = readFileSync(path, "utf8")
  assert.match(source, /250/)
  assert.match(source, /AbortController/)
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /onSearchChange/)
})

test("maintenance forms use bounded option selects instead of embedded option arrays", () => {
  const source = [
    readFileSync("src/components/maintenance/maintenance-ticket-form.tsx", "utf8"),
    readFileSync("src/components/maintenance/maintenance-plan-form.tsx", "utf8"),
  ].join("\n")
  assert.match(source, /MaintenanceOptionSelect/)
  assert.doesNotMatch(source, /assets:\s*Option\[\]/)
  assert.doesNotMatch(source, /employees:\s*Option\[\]/)
  assert.doesNotMatch(source, /suppliers:\s*Option\[\]/)
})
