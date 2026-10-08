import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  auditItemReconcileStatusValues,
  auditItemStatusValues,
  getAuditItemReconcileStatusLabelKey,
  getAuditItemStatusLabelKey,
} from "../src/lib/audit-item-status-labels.ts"

const th = JSON.parse(readFileSync("messages/th.json", "utf8")).auditFinding as Record<string, unknown>
const en = JSON.parse(readFileSync("messages/en.json", "utf8")).auditFinding as Record<string, unknown>

test("every audit item status maps to an auditFinding label in th and en", () => {
  assert.deepEqual([...auditItemStatusValues], ["pending", "scanned", "reviewed", "reconciled", "out_of_scope"])
  for (const status of auditItemStatusValues) {
    const key = getAuditItemStatusLabelKey(status)
    assert.equal(key, `itemStatus_${status}`)
    assert.equal(typeof th[key!], "string", `th missing auditFinding.${key}`)
    assert.equal(typeof en[key!], "string", `en missing auditFinding.${key}`)
  }
})

test("every reconcile status maps to an auditFinding label in th and en", () => {
  assert.deepEqual(
    [...auditItemReconcileStatusValues],
    ["pending", "pending_investigation", "approved", "rejected", "exception", "reconciled", "reviewed"],
  )
  for (const status of auditItemReconcileStatusValues) {
    const key = getAuditItemReconcileStatusLabelKey(status)
    assert.equal(key, `reconcileStatus_${status}`)
    assert.equal(typeof th[key!], "string", `th missing auditFinding.${key}`)
    assert.equal(typeof en[key!], "string", `en missing auditFinding.${key}`)
  }
})

test("unknown or empty codes map to null so the raw value stays visible", () => {
  assert.equal(getAuditItemStatusLabelKey("something_new"), null)
  assert.equal(getAuditItemStatusLabelKey(null), null)
  assert.equal(getAuditItemStatusLabelKey(""), null)
  assert.equal(getAuditItemReconcileStatusLabelKey("something_new"), null)
  assert.equal(getAuditItemReconcileStatusLabelKey(undefined), null)
  assert.equal(getAuditItemStatusLabelKey("toString"), null)
})

test("findings page labels item and reconcile statuses instead of printing codes", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/findings/page.tsx", "utf8")
  assert.doesNotMatch(page, /\{finding\.auditItem\.auditStatus\}/)
  assert.doesNotMatch(page, /\{finding\.auditItem\.reconcileStatus \?\? "-"\}/)
  assert.match(page, /getAuditItemStatusLabelKey\(status\)/)
  assert.match(page, /getAuditItemReconcileStatusLabelKey\(status\)/)
  assert.match(page, /\{formatAuditItemStatus\(finding\.auditItem\.auditStatus\)\}/)
  assert.match(page, /\{formatReconcileStatus\(finding\.auditItem\.reconcileStatus\)\}/)
})

test("employee page labels audit item status and result instead of printing codes", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx", "utf8")
  assert.doesNotMatch(page, /item\.auditResult \|\| item\.auditStatus/)
  assert.doesNotMatch(page, /: item\.auditStatus,/)
  assert.match(page, /getAuditItemStatusLabelKey\(/)
  assert.match(page, /getAuditRoundItemResultLabelKey\(/)
})

test("itemStatus_reviewed reads as plain checked in Thai (controller ruling)", () => {
  assert.equal(th.itemStatus_reviewed, "ตรวจแล้ว")
})

test("audit round page falls back to item status labels and labels out_of_scope results", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", "utf8")
  assert.match(page, /getAuditItemStatusLabelKey\(item\.auditStatus\)/)
  assert.doesNotMatch(page, /statusLabelKey \? t\(statusLabelKey\) : item\.auditStatus,/)
  assert.match(page, /getTranslations\("auditFinding"\)/)
})
