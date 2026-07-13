import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

import { deriveDisposalBatchStatus, prepareDisposalBatchPacket } from "../src/lib/disposal-batch.ts"

test("prepares a normalized disposal batch packet", () => {
  assert.deepEqual(
    prepareDisposalBatchPacket({
      assetIds: [" asset-1 ", "asset-2"],
      disposalType: " SELL ",
      reason: "  End of life equipment  ",
      requestedById: " employee-1 ",
    }),
    {
      assetIds: ["asset-1", "asset-2"],
      disposalType: "sell",
      reason: "End of life equipment",
      requestedById: "employee-1",
      approverId: null,
      saleValue: null,
      salvageValue: null,
    }
  )
})

test("requires between two and one hundred asset ids", () => {
  assert.throws(
    () =>
      prepareDisposalBatchPacket({
        assetIds: ["asset-1"],
        disposalType: "sell",
        reason: "End of life equipment",
        requestedById: "employee-1",
      }),
    /at least 2 asset ids/i
  )

  assert.throws(
    () =>
      prepareDisposalBatchPacket({
        assetIds: Array.from({ length: 101 }, (_, index) => `asset-${index + 1}`),
        disposalType: "sell",
        reason: "End of life equipment",
        requestedById: "employee-1",
      }),
    /up to 100 asset ids/i
  )
})

test("rejects duplicate asset ids after normalization", () => {
  assert.throws(
    () =>
      prepareDisposalBatchPacket({
        assetIds: ["asset-1", " ASSET-1 "],
        disposalType: "sell",
        reason: "End of life equipment",
        requestedById: "employee-1",
      }),
    /unique/i
  )
})

test("rejects blank asset ids", () => {
  assert.throws(
    () =>
      prepareDisposalBatchPacket({
        assetIds: ["asset-1", "  "],
        disposalType: "sell",
        reason: "End of life equipment",
        requestedById: "employee-1",
      }),
    /asset id/i
  )
})

test("requires a supported disposal type and shared metadata", () => {
  const validInput = {
    assetIds: ["asset-1", "asset-2"],
    disposalType: "sell",
    reason: "End of life equipment",
    requestedById: "employee-1",
  }

  assert.throws(() => prepareDisposalBatchPacket({ ...validInput, disposalType: "transfer" }), /supported disposal type/i)
  assert.throws(() => prepareDisposalBatchPacket({ ...validInput, reason: "   " }), /reason/i)
  assert.throws(() => prepareDisposalBatchPacket({ ...validInput, reason: "too short" }), /12 characters/i)
  assert.throws(() => prepareDisposalBatchPacket({ ...validInput, requestedById: "   " }), /requester/i)
})

test("normalizes an optional shared approver", () => {
  const packet = prepareDisposalBatchPacket({
    assetIds: ["asset-1", "asset-2"],
    disposalType: "dispose",
    reason: "End of life equipment",
    requestedById: "employee-1",
    approverId: " employee-2 ",
  })

  assert.equal(packet.approverId, "employee-2")
})

test("normalizes optional shared financial values", () => {
  const packet = prepareDisposalBatchPacket({
    assetIds: ["asset-1", "asset-2"],
    disposalType: "sell",
    reason: "End of life equipment",
    requestedById: "employee-1",
    saleValue: "1200.50",
    salvageValue: 100,
  })
  assert.equal(packet.saleValue, 1200.5)
  assert.equal(packet.salvageValue, 100)
  assert.throws(() => prepareDisposalBatchPacket({ ...packet, saleValue: -1 }), /non-negative/i)
})

test("derives the batch status from child request progress", () => {
  assert.equal(deriveDisposalBatchStatus(["pending", "approved"]), "pending")
  assert.equal(deriveDisposalBatchStatus(["approved", "disposed"]), "approved")
  assert.equal(deriveDisposalBatchStatus(["disposed", "disposed"]), "disposed")
  assert.equal(deriveDisposalBatchStatus(["rejected", "rejected"]), "rejected")
  assert.equal(deriveDisposalBatchStatus(["disposed", "rejected"]), "partial")
})

