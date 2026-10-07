import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const scanFiles = ["src/components/audit/audit-scan-workspace.tsx", "src/components/audit/audit-scan-check-form.tsx"]

test("the scan screen separates in-round, out-of-scope, candidate and unknown lookups", () => {
  const types = read("src/components/audit/audit-scan-types.ts")
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")

  assert.match(types, /status: "in_round"/)
  assert.match(types, /status: "out_of_scope"/)
  assert.match(types, /status: "candidates"/)
  assert.match(types, /status: "unknown_asset"/)
  assert.match(workspace, /setLookup\(\{ status: "out_of_scope", asset: payload\.asset \}\)/)
  assert.match(workspace, /setLookup\(\{ status: "unknown" \}\)/)
  assert.doesNotMatch(workspace, /status: "not_in_round"/)
})

test("the scan screen has no not-found marking; the pending page owns it", () => {
  const pendingPage = read("src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx")

  for (const path of scanFiles) {
    const source = read(path)
    assert.doesNotMatch(source, /AuditMarkNotFoundButton/, path)
    assert.doesNotMatch(source, /markNotFound/, path)
  }
  assert.match(pendingPage, /AuditMarkNotFoundButton/)
})

test("the single save button uses field-audit wording instead of not-found language", () => {
  const form = read("src/components/audit/audit-scan-check-form.tsx")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).auditScan
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).auditScan

  assert.match(form, /t\("saveAllMatch"\)/)
  assert.match(form, /t\("saveMismatch", \{ count: diff\.length, fields \}\)/)

  assert.match(th.saveAllMatch, /บันทึก/)
  assert.match(th.saveAllMatch, /ตรง/)
  assert.match(th.saveMismatch, /ไม่ตรง/)
  assert.match(en.saveAllMatch, /Save/)
  assert.match(en.saveAllMatch, /match/i)
  assert.match(en.saveMismatch, /mismatch/i)
  for (const copy of [th, en]) {
    assert.doesNotMatch(copy.saveAllMatch, /not.found|ไม่พบ/i)
    assert.doesNotMatch(copy.saveMismatch, /not.found|ไม่พบ/i)
    assert.match(copy.lookupOutOfScope, /\S/)
    assert.match(copy.lookupUnknown, /\S/)
  }
})
