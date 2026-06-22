import assert from "node:assert/strict"
import test from "node:test"

import {
  countSuccessfulAuditResultRows,
  isSuccessfulAuditResult,
  isVarianceAuditResult,
} from "../src/lib/audit-result-summary.ts"

test("confirmed-with-parent is a successful audit result", () => {
  assert.equal(isSuccessfulAuditResult("found"), true)
  assert.equal(isSuccessfulAuditResult("confirmed_with_parent"), true)
  assert.equal(isSuccessfulAuditResult("wrong_location"), false)
  assert.equal(isSuccessfulAuditResult("not_found"), false)
  assert.equal(isSuccessfulAuditResult(null), false)
})

test("successful audit result counts include confirmed-with-parent", () => {
  const rows = [
    { auditResult: "found", _count: { _all: 2 } },
    { auditResult: "confirmed_with_parent", _count: { _all: 3 } },
    { auditResult: "wrong_location", _count: { _all: 5 } },
    { auditResult: null, _count: { _all: 7 } },
  ]

  assert.equal(countSuccessfulAuditResultRows(rows), 5)
})

test("confirmed-with-parent is excluded from variance result counts", () => {
  assert.equal(isVarianceAuditResult("wrong_location"), true)
  assert.equal(isVarianceAuditResult("wrong_custodian"), true)
  assert.equal(isVarianceAuditResult("confirmed_with_parent"), false)
  assert.equal(isVarianceAuditResult("found"), false)
  assert.equal(isVarianceAuditResult("not_found"), false)
  assert.equal(isVarianceAuditResult("out_of_scope"), false)
  assert.equal(isVarianceAuditResult(null), false)
})