function modelBlock(source: string, modelName: string) {
  const match = source.match(new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`))
  assert.ok(match, `Missing model ${modelName}`)
  return match[0]
}

test("schema models an auditable disposal batch and optional child batch relation", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8")
  const batch = modelBlock(schema, "DisposalBatch")
  const request = modelBlock(schema, "DisposalRequest")

  assert.match(batch, /batchNo\s+String\s+@unique\s+@db\.NVarChar\(50\)/)
  assert.match(batch, /disposalType\s+String\s+@db\.NVarChar\(30\)/)
  assert.match(batch, /reason\s+String\s+@db\.NVarChar\(Max\)/)
  assert.match(batch, /requestedById\s+String/)
  assert.match(batch, /requestedBy\s+Employee\s+@relation\("DisposalBatchRequestedBy"/)
  assert.match(batch, /approverId\s+String\?/)
  assert.match(batch, /approver\s+Employee\?\s+@relation\("DisposalBatchApprover"/)
  assert.match(batch, /saleValue\s+Decimal\?\s+@db\.Decimal\(18, 2\)/)
  assert.match(batch, /salvageValue\s+Decimal\?\s+@db\.Decimal\(18, 2\)/)
  assert.match(batch, /requestDate\s+DateTime\s+@default\(now\(\)\)/)
  assert.match(batch, /batchStatus\s+String\s+@default\("pending"\)\s+@db\.NVarChar\(30\)/)
  assert.match(batch, /createdBy\s+String\s+@db\.NVarChar\(100\)/)
  assert.match(batch, /updatedBy\s+String\?\s+@db\.NVarChar\(100\)/)
  assert.match(batch, /createdAt\s+DateTime\s+@default\(now\(\)\)/)
  assert.match(batch, /updatedAt\s+DateTime\s+@updatedAt/)
  assert.match(batch, /isActive\s+Boolean\s+@default\(true\)/)
  assert.match(batch, /disposalRequests\s+DisposalRequest\[\]/)
  assert.match(batch, /@@index\(\[isActive, batchStatus, requestDate\], map: "IX_disposal_batches_isActive_batchStatus_requestDate"\)/)

  assert.match(request, /batchId\s+String\?/)
  assert.match(request, /batch\s+DisposalBatch\?\s+@relation\(fields: \[batchId\], references: \[id\], onDelete: NoAction, onUpdate: NoAction\)/)
  assert.match(request, /@@index\(\[batchId\], map: "IX_disposal_requests_batchId"\)/)
})

test("manual migration creates disposal batches and nullable request batch ids idempotently", () => {
  const migrationPath = "prisma/manual-migrations/2026-07-13-add-disposal-batches.sql"
  assert.equal(existsSync(migrationPath), true, `${migrationPath} should exist`)

  const migration = readFileSync(migrationPath, "utf8")
  assert.match(migration, /IF\s+NOT\s+EXISTS[\s\S]*CREATE\s+TABLE\s+\[dbo\]\.\[disposal_batches\]/i)
  assert.match(migration, /\[batchNo\]\s+NVARCHAR\(50\)\s+NOT\s+NULL/i)
  assert.match(migration, /\[disposalType\]\s+NVARCHAR\(30\)\s+NOT\s+NULL/i)
  assert.match(migration, /\[reason\]\s+NVARCHAR\(MAX\)\s+NOT\s+NULL/i)
  assert.match(migration, /COL_LENGTH\('dbo\.disposal_requests', 'batchId'\)\s+IS\s+NULL/i)
  assert.match(migration, /ALTER\s+TABLE\s+\[dbo\]\.\[disposal_requests\]\s+ADD\s+\[batchId\]\s+NVARCHAR\(1000\)\s+NULL/i)
  assert.match(migration, /FOREIGN\s+KEY\s+\(\[requestedById\]\)\s+REFERENCES\s+\[dbo\]\.\[employees\]\s*\(\[id\]\)/i)
  assert.match(migration, /FOREIGN\s+KEY\s+\(\[approverId\]\)\s+REFERENCES\s+\[dbo\]\.\[employees\]\s*\(\[id\]\)/i)
  assert.match(migration, /FOREIGN\s+KEY\s+\(\[batchId\]\)\s+REFERENCES\s+\[dbo\]\.\[disposal_batches\]\s*\(\[id\]\)/i)

  for (const indexName of [
    "UX_disposal_batches_batchNo",
    "IX_disposal_batches_isActive_batchStatus_requestDate",
    "IX_disposal_batches_requestedById",
    "IX_disposal_batches_approverId",
    "IX_disposal_requests_batchId",
  ]) {
    assert.match(migration, new RegExp(`IF\\s+NOT\\s+EXISTS[\\s\\S]*name\\s*=\\s*N'${indexName}'`, "i"))
    assert.match(migration, new RegExp(`CREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+\\[${indexName}\\]`, "i"))
  }
})

test("batch creation uploads shared evidence once and opens the created batch workspace", () => {
  const form = readFileSync("src/components/disposal/disposal-batch-form.tsx", "utf8")

  assert.match(form, /\/api\/disposal-batches\/\$\{payload\.batch\.id\}\/attachments/)
  assert.doesNotMatch(form, /for \(const child of payload\.requests/)
  assert.match(form, /router\.push\(`\/\$\{locale\}\/disposal\/batches\/\$\{payload\.batch\.id\}`\)/)
})

test("batch detail owns shared evidence and exposes every child request", () => {
  const pagePath = "src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx"
  const attachmentRoutePath = "src/app/api/disposal-batches/[id]/attachments/route.ts"
  assert.equal(existsSync(pagePath), true)
  assert.equal(existsSync(attachmentRoutePath), true)

  const page = readFileSync(pagePath, "utf8")
  const attachmentRoute = readFileSync(attachmentRoutePath, "utf8")
  const attachmentDownload = readFileSync("src/app/api/attachments/[id]/route.ts", "utf8")

  assert.match(page, /module: "disposal_batch"/)
  assert.match(page, /disposalRequests/)
  assert.match(page, /DisposalAttachments/)
  assert.match(attachmentRoute, /module: "disposal_batch"/)
  assert.match(attachmentRoute, /referenceId: batch\.id/)
  assert.match(attachmentDownload, /module === "disposal_batch"/)
})
