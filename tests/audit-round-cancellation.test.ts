import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

import {
  auditRoundOperationalWhere,
  auditRoundReadOnlyStatuses,
  isAuditRoundOperationalStatus,
  isAuditRoundReadOnlyStatus,
} from "../src/lib/audit-round-status.ts"

test("audit round cancellation status is first-class but read-only", () => {
  assert.equal(isAuditRoundOperationalStatus("open"), true)
  assert.equal(isAuditRoundOperationalStatus("draft"), true)
  assert.equal(isAuditRoundOperationalStatus("closed"), false)
  assert.equal(isAuditRoundOperationalStatus("cancelled"), false)
  assert.equal(isAuditRoundReadOnlyStatus("closed"), true)
  assert.equal(isAuditRoundReadOnlyStatus("cancelled"), true)
  assert.deepEqual(auditRoundReadOnlyStatuses, ["closed", "cancelled"])
  assert.deepEqual(auditRoundOperationalWhere, { notIn: ["closed", "cancelled"] })
})

test("audit validation accepts cancelled status and requires cancel reason", () => {
  const source = readFileSync("src/lib/validations/audit.ts", "utf8")

  assert.match(source, /const auditStatuses = \["draft", "open", "closed", "cancelled"\] as const/)
  assert.match(source, /export const auditRoundCancelSchema = z\.object/)
  assert.match(source, /reason: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(4000\)/)
  assert.match(source, /export type AuditRoundCancelInput = z\.infer<typeof auditRoundCancelSchema>/)
})

test("audit round cancellation metadata is represented in Prisma schema and migration", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8")
  const migrationPath = "prisma/manual-migrations/2026-06-26-add-audit-round-cancellation.sql"

  assert.equal(existsSync(migrationPath), true, "missing manual migration")

  const migration = readFileSync(migrationPath, "utf8")
  assert.match(schema, /cancelledAt\s+DateTime\?/)
  assert.match(schema, /cancelledBy\s+String\?\s+@db\.NVarChar\(100\)/)
  assert.match(schema, /cancelReason\s+String\?\s+@db\.NVarChar\(Max\)/)
  assert.match(migration, /IF\s+COL_LENGTH\('dbo\.audit_rounds',\s*'cancelledAt'\)\s+IS\s+NULL/i)
  assert.match(migration, /ALTER\s+TABLE\s+\[dbo\]\.\[audit_rounds\]\s+ADD\s+\[cancelledAt\]\s+DATETIME2\s+NULL/i)
  assert.match(migration, /cancelReason\]\s+NVARCHAR\(MAX\)\s+NULL/i)
})



test("audit round patch route supports cancel with required reason and no item rollback", () => {
  const route = readFileSync("src/app/api/audit-rounds/[id]/route.ts", "utf8")

  assert.match(route, /auditRoundCancelSchema/)
  assert.match(route, /action === "cancel"/)
  assert.match(route, /status:\s*"cancelled"/)
  assert.match(route, /cancelledAt:/)
  assert.match(route, /cancelledBy:\s*user\.id/)
  assert.match(route, /cancelReason:\s*input\.reason/)
  assert.match(route, /getCancellationImpact/)
  assert.match(route, /action:\s*"cancel"/)
  assert.doesNotMatch(route, /auditItem\.deleteMany/)
  assert.doesNotMatch(route, /auditFinding\.deleteMany/)
  assert.doesNotMatch(route, /assetMovement\.deleteMany/)
})

test("audit mutation routes reject cancelled rounds as read-only", () => {
  const guardedRoutes = [
    "src/app/api/audit-rounds/[id]/route.ts",
    "src/app/api/audit-rounds/[id]/scan/route.ts",
    "src/app/api/audit-rounds/[id]/scan-lookup/route.ts",
    "src/app/api/audit-items/[id]/mark-not-found/route.ts",
    "src/app/api/audit-findings/[id]/review/route.ts",
    "src/app/api/audit-rounds/[id]/export/route.ts",
    "src/app/api/audit-rounds/[id]/export-pdf/route.ts",
    "src/app/api/audit-rounds/[id]/variance-export/route.ts",
  ]

  for (const filePath of guardedRoutes) {
    const source = readFileSync(filePath, "utf8")
    assert.match(
      source,
      /getAuditRoundReadOnlyError|isAuditRoundReadOnlyStatus|status:\s*\{\s*notIn:\s*\[\s*"closed",\s*"cancelled"\s*\]|status === "cancelled"|round\.status === "cancelled"/,
      `${filePath} should guard cancelled rounds`,
    )
  }
})


test("audit rounds UI exposes cancellation and cancelled read-only state", () => {
  const detail = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", "utf8")
  const list = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/page.tsx", "utf8")
  const cancelButton = readFileSync("src/components/audit/audit-round-cancel-button.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(detail, /AuditRoundCancelButton/)
  assert.match(detail, /isAuditRoundReadOnlyStatus\(round\.status\)/)
  assert.match(detail, /cancelReason/)
  assert.match(detail, /cancelledAt/)
  assert.match(detail, /cancelledReadOnlyNotice/)
  assert.match(detail, /!isRoundReadOnly/)
  assert.match(list, /"cancelled"/)
  assert.match(list, /viewCancelled/)
  assert.match(list, /isAuditRoundOperationalStatus/)
  assert.match(cancelButton, /role="dialog"/)
  assert.match(cancelButton, /JSON\.stringify\(\{ action: "cancel", reason:/)
  assert.match(cancelButton, /impact\.processedItems/)
  assert.match(cancelButton, /impact\.approvedFindings/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditRound.statusCancelled, "string")
    assert.equal(typeof messages.auditRound.viewCancelled, "string")
    assert.equal(typeof messages.auditRound.cancelRound, "string")
    assert.equal(typeof messages.auditRound.cancelReason, "string")
    assert.equal(typeof messages.auditRound.cancelImpactProcessed, "string")
    assert.equal(typeof messages.auditRound.cancelledReadOnlyNotice, "string")
  }
})

test("operational audit queues exclude cancelled rounds by default", () => {
  const files = [
    "src/app/[locale]/(dashboard)/audit/rounds/page.tsx",
    "src/lib/audit-finding-filters.ts",
    "src/lib/approval-inbox-query.ts",
    "src/lib/notification-summary.ts",
    "src/app/[locale]/(dashboard)/work-center/page.tsx",
    "src/app/[locale]/(dashboard)/dashboard/page.tsx",
  ]

  for (const filePath of files) {
    const source = readFileSync(filePath, "utf8")
    assert.match(
      source,
      /auditRoundOperationalWhere|isAuditRoundOperationalStatus|notIn:\s*\[\s*"closed",\s*"cancelled"\s*\]/,
      `${filePath} should exclude cancelled operational audit work`,
    )
  }
})

test("audit cancellation workflow is documented in handoff docs", () => {
  const files = [
    "DEVELOPER_HANDOFF.md",
    "docs/06_WORKFLOWS.md",
    "docs/07_UAT_CHECKLIST.md",
    "docs/99_CHANGELOG.md",
    "docs/11_FEATURE_LIST.md",
  ]
  for (const filePath of files) {
    const source = readFileSync(filePath, "utf8")
    assert.match(source, /cancelled|ยกเลิก|cancellation/i, `${filePath} should mention audit round cancellation`)
    assert.match(source, /preserve|ไม่ rollback|ไม่ย้อนกลับ|historical/i, `${filePath} should document that prior audit work is preserved`)
  }
})
