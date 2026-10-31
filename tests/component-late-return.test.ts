import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { getLateReturnOutcome } from "../src/lib/component-late-return.ts"

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
