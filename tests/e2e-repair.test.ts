import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The E2E suite's repair and PM area (spec docs/superpowers/specs/2026-10-19-e2e-workflow-suite-design.md §6.3, §6.7;
// tasks ER1–ER4). One test per task, appended in order. The specs run with `npm run test:e2e` against a running app;
// these pin what can be checked without one: who walks, the run marker on every asset, the wrong entry first, the
// expected-to-fail findings, the Thai copy against messages/th.json, and the outcomes against the app's own rules.
// The working tree is CRLF on Windows: every read strips \r.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")
const th = JSON.parse(read("messages/th.json"))
const titles = (source: string) => [...source.matchAll(/^test\("([^"]+)"/gm)].map((match) => match[1])
// Every write a file sends: request.post/put/patch/delete and the URL it names.
const writes = (source: string) => [...source.matchAll(/request\.(post|put|patch|delete)\(\s*[`"]([^`"]+)[`"]/g)].map((match) => `${match[1]} ${match[2]}`)

test("repair records: an unfinished record sends an asset in use to Under Maintenance and repaired brings it back In Use, IT staff, a wrong entry first (e2e repair task 1, ER1)", async () => {
  const spec = read("e2e/repair/repair-record.spec.ts")
  const data = read("e2e/repair/repair-data.ts")
  // Spec §2: IT staff open and close repair records; the phone runs on Chromium (WebKit only for the audit walk and the
  // desk delivery, spec §8).
  assert.ok(spec.split("\n").includes(`asUser("itStaff")`))
  assert.ok(!spec.includes("runPhoneOnWebKit()"))
  assert.ok(titles(spec).some((title) => title.endsWith("(ER1)")), "the ER1 test")
  // Every asset carries the run id and the project (spec §5, §11 "Run order"); the arranging writes are the asset and
  // its handover, through the app; nothing touches the settings, LDAP or the import.
  assert.ok(data.includes("const tag = `${readRunState().runId}-${testInfo.project.name}-${suffix}`"))
  assert.deepEqual(writes(data), ["post /api/assets", "post /api/assets/${assetId}/checkout"])
  assert.deepEqual(writes(spec), [])
  for (const banned of ["/api/admin/settings", "ldap", "import-confirm", "import-preview"]) assert.ok(!`${spec}${data}`.toLowerCase().includes(banned), banned)
  // Spec §6.7: an empty required field, then a date pair reversed, each shown under its field.
  assert.ok(spec.includes(`await expect(page.locator("#repair-record-problem-error")).toHaveText("${th.common.validation.required}")`))
  assert.ok(spec.includes(`await expect(dialog.locator("#repair-complete-return-date-error")).toHaveText("${th.repairRecord.returnDateBeforeReported}")`))
  // The Thai copy the walk reads is the app's own (messages/th.json).
  for (const text of [th.repairRecord.createTitle, th.repairRecord.doneNo, th.repairRecord.complete, th.repairRecord.completeTitle, th.repairRecord.status.in_progress, th.repairRecord.status.closed, th.repairRecord.outcome.usable, th.repairRecord.assetStatusEffect.toMaintenance]) {
    assert.ok(spec.includes(text), text)
  }
  // The outcomes the test asserts are the app's rules (src/lib/repair-record-policy.ts): an asset in use with an active
  // handover goes Under Maintenance, and repaired brings it back In Use.
  const policy = await import("../src/lib/repair-record-policy.ts")
  const inUse = { statusName: "In Use", ownershipType: "personal", custodianId: "employee", hasActiveCheckout: true, hasOpenRecord: false }
  assert.equal(policy.getRepairRecordCreateEffect(inUse, { done: false, outcome: "usable" }).nextStatusName, "Under Maintenance")
  assert.equal(policy.getRepairRecordCompleteEffect({ ...inUse, statusName: "Under Maintenance" }, "usable").nextStatusName, "In Use")
  assert.ok(spec.includes(`toBe("Under Maintenance")`) && spec.includes(`expect(after.status.name, "repaired, with an active handover: In Use").toBe("In Use")`))
})
