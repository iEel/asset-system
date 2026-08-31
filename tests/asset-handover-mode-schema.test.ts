import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const schema = readFileSync("prisma/schema.prisma", "utf8")
const migrationPath = "prisma/manual-migrations/2026-08-31-add-checkout-handover-mode.sql"

test("AssetCheckout stores nullable handover mode for legacy history", () => {
  const body = schema.match(/model AssetCheckout \{([\s\S]*?)\n\}/)?.[1] ?? ""
  assert.match(body, /handoverMode\s+String\?\s+@db\.NVarChar\(30\)/)
})

test("migration guards the exact approved active assignments", () => {
  const sql = readFileSync(migrationPath, "utf8")
  assert.match(sql, /GRL-COM-06-0001/)
  assert.match(sql, /HO-202606-0002/)
  assert.match(sql, /SNI-EQU-19-0336/)
  assert.match(sql, /HO-202608-0003/)
  assert.match(sql, /THROW/)
  assert.match(sql, /XACT_ABORT ON/)
  assert.match(sql, /permanent_assignment/)
  assert.match(sql, /temporary_loan/)
  assert.match(sql, /asset_movements/)
  assert.match(sql, /system_logs/)
  assert.match(sql, /afterSnapshotJson/)
  assert.doesNotMatch(sql, /UPDATE[\s\S]+WHERE \[expectedReturnDate\] IS NULL[\s\S]+COMMIT/i)
})
