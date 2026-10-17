import assert from "node:assert/strict"
import test from "node:test"
import { exemptProblems, phase3Rows, type ExemptEntry, type ExemptList } from "./helpers/guard-exempt.ts"

// The shared EXEMPT check of the three guard files (spec 2D §5.1, §5.2, D1, D13): exact counts both ways, a why and a
// ruling on every row, kind "permanent" or "phase 3", owners apart from EXEMPT.
const row = (count: number, kind: ExemptEntry["kind"] = "permanent", why = "paper preview"): ExemptEntry => ({ count, kind, why, ruling: "2A §9.8 #6" })

test("exemptProblems passes when every counted file is an owner or an exact EXEMPT row", () => {
  assert.deepEqual(exemptProblems("R2", { "src/a.tsx": 2, "src/components/ui/b.tsx": 5, "src/zero.tsx": 0 }, { "src/a.tsx": row(2) }, ["src/components/ui/b.tsx"]), [])
  assert.deepEqual(exemptProblems("R2", {}, {}), [])
})

test("exemptProblems names a counted file that is neither an owner nor exempt", () => {
  assert.deepEqual(exemptProblems("R2", { "src/c.tsx": 1 }, {}), [
    "R2: src/c.tsx has 1, and it is not in EXEMPT (use the shared part; a site that must stay needs a row with its count, kind, why and ruling)",
  ])
})

test("exemptProblems holds every EXEMPT row to its exact live count, more or fewer", () => {
  const exempt = { "src/a.tsx": row(2), "src/b.tsx": row(3), "src/gone.tsx": row(1) }
  assert.deepEqual(exemptProblems("R2", { "src/a.tsx": 3, "src/b.tsx": 1 }, exempt), [
    "R2: src/a.tsx has 3, more than its EXEMPT count 2 (move the new site to the shared part)",
    "R2: src/b.tsx has 1, fewer than its EXEMPT count 3 (lower the row to 1)",
    "R2: src/gone.tsx has 0, fewer than its EXEMPT count 1 (delete the row)",
  ])
})

test("exemptProblems checks the row format: a count above 0, a known kind, a why and a ruling", () => {
  const bad = { "src/a.tsx": { count: 0, kind: "later", why: " ", ruling: "" } } as unknown as ExemptList
  assert.deepEqual(exemptProblems("R3", {}, bad), [
    "R3: src/a.tsx: count must be a whole number above 0, not 0",
    'R3: src/a.tsx: kind must be "permanent" or "phase 3", not "later"',
    "R3: src/a.tsx: why is empty",
    "R3: src/a.tsx: ruling is empty",
  ])
})

test("exemptProblems keeps owners out of EXEMPT", () => {
  const button = "src/components/ui/button.tsx"
  assert.deepEqual(exemptProblems("raw button", { [button]: 1 }, { [button]: row(1) }, [button]), [`raw button: ${button} is an owner, so it must not be in EXEMPT`])
})

test("phase3Rows lists the phase 3 rows of every rule, in order", () => {
  const lists = {
    R2: { "src/a.tsx": row(1), "src/bar.tsx": row(1, "phase 3", "bulk bar") },
    GL1: { "src/bar.tsx": row(2, "phase 3", "fixed bar") },
    R7: {},
  }
  assert.deepEqual(phase3Rows(lists), [
    { rule: "R2", file: "src/bar.tsx", count: 1, why: "bulk bar", ruling: "2A §9.8 #6" },
    { rule: "GL1", file: "src/bar.tsx", count: 2, why: "fixed bar", ruling: "2A §9.8 #6" },
  ])
  assert.deepEqual(phase3Rows({}), [])
})
