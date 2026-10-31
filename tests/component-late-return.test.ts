import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import { componentLateReturnOutcomes, getLateReturnDateError, getLateReturnOutcome } from "../src/lib/component-late-return.ts"

const stock = { isActive: true, statusName: "Ready", custodianId: null, hasOpenCheckout: false, hasOpenRepair: false }

test("a late return re-attaches only to a parent in IT stock: active, พร้อมใช้งาน, no holder, no open handover, no open repair (group 3 spec §8.6, P2-R17)", () => {
  assert.equal(getLateReturnOutcome(stock), "reattached")
  assert.equal(getLateReturnOutcome({ ...stock, statusName: " ready " }), "reattached")
  for (const [why, parent] of [
    ["inactive", { ...stock, isActive: false }], ["In Use", { ...stock, statusName: "In Use" }], ["Checked Out", { ...stock, statusName: "Checked Out" }],
    ["Under Maintenance", { ...stock, statusName: "Under Maintenance" }], ["Disposed", { ...stock, statusName: "Disposed" }],
    ["a holder", { ...stock, custodianId: "emp-1" }], ["an open handover", { ...stock, hasOpenCheckout: true }], ["an open repair", { ...stock, hasOpenRepair: true }],
  ] as const) assert.equal(getLateReturnOutcome(parent), "standalone", why)
})

test("the rule stays pure: relative .ts imports, no database", () => {
  const source = readFileSync("src/lib/component-late-return.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|@prisma\/client|\bprisma\./)
  for (const [, path] of source.matchAll(/from "([^"]+)"/g)) assert.match(path, /^\.\/[\w-]+\.ts$/, path)
})

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (/\.tsx?$/.test(entry.name)) out.push(path.replaceAll("\\", "/"))
  }
  return out
}

test("a late return has two outcomes, re-attached and standing alone, in that order (spec §8.6, P2-R3)", () => {
  assert.deepEqual([...componentLateReturnOutcomes], ["reattached", "standalone"])
})

test("a late return is dated no later than today and no earlier than its RT-'s return day, in Bangkok days (P2-R13)", () => {
  const error = (returnDay: string) => getLateReturnDateError({ returnDay, todayDay: "2026-10-31", checkinDay: "2026-10-20" })
  assert.deepEqual(["2026-10-20", "2026-10-31", "2026-11-01", "2026-10-19"].map(error), [null, null, "CHECKIN_RETURN_DATE_IN_FUTURE", "COMPONENT_RETURN_DATE_BEFORE_CHECKIN"])
})

test("every parentInStock the app sets is the IT-stock rule, so the panel and the save agree (P2-R4, P2-R17)", () => {
  // Matches `parentInStock: <value>` and `parentInStock = <value>`; skips the type (`: boolean`, `?: boolean`), comparisons (`==`) and a JSX prop (`={`).
  const assignments = walk("src").flatMap((path) =>
    [...readFileSync(path, "utf8").matchAll(/\bparentInStock\s*(?::|=(?![={]))\s*(?!\s|boolean\b)([^\n]+)/g)].map((match) => ({ path, value: match[1] })))
  assert.ok(assignments.length > 0, "Task 4 sets parentInStock")
  for (const { path, value } of assignments) assert.match(value, /getLateReturnOutcome\(/, path)
})
