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

test("maintenance option select reads by id only when the value's option is not known yet (G5P2-R1, group 5 spec call 7)", () => {
  const source = readFileSync("src/components/maintenance/maintenance-option-select.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.ok(source.includes("const knownValue = Boolean(value) && (initialOption?.id === value || options.some((option) => option.id === value))"))
  assert.ok(source.includes("if (query.trim().length < 2 && (!value || knownValue)) return"))
})

test("a choice clears the select's search, so nothing is read after it (group 5 plan 2, spec call 7)", () => {
  const source = readFileSync("src/components/maintenance/maintenance-option-select.tsx", "utf8").replace(/\r\n/g, "\n")
  // The choice handler empties the outer query before the caller's onChange; with the query empty and the chosen
  // option known (it is in options), the effect returns before any read: no re-search with q, no read by id.
  assert.match(source, /onChange=\{\(next\) => \{\n(?:\s+\/\/[^\n]*\n)*\s+setQuery\(""\)\n\s+onChange\(next, /)
  assert.equal(source.match(/setQuery\(""\)/g)?.length, 1)
})

test("maintenance forms use bounded option selects instead of embedded option arrays", () => {
  const source = [
    readFileSync("src/components/maintenance/repair-record-form.tsx", "utf8"),
    readFileSync("src/components/maintenance/maintenance-plan-form.tsx", "utf8"),
  ].join("\n")
  assert.match(source, /MaintenanceOptionSelect/)
  assert.doesNotMatch(source, /assets:\s*Option\[\]/)
  assert.doesNotMatch(source, /employees:\s*Option\[\]/)
  assert.doesNotMatch(source, /suppliers:\s*Option\[\]/)
})
