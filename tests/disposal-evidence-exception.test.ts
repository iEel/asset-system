import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  canUseHistoricalDisposalEvidenceException,
  getDisposalExecutionEvidenceError,
} from "../src/lib/disposal-evidence-exception.ts"
import { disposalExecutionSchema } from "../src/lib/validations/disposal.ts"

const baseException = {
  roles: ["system_admin"],
  effectiveEvidenceCount: 0,
  useHistoricalEvidenceException: true,
  evidenceExceptionReason: "ทรัพย์สินถูกตัดจำหน่ายก่อนเริ่มใช้ระบบและไม่มีหลักฐานหลงเหลือ",
  evidenceExceptionAcknowledged: true,
}

test("restricts historical evidence exceptions to system administrators", () => {
  assert.equal(canUseHistoricalDisposalEvidenceException(["system_admin"]), true)
  assert.equal(canUseHistoricalDisposalEvidenceException(["asset_admin"]), false)
})

test("keeps normal execution blocked when effective evidence is missing", () => {
  assert.equal(getDisposalExecutionEvidenceError({
    roles: ["asset_admin"],
    effectiveEvidenceCount: 0,
    useHistoricalEvidenceException: false,
    evidenceExceptionReason: null,
    evidenceExceptionAcknowledged: false,
  }), "DISPOSAL_EVIDENCE_REQUIRED")
})

test("accepts a fully acknowledged system-admin historical exception", () => {
  assert.equal(getDisposalExecutionEvidenceError(baseException), null)
})

test("rejects forbidden, inapplicable, incomplete, and stray exceptions", () => {
  assert.equal(getDisposalExecutionEvidenceError({ ...baseException, roles: ["asset_admin"] }), "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN")
  assert.equal(getDisposalExecutionEvidenceError({ ...baseException, effectiveEvidenceCount: 1 }), "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE")
  assert.equal(getDisposalExecutionEvidenceError({ ...baseException, evidenceExceptionReason: "สั้นเกินไป" }), "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED")
  assert.equal(getDisposalExecutionEvidenceError({ ...baseException, evidenceExceptionAcknowledged: false }), "DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED")
  assert.equal(getDisposalExecutionEvidenceError({ ...baseException, useHistoricalEvidenceException: false }), "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE")
})

test("normalizes exception metadata before validating the schema", () => {
  const result = disposalExecutionSchema.safeParse({
    disposalType: "destroy",
    executionDate: "2026-07-13",
    executedById: "employee-executor",
    nextStatusId: "status-retired",
    actualSaleValue: null,
    actualSalvageValue: null,
    executionRemark: "Recorded incident detail",
    useHistoricalEvidenceException: true,
    evidenceExceptionReason: "   ",
    evidenceExceptionAcknowledged: false,
  })

  assert.equal(result.success, true)
  if (result.success) {
    assert.equal(result.data.useHistoricalEvidenceException, true)
    assert.equal(result.data.evidenceExceptionReason, null)
    assert.equal(result.data.evidenceExceptionAcknowledged, false)
  }
})

test("persists disposal evidence exception metadata with an idempotent migration", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8")
  const migration = readFileSync("prisma/manual-migrations/2026-07-13-add-disposal-evidence-exception.sql", "utf8")
  assert.match(schema, /evidenceExceptionReason\s+String\?\s+@db\.NVarChar\(Max\)/)
  assert.match(schema, /evidenceExceptionGrantedBy\s+String\?\s+@db\.NVarChar\(100\)/)
  assert.match(schema, /evidenceExceptionGrantedAt\s+DateTime\?/)
  for (const column of ["evidenceExceptionReason", "evidenceExceptionGrantedBy", "evidenceExceptionGrantedAt"]) {
    assert.match(migration, new RegExp(`COL_LENGTH\\('dbo\\.disposal_requests', '${column}'\\) IS NULL`, "i"))
  }
})

test("registers each historical evidence exception as a stable API error code", () => {
  const apiErrors = readFileSync("src/lib/disposal-api-errors.ts", "utf8")
  const errorMessages = readFileSync("src/lib/disposal-error-message.ts", "utf8")
  const exceptionCodes = [
    "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN",
    "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED",
    "DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED",
    "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE",
  ]

  for (const code of exceptionCodes) {
    assert.match(apiErrors, new RegExp(`"${code}"`))
    assert.match(errorMessages, new RegExp(`"${code}"`))
  }
})

test("registers the execution failure code with localized client messages", () => {
  const apiErrors = readFileSync("src/lib/disposal-api-errors.ts", "utf8")
  const errorMessages = readFileSync("src/lib/disposal-error-message.ts", "utf8")

  assert.match(apiErrors, /"DISPOSAL_EXECUTION_FAILED"/)
  assert.match(errorMessages, /"DISPOSAL_EXECUTION_FAILED"/)

  const thaiMessages = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const englishMessages = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(typeof thaiMessages.disposalPage.errors.DISPOSAL_EXECUTION_FAILED, "string")
  assert.equal(typeof englishMessages.disposalPage.errors.DISPOSAL_EXECUTION_FAILED, "string")
  assert.notEqual(thaiMessages.disposalPage.errors.DISPOSAL_EXECUTION_FAILED, "DISPOSAL_EXECUTION_FAILED")
  assert.notEqual(englishMessages.disposalPage.errors.DISPOSAL_EXECUTION_FAILED, "DISPOSAL_EXECUTION_FAILED")
})

test("passes evidence context and submits localized historical evidence exception fields", () => {
  const detailPage = readFileSync("src/app/[locale]/(dashboard)/disposal/[id]/page.tsx", "utf8")
  const executionButton = readFileSync("src/components/disposal/disposal-execution-button.tsx", "utf8")

  assert.match(detailPage, /effectiveEvidenceCount=\{attachments\.length \+ batchAttachments\.length\}/)
  assert.match(detailPage, /canUseHistoricalEvidenceException=\{user\.roles\.includes\("system_admin"\)\}/)
  assert.match(executionButton, /useHistoricalEvidenceException/)
  assert.match(executionButton, /evidenceExceptionReason/)
  assert.match(executionButton, /evidenceExceptionAcknowledged/)

  const thMessages = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const enMessages = JSON.parse(readFileSync("messages/en.json", "utf8"))
  for (const messages of [thMessages, enMessages]) {
    assert.equal(typeof messages.disposalPage.historicalEvidenceException, "string")
    assert.equal(typeof messages.disposalPage.historicalEvidenceReason, "string")
    assert.equal(typeof messages.disposalPage.historicalEvidenceAcknowledgement, "string")
    for (const code of [
      "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN",
      "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED",
      "DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED",
      "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE",
    ]) assert.equal(typeof messages.disposalPage.errors[code], "string")
  }
})
